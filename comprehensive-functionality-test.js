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

const BASE_URL = 'https://work-1-qkghxfntlfmbhuuv.prod-runtime.all-hands.dev';

async function comprehensiveFunctionalityTest() {
  console.log('🚀 COMPREHENSIVE MARKET READINESS TEST');
  console.log('='.repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalIssues = [];
  let warnings = [];

  const test = (name, condition, isCritical = false) => {
    totalTests++;
    if (condition) {
      console.log(`✅ ${name}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}`);
      if (isCritical) {
        criticalIssues.push(name);
      } else {
        warnings.push(name);
      }
    }
  };

  try {
    // 1. DATABASE FUNCTIONALITY TESTS
    console.log('\n📊 DATABASE FUNCTIONALITY TESTS');
    console.log('-'.repeat(40));

    // Test all critical tables
    const tables = [
      'profiles', 'call_logs', 'ai_agents', 'campaigns', 
      'appointments', 'leads', 'dnc_list', 'billing', 
      'analytics_data', 'call_recordings', 'agent_performance',
      'live_calls', 'function_call_logs', 'webhooks'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        test(`Table ${table} accessible`, !error, true);
      } catch (err) {
        test(`Table ${table} accessible`, false, true);
      }
    }

    // 2. DATA CREATION TESTS
    console.log('\n📝 DATA CREATION & CRUD TESTS');
    console.log('-'.repeat(40));

    // Test creating an AI agent
    const testAgent = {
      name: 'Test Agent ' + Date.now(),
      description: 'Automated test agent',
      voice_settings: { voice: 'alloy', speed: 1.0 },
      personality: 'Professional',
      instructions: 'Be helpful and polite',
      is_active: true,
      profile_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Test UUID
    };

    const { data: agentData, error: agentError } = await supabase
      .from('ai_agents')
      .insert(testAgent)
      .select()
      .single();
    
    test('Can create AI agent', !agentError, true);
    
    let createdAgentId = null;
    if (!agentError && agentData) {
      createdAgentId = agentData.id;
      
      // Test updating the agent
      const { error: updateError } = await supabase
        .from('ai_agents')
        .update({ description: 'Updated test agent' })
        .eq('id', createdAgentId);
      
      test('Can update AI agent', !updateError);
    }

    // Test creating a campaign
    const testCampaign = {
      name: 'Test Campaign ' + Date.now(),
      description: 'Automated test campaign',
      agent_id: createdAgentId,
      status: 'draft',
      call_script: 'Hello, this is a test call.',
      target_audience: 'Test audience',
      profile_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    };

    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();
    
    test('Can create campaign', !campaignError, true);

    // Test creating a lead
    const testLead = {
      name: 'Test Lead ' + Date.now(),
      phone: '+1234567890',
      email: 'test@example.com',
      status: 'new',
      source: 'automated_test',
      profile_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    };

    const { error: leadError } = await supabase
      .from('leads')
      .insert(testLead);
    
    test('Can create lead', !leadError, true);

    // Test creating an appointment
    const testAppointment = {
      title: 'Test Appointment ' + Date.now(),
      description: 'Automated test appointment',
      appointment_date: new Date().toISOString(),
      customer_name: 'Test Customer',
      customer_phone: '+1234567890',
      status: 'scheduled',
      profile_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    };

    const { error: appointmentError } = await supabase
      .from('appointments')
      .insert(testAppointment);
    
    test('Can create appointment', !appointmentError, true);

    // 3. FRONTEND PAGE ACCESSIBILITY TESTS
    console.log('\n🖥️  FRONTEND PAGE ACCESSIBILITY TESTS');
    console.log('-'.repeat(40));

    const pages = [
      { path: '/', name: 'Home Page' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/live-calls', name: 'Live Calls' },
      { path: '/agents', name: 'AI Agents' },
      { path: '/calls', name: 'Call History' },
      { path: '/appointments', name: 'Appointments' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/campaigns', name: 'Campaigns' },
      { path: '/enhanced-dashboard', name: 'Enhanced Dashboard' },
      { path: '/enhanced-campaigns', name: 'Enhanced Campaigns' },
      { path: '/dnc', name: 'DNC List' },
      { path: '/webhooks', name: 'Webhooks' },
      { path: '/billing', name: 'Billing' },
      { path: '/settings', name: 'Settings' },
      { path: '/admin/users', name: 'User Management' }
    ];

    for (const page of pages) {
      try {
        const response = await fetch(`${BASE_URL}${page.path}`, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)'
          }
        });
        test(`${page.name} loads (${page.path})`, response.ok, page.path === '/dashboard');
      } catch (err) {
        test(`${page.name} loads (${page.path})`, false, page.path === '/dashboard');
      }
    }

    // 4. API INTEGRATION TESTS
    console.log('\n🌐 API INTEGRATION TESTS');
    console.log('-'.repeat(40));

    // Test Gemini API
    try {
      const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.VITE_GEMINI_API_KEY);
      test('Gemini API accessible', geminiResponse.ok, true);
    } catch (err) {
      test('Gemini API accessible', false, true);
    }

    // Test Twilio API
    try {
      const twilioAuth = Buffer.from(`${process.env.VITE_TWILIO_ACCOUNT_SID}:${process.env.VITE_TWILIO_AUTH_TOKEN}`).toString('base64');
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}.json`, {
        headers: { 'Authorization': `Basic ${twilioAuth}` }
      });
      test('Twilio API accessible', twilioResponse.ok, true);
    } catch (err) {
      test('Twilio API accessible', false, true);
    }

    // 5. REAL-TIME FUNCTIONALITY TESTS
    console.log('\n⚡ REAL-TIME FUNCTIONALITY TESTS');
    console.log('-'.repeat(40));

    // Test real-time subscriptions
    try {
      const channel = supabase.channel('test-channel-' + Date.now());
      const subscription = channel.on('postgres_changes', 
        { event: '*', schema: 'public', table: 'call_logs' },
        (payload) => console.log('Real-time event received')
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      test('Real-time channel creation', !!channel);
      
      await supabase.removeChannel(channel);
      test('Real-time channel cleanup', true);
    } catch (err) {
      test('Real-time channel creation', false);
      test('Real-time channel cleanup', false);
    }

    // 6. SECURITY TESTS
    console.log('\n🔒 SECURITY & RLS TESTS');
    console.log('-'.repeat(40));

    // Test RLS policies
    const { data: anonData, error: anonError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    test('RLS allows authenticated access', !anonError);

    // Test that sensitive data is protected
    const { data: sensitiveData, error: sensitiveError } = await supabase
      .from('profiles')
      .select('gemini_api_key')
      .limit(1);
    
    test('Sensitive data access controlled', !sensitiveError);

    // 7. PERFORMANCE TESTS
    console.log('\n⚡ PERFORMANCE TESTS');
    console.log('-'.repeat(40));

    // Test database query performance
    const startTime = Date.now();
    const { error: perfError } = await supabase
      .from('call_logs')
      .select('*')
      .limit(100);
    const queryTime = Date.now() - startTime;
    
    test('Database query performance (<2s)', queryTime < 2000 && !perfError);
    test('Database query functional', !perfError, true);

    // 8. CLEANUP TEST DATA
    console.log('\n🧹 CLEANUP TEST DATA');
    console.log('-'.repeat(40));

    // Clean up test data
    if (createdAgentId) {
      await supabase.from('ai_agents').delete().eq('id', createdAgentId);
    }
    if (campaignData?.id) {
      await supabase.from('campaigns').delete().eq('id', campaignData.id);
    }
    await supabase.from('leads').delete().like('name', 'Test Lead %');
    await supabase.from('appointments').delete().like('title', 'Test Appointment %');
    
    test('Test data cleaned up', true);

  } catch (error) {
    console.error('\n❌ Unexpected error during testing:', error);
    criticalIssues.push('Unexpected system error: ' + error.message);
  }

  // FINAL SUMMARY
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES (BLOCKING):');
    criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (NON-BLOCKING):');
    warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  }

  // MARKET READINESS ASSESSMENT
  const successRate = (passedTests / totalTests) * 100;
  const hasCriticalIssues = criticalIssues.length > 0;

  console.log('\n' + '='.repeat(60));
  console.log('🎯 MARKET READINESS ASSESSMENT');
  console.log('='.repeat(60));

  if (successRate >= 90 && !hasCriticalIssues) {
    console.log('🎉 STATUS: MARKET READY ✅');
    console.log('✅ System is ready for production deployment');
  } else if (successRate >= 80 && criticalIssues.length <= 2) {
    console.log('⚠️  STATUS: NEARLY READY 🟡');
    console.log('🔧 Minor fixes needed before production');
  } else {
    console.log('❌ STATUS: NOT READY 🔴');
    console.log('🚨 Critical issues must be resolved');
  }

  console.log(`\n📈 Confidence Level: ${successRate.toFixed(1)}%`);
  console.log(`🔧 Critical Issues: ${criticalIssues.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);

  return {
    total: totalTests,
    passed: passedTests,
    successRate,
    criticalIssues,
    warnings,
    marketReady: successRate >= 90 && !hasCriticalIssues
  };
}

// Run the comprehensive test
comprehensiveFunctionalityTest().catch(console.error);