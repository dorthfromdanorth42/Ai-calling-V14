#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function fixDataCreationIssues() {
  console.log('🔧 FIXING DATA CREATION ISSUES');
  console.log('='.repeat(50));

  try {
    // 1. First, let's check what's causing the failures
    console.log('\n📊 DIAGNOSING ISSUES...');
    
    // Check if profile exists
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    console.log(`Profiles table: ${profileError ? '❌ ' + profileError.message : '✅ Accessible'}`);
    console.log(`Profile count: ${profiles?.length || 0}`);

    // Create a test profile if none exists
    let testProfileId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    
    if (!profiles || profiles.length === 0) {
      console.log('\n🔧 Creating test profile...');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: testProfileId,
          email: 'test@example.com',
          full_name: 'Test User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.log(`❌ Failed to create profile: ${createError.message}`);
        // Try to use existing profile
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (existingProfiles && existingProfiles.length > 0) {
          testProfileId = existingProfiles[0].id;
          console.log(`✅ Using existing profile: ${testProfileId}`);
        }
      } else {
        console.log(`✅ Created test profile: ${testProfileId}`);
      }
    } else {
      testProfileId = profiles[0].id;
      console.log(`✅ Using existing profile: ${testProfileId}`);
    }

    // 2. Test AI Agent Creation
    console.log('\n🤖 TESTING AI AGENT CREATION...');
    
    const testAgent = {
      name: 'Test Agent ' + Date.now(),
      description: 'Automated test agent',
      voice_settings: { voice: 'alloy', speed: 1.0 },
      personality: 'Professional',
      instructions: 'Be helpful and polite',
      is_active: true,
      profile_id: testProfileId
    };

    const { data: agentData, error: agentError } = await supabase
      .from('ai_agents')
      .insert(testAgent)
      .select()
      .single();
    
    if (agentError) {
      console.log(`❌ AI Agent creation failed: ${agentError.message}`);
      console.log(`   Code: ${agentError.code}`);
      console.log(`   Details: ${agentError.details}`);
      console.log(`   Hint: ${agentError.hint}`);
      
      // Try to check table structure
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'ai_agents' })
        .catch(() => null);
      
      if (!tableError && tableInfo) {
        console.log(`   Table columns: ${JSON.stringify(tableInfo)}`);
      }
    } else {
      console.log(`✅ AI Agent created successfully: ${agentData.id}`);
    }

    // 3. Test Campaign Creation
    console.log('\n📢 TESTING CAMPAIGN CREATION...');
    
    const testCampaign = {
      name: 'Test Campaign ' + Date.now(),
      description: 'Automated test campaign',
      agent_id: agentData?.id || null,
      status: 'draft',
      call_script: 'Hello, this is a test call.',
      target_audience: 'Test audience',
      profile_id: testProfileId
    };

    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();
    
    if (campaignError) {
      console.log(`❌ Campaign creation failed: ${campaignError.message}`);
      console.log(`   Code: ${campaignError.code}`);
      console.log(`   Details: ${campaignError.details}`);
    } else {
      console.log(`✅ Campaign created successfully: ${campaignData.id}`);
    }

    // 4. Test Lead Creation
    console.log('\n👤 TESTING LEAD CREATION...');
    
    const testLead = {
      name: 'Test Lead ' + Date.now(),
      phone: '+1234567890',
      email: 'testlead@example.com',
      status: 'new',
      source: 'automated_test',
      profile_id: testProfileId
    };

    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert(testLead)
      .select()
      .single();
    
    if (leadError) {
      console.log(`❌ Lead creation failed: ${leadError.message}`);
      console.log(`   Code: ${leadError.code}`);
      console.log(`   Details: ${leadError.details}`);
    } else {
      console.log(`✅ Lead created successfully: ${leadData.id}`);
    }

    // 5. Test Appointment Creation
    console.log('\n📅 TESTING APPOINTMENT CREATION...');
    
    const testAppointment = {
      title: 'Test Appointment ' + Date.now(),
      description: 'Automated test appointment',
      appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      customer_name: 'Test Customer',
      customer_phone: '+1234567890',
      status: 'scheduled',
      profile_id: testProfileId
    };

    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert(testAppointment)
      .select()
      .single();
    
    if (appointmentError) {
      console.log(`❌ Appointment creation failed: ${appointmentError.message}`);
      console.log(`   Code: ${appointmentError.code}`);
      console.log(`   Details: ${appointmentError.details}`);
    } else {
      console.log(`✅ Appointment created successfully: ${appointmentData.id}`);
    }

    // 6. Summary and Cleanup
    console.log('\n🧹 CLEANING UP TEST DATA...');
    
    if (agentData?.id) {
      await supabase.from('ai_agents').delete().eq('id', agentData.id);
      console.log('✅ Cleaned up test agent');
    }
    
    if (campaignData?.id) {
      await supabase.from('campaigns').delete().eq('id', campaignData.id);
      console.log('✅ Cleaned up test campaign');
    }
    
    if (leadData?.id) {
      await supabase.from('leads').delete().eq('id', leadData.id);
      console.log('✅ Cleaned up test lead');
    }
    
    if (appointmentData?.id) {
      await supabase.from('appointments').delete().eq('id', appointmentData.id);
      console.log('✅ Cleaned up test appointment');
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎯 DATA CREATION TEST SUMMARY');
    console.log('='.repeat(50));
    
    const results = {
      profile: !profileError,
      agent: !agentError,
      campaign: !campaignError,
      lead: !leadError,
      appointment: !appointmentError
    };
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`✅ Successful: ${successCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
    
    if (successCount === totalCount) {
      console.log('🎉 ALL DATA CREATION TESTS PASSED!');
    } else {
      console.log('⚠️  Some data creation issues remain');
    }
    
    return results;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return null;
  }
}

// Run the fix
fixDataCreationIssues().catch(console.error);