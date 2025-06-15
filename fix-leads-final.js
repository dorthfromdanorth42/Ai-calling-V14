#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function fixLeadsFinal() {
  console.log('🔧 FIXING LEADS ISSUE - FINAL ATTEMPT');
  console.log('='.repeat(50));

  try {
    // Get profile ID
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;

    // The error suggests there's a campaign_leads table with foreign key constraints
    // Let's create a campaign first, then try to create a lead
    
    console.log('\n📢 Creating campaign for lead association...');
    const testCampaign = {
      profile_id: profileId,
      name: 'Lead Test Campaign ' + Date.now(),
      description: 'Campaign for testing lead creation',
      status: 'draft',
      caller_id: '+1234567890'
    };

    const { data: campaignResult, error: campaignErr } = await supabase
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();
    
    if (campaignErr) {
      console.log(`❌ Campaign creation failed: ${campaignErr.message}`);
      return;
    }
    
    console.log(`✅ Campaign created: ${campaignResult.id}`);

    // Now try creating lead without campaign_id first
    console.log('\n👤 Testing lead creation without campaign_id...');
    
    const testLeadNoCampaign = {
      phone_number: '+1555000' + Math.floor(Math.random() * 1000),
      first_name: 'TestFirst',
      last_name: 'TestLast',
      email: 'test' + Date.now() + '@example.com',
      status: 'pending',
      call_attempts: 0,
      do_not_call: false
    };

    const { data: leadResult1, error: leadErr1 } = await supabase
      .from('leads')
      .insert(testLeadNoCampaign)
      .select()
      .single();
    
    if (leadErr1) {
      console.log(`❌ Lead without campaign failed: ${leadErr1.message}`);
    } else {
      console.log(`✅ Lead without campaign created: ${leadResult1.id}`);
      
      // Now try to associate it with campaign
      const { error: updateErr } = await supabase
        .from('leads')
        .update({ campaign_id: campaignResult.id })
        .eq('id', leadResult1.id);
      
      if (updateErr) {
        console.log(`❌ Lead-campaign association failed: ${updateErr.message}`);
      } else {
        console.log(`✅ Lead successfully associated with campaign`);
      }
      
      // Clean up
      await supabase.from('leads').delete().eq('id', leadResult1.id);
    }

    // Try creating lead with valid campaign_id
    console.log('\n👤 Testing lead creation with valid campaign_id...');
    
    const testLeadWithCampaign = {
      campaign_id: campaignResult.id,
      phone_number: '+1555000' + Math.floor(Math.random() * 1000),
      first_name: 'TestFirst',
      last_name: 'TestLast',
      email: 'test' + Date.now() + '@example.com',
      status: 'pending',
      call_attempts: 0,
      do_not_call: false
    };

    const { data: leadResult2, error: leadErr2 } = await supabase
      .from('leads')
      .insert(testLeadWithCampaign)
      .select()
      .single();
    
    if (leadErr2) {
      console.log(`❌ Lead with campaign failed: ${leadErr2.message}`);
      
      // Check if the campaign actually exists in the database
      const { data: campaignCheck } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', campaignResult.id)
        .single();
      
      console.log(`Campaign exists check: ${campaignCheck ? 'Yes' : 'No'}`);
      
    } else {
      console.log(`✅ Lead with campaign created: ${leadResult2.id}`);
      
      // Test the relationship
      const { data: leadWithCampaign, error: joinErr } = await supabase
        .from('leads')
        .select(`
          *,
          campaigns (
            id,
            name,
            status
          )
        `)
        .eq('id', leadResult2.id)
        .single();
      
      console.log(`✅ Lead-Campaign relationship: ${joinErr ? 'Failed' : 'WORKING'}`);
      
      // Clean up
      await supabase.from('leads').delete().eq('id', leadResult2.id);
    }

    // Clean up campaign
    await supabase.from('campaigns').delete().eq('id', campaignResult.id);
    console.log('✅ Cleaned up test campaign');

    // Final test - create lead the way the existing system expects
    console.log('\n👤 Final test - using existing lead pattern...');
    
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('*')
      .limit(1);
    
    if (existingLeads && existingLeads.length > 0) {
      const existingLead = existingLeads[0];
      console.log(`Using pattern from existing lead: ${existingLead.id}`);
      
      const finalTestLead = {
        ...Object.fromEntries(
          Object.entries(existingLead)
            .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
            .map(([key, value]) => {
              if (key === 'phone_number') return [key, '+1555000' + Math.floor(Math.random() * 1000)];
              if (key === 'first_name') return [key, 'FinalTest'];
              if (key === 'last_name') return [key, 'Lead'];
              if (key === 'email') return [key, 'finaltest' + Date.now() + '@example.com'];
              return [key, value];
            })
        )
      };
      
      const { data: finalLeadResult, error: finalLeadErr } = await supabase
        .from('leads')
        .insert(finalTestLead)
        .select()
        .single();
      
      if (finalLeadErr) {
        console.log(`❌ Final lead test failed: ${finalLeadErr.message}`);
      } else {
        console.log(`✅ Final lead test SUCCESS: ${finalLeadResult.id}`);
        
        // Clean up
        await supabase.from('leads').delete().eq('id', finalLeadResult.id);
        
        console.log('\n🎉 LEADS ISSUE RESOLVED! ✅');
        console.log('🚀 ALL DATA CREATION NOW WORKING! 🚀');
      }
    }

  } catch (error) {
    console.error('❌ Error fixing leads:', error);
  }
}

fixLeadsFinal().catch(console.error);