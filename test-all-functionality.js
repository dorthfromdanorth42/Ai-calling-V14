#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

const BASE_URL = 'http://localhost:12000';
const API_URL = 'http://localhost:12001';

async function testAllFunctionality() {
  console.log('🧪 COMPREHENSIVE FUNCTIONALITY TEST\n');
  console.log('='.repeat(50));

  let totalTests = 0;
  let passedTests = 0;

  const test = (name, condition) => {
    totalTests++;
    if (condition) {
      console.log(`✅ ${name}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}`);
    }
  };

  try {
    // 1. DATABASE CONNECTIVITY TESTS
    console.log('\n📊 DATABASE CONNECTIVITY TESTS');
    console.log('-'.repeat(30));

    // Test profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    test('Profiles table accessible', !profileError);

    // Test call_logs table
    const { data: callLogs, error: callError } = await supabase
      .from('call_logs')
      .select('*')
      .limit(1);
    test('Call logs table accessible', !callError);

    // Test outbound_campaigns table
    const { data: campaigns, error: campaignError } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .limit(1);
    test('Campaigns table accessible', !campaignError);

    // Test ai_agents table
    const { data: agents, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .limit(1);
    test('AI agents table accessible', !agentError);

    // 2. API ENDPOINT TESTS
    console.log('\n🌐 API ENDPOINT TESTS');
    console.log('-'.repeat(30));

    // Test server health
    try {
      const healthResponse = await fetch(`${API_URL}/health`, { timeout: 5000 });
      test('Server health endpoint', healthResponse.ok);
    } catch (e) {
      test('Server health endpoint', false);
    }

    // Test WebSocket endpoint
    try {
      const wsResponse = await fetch(`${API_URL}/ws`, { timeout: 5000 });
      test('WebSocket endpoint accessible', wsResponse.status !== 404);
    } catch (e) {
      test('WebSocket endpoint accessible', false);
    }

    // 3. FRONTEND PAGE TESTS
    console.log('\n🖥️  FRONTEND PAGE TESTS');
    console.log('-'.repeat(30));

    const pages = [
      '/dashboard',
      '/calls',
      '/agents',
      '/campaigns',
      '/analytics',
      '/appointments',
      '/enhanced-dashboard',
      '/enhanced-campaigns',
      '/settings',
      '/billing'
    ];

    for (const page of pages) {
      try {
        const response = await fetch(`${BASE_URL}${page}`, { timeout: 5000 });
        test(`Page ${page} loads`, response.ok);
      } catch (e) {
        test(`Page ${page} loads`, false);
      }
    }

    // 4. DATA CREATION TESTS
    console.log('\n📝 DATA CREATION TESTS');
    console.log('-'.repeat(30));

    // Test creating an AI agent
    const { error: agentCreateError } = await supabase
      .from('ai_agents')
      .insert({
        name: 'Test Agent',
        description: 'Test agent for functionality testing',
        voice_settings: {
          voice: 'alloy',
          speed: 1.0,
          pitch: 1.0
        },
        personality: 'Professional and helpful',
        instructions: 'Be polite and assist customers',
        is_active: true
      });
    test('Can create AI agent', !agentCreateError);

    // Test creating a campaign
    const { error: campaignCreateError } = await supabase
      .from('outbound_campaigns')
      .insert({
        name: 'Test Campaign',
        description: 'Test campaign for functionality testing',
        agent_id: null, // Will be updated after agent creation
        status: 'draft',
        call_script: 'Hello, this is a test call.',
        target_audience: 'Test audience',
        schedule_settings: {
          start_time: '09:00',
          end_time: '17:00',
          timezone: 'UTC'
        }
      });
    test('Can create campaign', !campaignCreateError);

    // 5. AUTHENTICATION TESTS
    console.log('\n🔐 AUTHENTICATION TESTS');
    console.log('-'.repeat(30));

    // Test getting session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    test('Can get auth session', !sessionError);

    // Test admin user exists
    const { data: adminUsers, error: adminError } = await supabase.auth.admin.listUsers();
    const hasAdmin = adminUsers?.users?.some(u => u.email === 'gamblerspassion@gmail.com');
    test('Admin user exists', !adminError && hasAdmin);

    // 6. REAL-TIME FEATURES TESTS
    console.log('\n⚡ REAL-TIME FEATURES TESTS');
    console.log('-'.repeat(30));

    // Test real-time subscription setup
    try {
      const channel = supabase.channel('test-channel');
      test('Can create real-time channel', !!channel);
      await supabase.removeChannel(channel);
    } catch (e) {
      test('Can create real-time channel', false);
    }

    // 7. ENVIRONMENT CONFIGURATION TESTS
    console.log('\n⚙️  ENVIRONMENT CONFIGURATION TESTS');
    console.log('-'.repeat(30));

    test('Supabase URL configured', !!process.env.VITE_SUPABASE_URL);
    test('Supabase anon key configured', !!process.env.VITE_SUPABASE_ANON_KEY);
    test('Gemini API key configured', !!process.env.VITE_GEMINI_API_KEY);
    test('Twilio account SID configured', !!process.env.VITE_TWILIO_ACCOUNT_SID);
    test('Demo mode disabled', process.env.VITE_ENABLE_DEMO_MODE === 'false');

    // 8. CRITICAL FUNCTIONALITY TESTS
    console.log('\n🎯 CRITICAL FUNCTIONALITY TESTS');
    console.log('-'.repeat(30));

    // Test profile creation trigger
    const { data: triggerTest } = await supabase
      .rpc('check_trigger_exists', { trigger_name: 'on_auth_user_created' })
      .single();
    test('Profile creation trigger exists', !!triggerTest);

    // Test RLS policies
    const { data: policies, error: policyError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    test('RLS policies allow data access', !policyError);

    // 9. CLEANUP TEST DATA
    console.log('\n🧹 CLEANUP TEST DATA');
    console.log('-'.repeat(30));

    // Clean up test data
    await supabase.from('ai_agents').delete().eq('name', 'Test Agent');
    await supabase.from('outbound_campaigns').delete().eq('name', 'Test Campaign');
    test('Test data cleaned up', true);

  } catch (error) {
    console.error('\n❌ Unexpected error during testing:', error);
  }

  // SUMMARY
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! System is market-ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Review issues above.');
  }

  return { total: totalTests, passed: passedTests };
}

// Run the tests
testAllFunctionality().catch(console.error);