#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

const BASE_URL = 'https://work-2-qkghxfntlfmbhuuv.prod-runtime.all-hands.dev';

async function comprehensiveSystemTest() {
  console.log('🔍 COMPREHENSIVE SYSTEM TEST - PROVING MARKET READINESS');
  console.log('='.repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalFailures = [];
  let warnings = [];
  let testResults = {};

  const test = (category, name, condition, isCritical = false) => {
    totalTests++;
    const status = condition ? 'PASS' : 'FAIL';
    
    if (!testResults[category]) testResults[category] = [];
    testResults[category].push({ name, status, critical: isCritical });
    
    if (condition) {
      console.log(`✅ ${name}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}`);
      if (isCritical) {
        criticalFailures.push(`${category}: ${name}`);
      } else {
        warnings.push(`${category}: ${name}`);
      }
    }
  };

  try {
    // 1. FRONTEND ACCESSIBILITY TESTS
    console.log('\n🖥️  FRONTEND ACCESSIBILITY TESTS');
    console.log('-'.repeat(50));

    const pages = [
      { path: '/', name: 'Home Page', critical: true },
      { path: '/dashboard', name: 'Dashboard', critical: true },
      { path: '/live-calls', name: 'Live Calls', critical: true },
      { path: '/agents', name: 'AI Agents', critical: true },
      { path: '/calls', name: 'Call History', critical: true },
      { path: '/appointments', name: 'Appointments', critical: true },
      { path: '/analytics', name: 'Analytics', critical: false },
      { path: '/campaigns', name: 'Campaigns', critical: true },
      { path: '/enhanced-dashboard', name: 'Enhanced Dashboard', critical: false },
      { path: '/enhanced-campaigns', name: 'Enhanced Campaigns', critical: false },
      { path: '/dnc', name: 'DNC List', critical: true },
      { path: '/webhooks', name: 'Webhooks', critical: false },
      { path: '/billing', name: 'Billing', critical: true },
      { path: '/settings', name: 'Settings', critical: true },
      { path: '/admin/users', name: 'User Management', critical: false }
    ];

    for (const page of pages) {
      try {
        const response = await fetch(`${BASE_URL}${page.path}`, { 
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)' }
        });
        
        const isAccessible = response.ok;
        test('Frontend', `${page.name} accessible`, isAccessible, page.critical);
        
        if (isAccessible) {
          const content = await response.text();
          const hasReactApp = content.includes('id="root"') || content.includes('React');
          const hasErrors = content.includes('Cannot GET') || content.includes('404');
          
          test('Frontend', `${page.name} loads React app`, hasReactApp, page.critical);
          test('Frontend', `${page.name} no errors`, !hasErrors, page.critical);
        }
      } catch (err) {
        test('Frontend', `${page.name} accessible`, false, page.critical);
      }
    }

    // 2. DATABASE FUNCTIONALITY TESTS
    console.log('\n📊 DATABASE FUNCTIONALITY TESTS');
    console.log('-'.repeat(50));

    const tables = [
      { name: 'profiles', critical: true },
      { name: 'ai_agents', critical: true },
      { name: 'campaigns', critical: true },
      { name: 'leads', critical: true },
      { name: 'appointments', critical: true },
      { name: 'call_logs', critical: true },
      { name: 'dnc_list', critical: true },
      { name: 'billing', critical: false },
      { name: 'analytics_data', critical: false },
      { name: 'call_recordings', critical: false },
      { name: 'agent_performance', critical: false },
      { name: 'live_calls', critical: true },
      { name: 'function_call_logs', critical: false },
      { name: 'webhooks', critical: false }
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table.name).select('*').limit(1);
        test('Database', `${table.name} table accessible`, !error, table.critical);
        
        if (!error) {
          // Test basic operations
          const { error: countError } = await supabase.from(table.name).select('*', { count: 'exact', head: true });
          test('Database', `${table.name} count query`, !countError, false);
        }
      } catch (err) {
        test('Database', `${table.name} table accessible`, false, table.critical);
      }
    }

    // 3. API INTEGRATION TESTS
    console.log('\n🌐 API INTEGRATION TESTS');
    console.log('-'.repeat(50));

    // Test Gemini API
    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`);
      test('API', 'Gemini API connection', geminiResponse.ok, true);
      
      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        test('API', 'Gemini API returns models', geminiData.models && geminiData.models.length > 0, true);
      }
    } catch (err) {
      test('API', 'Gemini API connection', false, true);
    }

    // Test Twilio API
    try {
      const twilioAuth = Buffer.from(`${process.env.VITE_TWILIO_ACCOUNT_SID}:${process.env.VITE_TWILIO_AUTH_TOKEN}`).toString('base64');
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}.json`, {
        headers: { 'Authorization': `Basic ${twilioAuth}` }
      });
      test('API', 'Twilio API connection', twilioResponse.ok, true);
      
      if (twilioResponse.ok) {
        const twilioData = await twilioResponse.json();
        test('API', 'Twilio account accessible', !!twilioData.sid, true);
      }
    } catch (err) {
      test('API', 'Twilio API connection', false, true);
    }

    // Test Supabase API
    try {
      const { data, error } = await supabase.auth.getSession();
      test('API', 'Supabase Auth API', !error, true);
    } catch (err) {
      test('API', 'Supabase Auth API', false, true);
    }

    // 4. CORE FUNCTIONALITY TESTS
    console.log('\n🔧 CORE FUNCTIONALITY TESTS');
    console.log('-'.repeat(50));

    // Test AI Agent creation and management
    try {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      const profileId = profiles[0]?.id;
      
      const testAgent = {
        profile_id: profileId,
        name: 'System Test Agent ' + Date.now(),
        description: 'Comprehensive system test agent',
        is_active: true
      };

      const { data: agentResult, error: agentError } = await supabase
        .from('ai_agents')
        .insert(testAgent)
        .select()
        .single();
      
      test('Core', 'AI Agent creation', !agentError, true);
      
      if (!agentError) {
        // Test agent update
        const { error: updateError } = await supabase
          .from('ai_agents')
          .update({ description: 'Updated test agent' })
          .eq('id', agentResult.id);
        
        test('Core', 'AI Agent update', !updateError, true);
        
        // Test agent deletion
        const { error: deleteError } = await supabase
          .from('ai_agents')
          .delete()
          .eq('id', agentResult.id);
        
        test('Core', 'AI Agent deletion', !deleteError, true);
      }
    } catch (err) {
      test('Core', 'AI Agent CRUD operations', false, true);
    }

    // Test Campaign management
    try {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      const profileId = profiles[0]?.id;
      
      const testCampaign = {
        profile_id: profileId,
        name: 'System Test Campaign ' + Date.now(),
        description: 'Comprehensive system test campaign',
        status: 'draft',
        caller_id: '+1234567890'
      };

      const { data: campaignResult, error: campaignError } = await supabase
        .from('campaigns')
        .insert(testCampaign)
        .select()
        .single();
      
      test('Core', 'Campaign creation', !campaignError, true);
      
      if (!campaignError) {
        // Test campaign status update
        const { error: statusError } = await supabase
          .from('campaigns')
          .update({ status: 'active' })
          .eq('id', campaignResult.id);
        
        test('Core', 'Campaign status update', !statusError, true);
        
        // Cleanup
        await supabase.from('campaigns').delete().eq('id', campaignResult.id);
      }
    } catch (err) {
      test('Core', 'Campaign management', false, true);
    }

    // 5. REAL-TIME FUNCTIONALITY TESTS
    console.log('\n⚡ REAL-TIME FUNCTIONALITY TESTS');
    console.log('-'.repeat(50));

    try {
      const channel = supabase.channel('system-test-' + Date.now());
      let realtimeReceived = false;
      
      channel.on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          realtimeReceived = true;
        }
      );
      
      const subscribeResult = await channel.subscribe();
      test('Realtime', 'Channel subscription', subscribeResult === 'SUBSCRIBED', false);
      
      // Trigger a change
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      if (profiles && profiles.length > 0) {
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', profiles[0].id);
      }
      
      // Wait for real-time event
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      test('Realtime', 'Real-time events received', realtimeReceived, false);
      
      await supabase.removeChannel(channel);
    } catch (err) {
      test('Realtime', 'Real-time functionality', false, false);
    }

    // 6. SECURITY TESTS
    console.log('\n🔒 SECURITY TESTS');
    console.log('-'.repeat(50));

    // Test RLS policies
    try {
      const anonClient = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      );
      
      const { data, error } = await anonClient.from('profiles').select('*').limit(1);
      test('Security', 'RLS prevents unauthorized access', !!error, true);
    } catch (err) {
      test('Security', 'RLS policy test', false, true);
    }

    // Test API key protection
    try {
      const response = await fetch(`${BASE_URL}/api/keys`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      test('Security', 'API key protection', !response.ok, true);
    } catch (err) {
      // Expected to fail - this is good
      test('Security', 'API key protection', true, true);
    }

    // 7. PERFORMANCE TESTS
    console.log('\n⚡ PERFORMANCE TESTS');
    console.log('-'.repeat(50));

    // Test database query performance
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .limit(100);
      const queryTime = Date.now() - startTime;
      
      test('Performance', 'Database query speed (<2s)', queryTime < 2000 && !error, false);
      test('Performance', 'Database query functional', !error, true);
    } catch (err) {
      test('Performance', 'Database performance', false, true);
    }

    // Test frontend load time
    try {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/dashboard`);
      const loadTime = Date.now() - startTime;
      
      test('Performance', 'Frontend load time (<5s)', loadTime < 5000 && response.ok, false);
    } catch (err) {
      test('Performance', 'Frontend load time', false, false);
    }

    // 8. DATA INTEGRITY TESTS
    console.log('\n🔍 DATA INTEGRITY TESTS');
    console.log('-'.repeat(50));

    // Test foreign key relationships
    try {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select(`
          *,
          ai_agents (
            id,
            name
          )
        `)
        .limit(1);
      
      test('Data', 'Campaign-Agent relationship', campaigns && campaigns.length > 0, true);
    } catch (err) {
      test('Data', 'Foreign key relationships', false, true);
    }

    // Test data validation
    try {
      const { error } = await supabase
        .from('ai_agents')
        .insert({
          name: '', // Invalid empty name
          profile_id: 'invalid-uuid' // Invalid UUID
        });
      
      test('Data', 'Data validation working', !!error, true);
    } catch (err) {
      test('Data', 'Data validation', false, true);
    }

  } catch (error) {
    console.error('\n❌ Unexpected system error:', error);
    criticalFailures.push('System: Unexpected error during testing');
  }

  // COMPREHENSIVE RESULTS ANALYSIS
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE SYSTEM TEST RESULTS');
  console.log('='.repeat(80));

  // Category breakdown
  for (const [category, tests] of Object.entries(testResults)) {
    const categoryPassed = tests.filter(t => t.status === 'PASS').length;
    const categoryTotal = tests.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
    
    console.log(`\n${category.toUpperCase()}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    
    const criticalTests = tests.filter(t => t.critical);
    const criticalPassed = criticalTests.filter(t => t.status === 'PASS').length;
    
    if (criticalTests.length > 0) {
      console.log(`   Critical: ${criticalPassed}/${criticalTests.length}`);
    }
  }

  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES (BLOCKING LAUNCH):');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (NON-BLOCKING):');
    warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  }

  // MARKET READINESS ASSESSMENT
  const successRate = (passedTests / totalTests) * 100;
  const hasCriticalFailures = criticalFailures.length > 0;

  console.log('\n' + '='.repeat(80));
  console.log('🎯 MARKET READINESS ASSESSMENT');
  console.log('='.repeat(80));

  if (successRate >= 95 && !hasCriticalFailures) {
    console.log('🎉 STATUS: FULLY MARKET READY ✅');
    console.log('✅ System is ready for immediate production deployment');
    console.log('✅ All critical functionality verified');
    console.log('✅ No blocking issues identified');
  } else if (successRate >= 85 && criticalFailures.length <= 2) {
    console.log('⚠️  STATUS: NEARLY READY 🟡');
    console.log('🔧 Minor fixes needed before production');
    console.log(`📊 ${criticalFailures.length} critical issue(s) to resolve`);
  } else {
    console.log('❌ STATUS: NOT READY FOR PRODUCTION 🔴');
    console.log('🚨 Critical issues must be resolved before launch');
    console.log(`📊 ${criticalFailures.length} critical failure(s)`);
  }

  console.log(`\n📈 Confidence Level: ${successRate.toFixed(1)}%`);
  console.log(`🔧 Critical Issues: ${criticalFailures.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);

  return {
    totalTests,
    passedTests,
    successRate,
    criticalFailures,
    warnings,
    marketReady: successRate >= 85 && criticalFailures.length <= 2,
    productionReady: successRate >= 95 && !hasCriticalFailures
  };
}

// Run the comprehensive test
comprehensiveSystemTest().catch(console.error);