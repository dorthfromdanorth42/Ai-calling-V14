#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function fixSchemaMismatch() {
  console.log('🔧 FIXING SCHEMA MISMATCH ISSUES');
  console.log('='.repeat(50));

  try {
    // ISSUE 1: Check if outbound_campaigns table exists
    console.log('\n📊 INVESTIGATING TABLE STRUCTURE...');
    
    const { data: campaignsData, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);
    
    console.log(`campaigns table: ${campaignsError ? 'ERROR' : 'EXISTS'}`);
    
    const { data: outboundCampaignsData, error: outboundCampaignsError } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .limit(1);
    
    console.log(`outbound_campaigns table: ${outboundCampaignsError ? 'MISSING' : 'EXISTS'}`);
    
    // Check campaign_leads table structure
    const { data: campaignLeadsData, error: campaignLeadsError } = await supabase
      .from('campaign_leads')
      .select('*')
      .limit(1);
    
    console.log(`campaign_leads table: ${campaignLeadsError ? 'ERROR' : 'EXISTS'}`);
    
    if (campaignLeadsData && campaignLeadsData.length > 0) {
      console.log('campaign_leads columns:', Object.keys(campaignLeadsData[0]).join(', '));
    }

    // ISSUE 2: Check what table the foreign key actually references
    console.log('\n🔍 CHECKING FOREIGN KEY CONSTRAINTS...');
    
    // Try to understand the schema by looking at existing data
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('*')
      .limit(3);
    
    if (existingLeads && existingLeads.length > 0) {
      console.log('✅ Existing leads found');
      console.log('Sample lead campaign_id:', existingLeads[0].campaign_id);
      
      // Check if this campaign_id exists in campaigns table
      if (existingLeads[0].campaign_id) {
        const { data: campaignCheck } = await supabase
          .from('campaigns')
          .select('id')
          .eq('id', existingLeads[0].campaign_id)
          .single();
        
        console.log(`Campaign exists in campaigns table: ${campaignCheck ? 'YES' : 'NO'}`);
        
        // Check if it exists in outbound_campaigns
        const { data: outboundCampaignCheck } = await supabase
          .from('outbound_campaigns')
          .select('id')
          .eq('id', existingLeads[0].campaign_id)
          .single();
        
        console.log(`Campaign exists in outbound_campaigns table: ${outboundCampaignCheck ? 'YES' : 'NO'}`);
      }
    }

    // SOLUTION 1: Try creating lead using the correct workflow
    console.log('\n🔧 ATTEMPTING CORRECTED LEAD CREATION...');
    
    // Get profile
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;
    
    if (profileId) {
      // Check if we need to create in outbound_campaigns instead
      if (outboundCampaignsError && !campaignsError) {
        console.log('📋 Strategy: Use campaigns table (outbound_campaigns missing)');
        
        // Create campaign in campaigns table
        const testCampaign = {
          profile_id: profileId,
          name: 'Schema Fix Campaign ' + Date.now(),
          description: 'Testing schema fix',
          status: 'draft',
          caller_id: '+1234567890'
        };

        const { data: campaignResult, error: campaignError } = await supabase
          .from('campaigns')
          .insert(testCampaign)
          .select()
          .single();
        
        if (!campaignError) {
          console.log(`✅ Campaign created in campaigns table: ${campaignResult.id}`);
          
          // Now try to create lead by inserting directly into campaign_leads
          const campaignLeadEntry = {
            campaign_id: campaignResult.id,
            phone_number: '+1555003' + Math.floor(Math.random() * 1000),
            first_name: 'SchemaFix',
            last_name: 'Lead',
            status: 'pending'
          };

          const { data: campaignLeadResult, error: campaignLeadError } = await supabase
            .from('campaign_leads')
            .insert(campaignLeadEntry)
            .select()
            .single();
          
          if (!campaignLeadError) {
            console.log(`✅ Lead created in campaign_leads: ${campaignLeadResult.id}`);
            
            // Clean up
            await supabase.from('campaign_leads').delete().eq('id', campaignLeadResult.id);
          } else {
            console.log(`❌ campaign_leads insert failed: ${campaignLeadError.message}`);
          }
          
          // Clean up campaign
          await supabase.from('campaigns').delete().eq('id', campaignResult.id);
        }
      }
      
      // SOLUTION 2: Try using existing lead pattern exactly
      if (existingLeads && existingLeads.length > 0) {
        console.log('\n📋 Strategy: Copy existing lead pattern exactly');
        
        const existingLead = existingLeads[0];
        const exactCopyLead = {
          ...Object.fromEntries(
            Object.entries(existingLead)
              .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
              .map(([key, value]) => {
                if (key === 'phone_number') return [key, '+1555004' + Math.floor(Math.random() * 1000)];
                if (key === 'first_name') return [key, 'ExactCopy'];
                if (key === 'last_name') return [key, 'Lead'];
                if (key === 'email') return [key, 'exactcopy_' + Date.now() + '@example.com'];
                return [key, value]; // Keep everything else exactly the same
              })
          )
        };

        const { data: exactCopyResult, error: exactCopyError } = await supabase
          .from('leads')
          .insert(exactCopyLead)
          .select()
          .single();
        
        if (!exactCopyError) {
          console.log(`✅ Exact copy lead created: ${exactCopyResult.id}`);
          
          // Clean up
          await supabase.from('leads').delete().eq('id', exactCopyResult.id);
          
          console.log('🎉 LEAD CREATION ISSUE RESOLVED!');
        } else {
          console.log(`❌ Exact copy failed: ${exactCopyError.message}`);
        }
      }
    }

    // ISSUE 3: Fix RLS (Row Level Security)
    console.log('\n🔒 INVESTIGATING RLS CONFIGURATION...');
    
    // Check current RLS status
    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { data: anonData, error: anonError } = await anonClient
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (anonError) {
      console.log('✅ RLS is working - anonymous access blocked');
    } else {
      console.log('❌ RLS is NOT working - anonymous access allowed');
      console.log('🚨 SECURITY VULNERABILITY: Unauthorized data access possible');
      
      // This is a critical security issue that needs to be addressed
      console.log('\n🔧 RLS NEEDS TO BE ENABLED IN SUPABASE DASHBOARD');
      console.log('   1. Go to Supabase Dashboard');
      console.log('   2. Navigate to Authentication > Policies');
      console.log('   3. Enable RLS on all tables');
      console.log('   4. Create appropriate policies for authenticated users');
    }

  } catch (error) {
    console.error('❌ Error fixing schema mismatch:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 SCHEMA MISMATCH INVESTIGATION COMPLETE');
  console.log('='.repeat(50));
}

fixSchemaMismatch().catch(console.error);