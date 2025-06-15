#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function inspectSchema() {
  console.log('🔍 INSPECTING DATABASE SCHEMA');
  console.log('='.repeat(50));

  try {
    // Check enum types
    console.log('\n📋 CHECKING ENUM TYPES...');
    
    const { data: enums, error: enumError } = await supabase
      .rpc('get_enum_values')
      .catch(() => ({ data: null, error: 'Function not available' }));
    
    if (enumError) {
      console.log('⚠️  Cannot get enum values directly, will test with sample data');
    }

    // Let's check what values are actually in the database for reference
    console.log('\n📊 CHECKING EXISTING DATA FOR REFERENCE...');
    
    // Check ai_agents
    const { data: existingAgents } = await supabase
      .from('ai_agents')
      .select('business_days, agent_type')
      .limit(5);
    
    if (existingAgents && existingAgents.length > 0) {
      console.log('✅ Existing AI Agents business_days format:', existingAgents[0].business_days);
      console.log('✅ Existing AI Agents agent_type:', existingAgents[0].agent_type);
    }

    // Check campaigns
    const { data: existingCampaigns } = await supabase
      .from('campaigns')
      .select('days_of_week, priority')
      .limit(5);
    
    if (existingCampaigns && existingCampaigns.length > 0) {
      console.log('✅ Existing Campaigns days_of_week format:', existingCampaigns[0].days_of_week);
      console.log('✅ Existing Campaigns priority:', existingCampaigns[0].priority);
    }

    // Check leads
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('priority, status')
      .limit(5);
    
    if (existingLeads && existingLeads.length > 0) {
      console.log('✅ Existing Leads priority:', existingLeads[0].priority);
      console.log('✅ Existing Leads status:', existingLeads[0].status);
    }

    // Check appointments table structure
    console.log('\n📅 CHECKING APPOINTMENTS TABLE...');
    
    // Try to get the table structure by attempting to insert with minimal data
    const { error: appointmentStructureError } = await supabase
      .from('appointments')
      .insert({})
      .select();
    
    if (appointmentStructureError) {
      console.log('Appointments table error (shows required fields):', appointmentStructureError.message);
    }

    // Let's try to create records with simpler data types
    console.log('\n🧪 TESTING WITH SIMPLIFIED DATA...');
    
    // Get profile ID
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;

    // Test 1: Minimal AI Agent
    console.log('\n🤖 Testing minimal AI agent...');
    const minimalAgent = {
      profile_id: profileId,
      name: 'Minimal Test Agent',
      description: 'Test',
      agent_type: 'sales', // Try common values
      voice_name: 'alloy',
      language_code: 'en-US',
      system_instruction: 'Test instruction',
      is_active: true
    };

    const { data: agentResult, error: agentErr } = await supabase
      .from('ai_agents')
      .insert(minimalAgent)
      .select()
      .single();
    
    if (agentErr) {
      console.log(`❌ Minimal agent failed: ${agentErr.message}`);
    } else {
      console.log(`✅ Minimal agent created: ${agentResult.id}`);
      
      // Clean up
      await supabase.from('ai_agents').delete().eq('id', agentResult.id);
    }

    // Test 2: Minimal Campaign
    console.log('\n📢 Testing minimal campaign...');
    const minimalCampaign = {
      profile_id: profileId,
      name: 'Minimal Test Campaign',
      description: 'Test',
      status: 'draft'
    };

    const { data: campaignResult, error: campaignErr } = await supabase
      .from('campaigns')
      .insert(minimalCampaign)
      .select()
      .single();
    
    if (campaignErr) {
      console.log(`❌ Minimal campaign failed: ${campaignErr.message}`);
    } else {
      console.log(`✅ Minimal campaign created: ${campaignResult.id}`);
      
      // Clean up
      await supabase.from('campaigns').delete().eq('id', campaignResult.id);
    }

    // Test 3: Minimal Lead
    console.log('\n👤 Testing minimal lead...');
    const minimalLead = {
      phone_number: '+1234567890',
      first_name: 'Test',
      last_name: 'Lead',
      status: 'new'
    };

    const { data: leadResult, error: leadErr } = await supabase
      .from('leads')
      .insert(minimalLead)
      .select()
      .single();
    
    if (leadErr) {
      console.log(`❌ Minimal lead failed: ${leadErr.message}`);
    } else {
      console.log(`✅ Minimal lead created: ${leadResult.id}`);
      
      // Clean up
      await supabase.from('leads').delete().eq('id', leadResult.id);
    }

    // Test 4: Minimal Appointment
    console.log('\n📅 Testing minimal appointment...');
    const minimalAppointment = {
      profile_id: profileId,
      title: 'Test Appointment',
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
    } else {
      console.log(`✅ Minimal appointment created: ${appointmentResult.id}`);
      
      // Clean up
      await supabase.from('appointments').delete().eq('id', appointmentResult.id);
    }

  } catch (error) {
    console.error('❌ Error inspecting schema:', error);
  }
}

inspectSchema().catch(console.error);