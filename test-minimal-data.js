#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function testMinimalData() {
  console.log('🧪 TESTING MINIMAL DATA CREATION');
  console.log('='.repeat(50));

  try {
    // Get profile ID
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;
    console.log(`✅ Using profile: ${profileId}`);

    let results = { agent: false, campaign: false, lead: false, appointment: false };

    // Test 1: Minimal AI Agent
    console.log('\n🤖 Testing minimal AI agent...');
    const minimalAgent = {
      profile_id: profileId,
      name: 'Minimal Test Agent ' + Date.now(),
      description: 'Test agent',
      is_active: true
    };

    const { data: agentResult, error: agentErr } = await supabase
      .from('ai_agents')
      .insert(minimalAgent)
      .select()
      .single();
    
    if (agentErr) {
      console.log(`❌ Minimal agent failed: ${agentErr.message}`);
      console.log(`   Code: ${agentErr.code}`);
    } else {
      console.log(`✅ Minimal agent created: ${agentResult.id}`);
      results.agent = true;
      
      // Clean up
      await supabase.from('ai_agents').delete().eq('id', agentResult.id);
    }

    // Test 2: Minimal Campaign
    console.log('\n📢 Testing minimal campaign...');
    const minimalCampaign = {
      profile_id: profileId,
      name: 'Minimal Test Campaign ' + Date.now(),
      description: 'Test campaign',
      status: 'draft'
    };

    const { data: campaignResult, error: campaignErr } = await supabase
      .from('campaigns')
      .insert(minimalCampaign)
      .select()
      .single();
    
    if (campaignErr) {
      console.log(`❌ Minimal campaign failed: ${campaignErr.message}`);
      console.log(`   Code: ${campaignErr.code}`);
    } else {
      console.log(`✅ Minimal campaign created: ${campaignResult.id}`);
      results.campaign = true;
      
      // Clean up
      await supabase.from('campaigns').delete().eq('id', campaignResult.id);
    }

    // Test 3: Minimal Lead
    console.log('\n👤 Testing minimal lead...');
    const minimalLead = {
      phone_number: '+1234567890',
      first_name: 'Test',
      last_name: 'Lead ' + Date.now(),
      status: 'new'
    };

    const { data: leadResult, error: leadErr } = await supabase
      .from('leads')
      .insert(minimalLead)
      .select()
      .single();
    
    if (leadErr) {
      console.log(`❌ Minimal lead failed: ${leadErr.message}`);
      console.log(`   Code: ${leadErr.code}`);
    } else {
      console.log(`✅ Minimal lead created: ${leadResult.id}`);
      results.lead = true;
      
      // Clean up
      await supabase.from('leads').delete().eq('id', leadResult.id);
    }

    // Test 4: Minimal Appointment
    console.log('\n📅 Testing minimal appointment...');
    const minimalAppointment = {
      profile_id: profileId,
      title: 'Test Appointment ' + Date.now(),
      appointment_date: new Date().toISOString(),
      customer_name: 'Test Customer',
      customer_phone: '+1234567890',
      status: 'scheduled'
    };

    const { data: appointmentResult, error: appointmentErr } = await supabase
      .from('appointments')
      .insert(minimalAppointment)
      .select()
      .single();
    
    if (appointmentErr) {
      console.log(`❌ Minimal appointment failed: ${appointmentErr.message}`);
      console.log(`   Code: ${appointmentErr.code}`);
    } else {
      console.log(`✅ Minimal appointment created: ${appointmentResult.id}`);
      results.appointment = true;
      
      // Clean up
      await supabase.from('appointments').delete().eq('id', appointmentResult.id);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎯 MINIMAL DATA CREATION RESULTS');
    console.log('='.repeat(50));
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`✅ AI Agents: ${results.agent ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Campaigns: ${results.campaign ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Leads: ${results.lead ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Appointments: ${results.appointment ? 'WORKING' : 'FAILED'}`);
    
    console.log(`\n📊 Success Rate: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);
    
    if (successCount === totalCount) {
      console.log('🎉 ALL DATA CREATION WORKING! ✅');
    } else if (successCount >= totalCount * 0.75) {
      console.log('⚠️  Most data creation working, minor issues remain');
    } else {
      console.log('❌ Significant data creation issues');
    }

    return results;

  } catch (error) {
    console.error('❌ Error testing minimal data:', error);
    return { agent: false, campaign: false, lead: false, appointment: false };
  }
}

testMinimalData().catch(console.error);