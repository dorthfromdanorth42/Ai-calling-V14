#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function testDataCreationFixed() {
  console.log('🔧 TESTING DATA CREATION WITH CORRECT SCHEMA');
  console.log('='.repeat(60));

  let results = {
    agent: false,
    campaign: false,
    lead: false,
    appointment: false
  };

  try {
    // Get existing profile
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const profileId = profiles[0]?.id;
    console.log(`✅ Using profile: ${profileId}`);

    // 1. Test AI Agent Creation with correct schema
    console.log('\n🤖 TESTING AI AGENT CREATION...');
    
    const testAgent = {
      profile_id: profileId,
      name: 'Test Agent ' + Date.now(),
      description: 'Automated test agent for market readiness',
      agent_type: 'sales',
      voice_name: 'alloy',
      language_code: 'en-US',
      system_instruction: 'You are a helpful AI assistant for sales calls.',
      is_active: true,
      max_concurrent_calls: 5,
      business_hours_start: '09:00',
      business_hours_end: '17:00',
      business_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timezone: 'America/New_York',
      escalation_enabled: false,
      voice_settings: { speed: 1.0, pitch: 1.0 }
    };

    const { data: agentData, error: agentError } = await supabase
      .from('ai_agents')
      .insert(testAgent)
      .select()
      .single();
    
    if (agentError) {
      console.log(`❌ AI Agent creation failed: ${agentError.message}`);
      console.log(`   Details: ${agentError.details || 'No details'}`);
    } else {
      console.log(`✅ AI Agent created successfully: ${agentData.id}`);
      results.agent = true;
    }

    // 2. Test Campaign Creation with correct schema
    console.log('\n📢 TESTING CAMPAIGN CREATION...');
    
    const testCampaign = {
      profile_id: profileId,
      agent_id: agentData?.id || null,
      name: 'Test Campaign ' + Date.now(),
      description: 'Automated test campaign for market readiness',
      status: 'draft',
      max_concurrent_calls: 3,
      call_timeout_seconds: 30,
      retry_attempts: 2,
      retry_delay_minutes: 60,
      timezone: 'America/New_York',
      days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      priority: 'medium',
      target_audience: 'Test prospects',
      script: 'Hello, this is a test call from our AI system.'
    };

    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();
    
    if (campaignError) {
      console.log(`❌ Campaign creation failed: ${campaignError.message}`);
      console.log(`   Details: ${campaignError.details || 'No details'}`);
    } else {
      console.log(`✅ Campaign created successfully: ${campaignData.id}`);
      results.campaign = true;
    }

    // 3. Test Lead Creation with correct schema
    console.log('\n👤 TESTING LEAD CREATION...');
    
    const testLead = {
      campaign_id: campaignData?.id || null,
      phone_number: '+1234567890',
      first_name: 'Test',
      last_name: 'Lead ' + Date.now(),
      email: 'testlead@example.com',
      company: 'Test Company',
      title: 'Test Manager',
      status: 'new',
      priority: 'medium',
      call_attempts: 0,
      do_not_call: false,
      timezone: 'America/New_York',
      tags: ['test', 'automated'],
      metadata: { source: 'automated_test' }
    };

    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert(testLead)
      .select()
      .single();
    
    if (leadError) {
      console.log(`❌ Lead creation failed: ${leadError.message}`);
      console.log(`   Details: ${leadError.details || 'No details'}`);
    } else {
      console.log(`✅ Lead created successfully: ${leadData.id}`);
      results.lead = true;
    }

    // 4. Test Appointment Creation - let's check the appointments table structure first
    console.log('\n📅 TESTING APPOINTMENT CREATION...');
    
    // First, let's see what columns appointments table actually has
    const { data: appointmentSample, error: appointmentSampleError } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);
    
    if (appointmentSampleError) {
      console.log(`❌ Cannot access appointments table: ${appointmentSampleError.message}`);
    } else {
      // Try a minimal appointment creation
      const testAppointment = {
        profile_id: profileId,
        title: 'Test Appointment ' + Date.now(),
        description: 'Automated test appointment',
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        customer_name: 'Test Customer',
        customer_phone: '+1234567890',
        status: 'scheduled'
      };

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert(testAppointment)
        .select()
        .single();
      
      if (appointmentError) {
        console.log(`❌ Appointment creation failed: ${appointmentError.message}`);
        console.log(`   Details: ${appointmentError.details || 'No details'}`);
      } else {
        console.log(`✅ Appointment created successfully: ${appointmentData.id}`);
        results.appointment = true;
      }
    }

    // 5. Test actual functionality - can we retrieve the data?
    console.log('\n🔍 TESTING DATA RETRIEVAL...');
    
    if (results.agent) {
      const { data: retrievedAgent } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentData.id)
        .single();
      console.log(`✅ Agent retrieval: ${retrievedAgent ? 'Success' : 'Failed'}`);
    }

    if (results.campaign) {
      const { data: retrievedCampaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignData.id)
        .single();
      console.log(`✅ Campaign retrieval: ${retrievedCampaign ? 'Success' : 'Failed'}`);
    }

    if (results.lead) {
      const { data: retrievedLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadData.id)
        .single();
      console.log(`✅ Lead retrieval: ${retrievedLead ? 'Success' : 'Failed'}`);
    }

    // 6. Test updates
    console.log('\n✏️  TESTING DATA UPDATES...');
    
    if (results.agent) {
      const { error: updateError } = await supabase
        .from('ai_agents')
        .update({ description: 'Updated test agent description' })
        .eq('id', agentData.id);
      console.log(`✅ Agent update: ${updateError ? 'Failed - ' + updateError.message : 'Success'}`);
    }

    // 7. Cleanup
    console.log('\n🧹 CLEANING UP TEST DATA...');
    
    if (results.lead && leadData?.id) {
      await supabase.from('leads').delete().eq('id', leadData.id);
      console.log('✅ Cleaned up test lead');
    }
    
    if (results.campaign && campaignData?.id) {
      await supabase.from('campaigns').delete().eq('id', campaignData.id);
      console.log('✅ Cleaned up test campaign');
    }
    
    if (results.agent && agentData?.id) {
      await supabase.from('ai_agents').delete().eq('id', agentData.id);
      console.log('✅ Cleaned up test agent');
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DATA CREATION TEST RESULTS');
    console.log('='.repeat(60));
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`✅ AI Agents: ${results.agent ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Campaigns: ${results.campaign ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Leads: ${results.lead ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Appointments: ${results.appointment ? 'WORKING' : 'FAILED'}`);
    
    console.log(`\n📊 Success Rate: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);
    
    if (successCount === totalCount) {
      console.log('🎉 ALL DATA CREATION TESTS PASSED! ✅');
      console.log('🚀 CRITICAL ISSUE RESOLVED - READY FOR PRODUCTION!');
    } else {
      console.log(`⚠️  ${totalCount - successCount} issues remain`);
    }

    return results;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return results;
  }
}

testDataCreationFixed().catch(console.error);