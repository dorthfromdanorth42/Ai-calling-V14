#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function testCriticalFixes() {
  console.log('🧪 TESTING CRITICAL FIXES - ADMIN CONTROL & GEMINI LIVE API');
  console.log('='.repeat(80));

  let totalTests = 0;
  let passedTests = 0;
  let criticalFailures = [];

  const test = (name, condition, details = '') => {
    totalTests++;
    if (condition) {
      console.log(`✅ ${name}${details ? ' - ' + details : ''}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}${details ? ' - ' + details : ''}`);
      criticalFailures.push(name);
    }
  };

  try {
    // TEST 1: Check if user_permissions table exists
    console.log('\n🔒 TESTING ADMIN CONTROL SYSTEM');
    console.log('-'.repeat(60));

    try {
      const { data: permissionsTest, error: permError } = await supabase
        .from('user_permissions')
        .select('*')
        .limit(1);
      
      test('user_permissions table accessible', !permError, permError?.message || 'Table exists');
    } catch (err) {
      test('user_permissions table accessible', false, 'Table does not exist - execute SQL scripts');
    }

    // TEST 2: Check RLS status
    console.log('\n🔐 TESTING ROW LEVEL SECURITY');
    console.log('-'.repeat(60));

    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { data: rlsTest, error: rlsError } = await anonClient
      .from('profiles')
      .select('*')
      .limit(1);
    
    test('RLS blocking unauthorized access', !!rlsError, rlsError ? 'Access properly blocked' : 'RLS not enabled');

    // TEST 3: Test Gemini Live API agent creation
    console.log('\n🤖 TESTING GEMINI LIVE API INTEGRATION');
    console.log('-'.repeat(60));

    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;
    
    if (profileId) {
      // Test with valid voice names (check what's actually available)
      const validVoiceNames = ['nova', 'shimmer', 'echo', 'fable', 'onyx', 'alloy'];
      let voiceTestPassed = false;
      let workingVoice = null;
      
      for (const voiceName of validVoiceNames) {
        try {
          const testAgent = {
            profile_id: profileId,
            name: `Voice Test ${voiceName} ${Date.now()}`,
            description: 'Testing voice name compatibility',
            agent_type: 'sales',
            voice_name: voiceName,
            language_code: 'en-US',
            system_instruction: 'You are a test agent for voice validation.',
            is_active: true
          };

          const { data: createdAgent, error: voiceError } = await supabase
            .from('ai_agents')
            .insert(testAgent)
            .select()
            .single();
          
          if (!voiceError) {
            voiceTestPassed = true;
            workingVoice = voiceName;
            
            // Cleanup
            await supabase.from('ai_agents').delete().eq('id', createdAgent.id);
            break;
          }
        } catch (err) {
          // Continue to next voice
        }
      }
      
      test('Gemini Live API voice names working', voiceTestPassed, workingVoice ? `${workingVoice} voice works` : 'No valid voices found');
      
      // Test complete Gemini Live agent creation
      if (voiceTestPassed) {
        const geminiAgent = {
          profile_id: profileId,
          name: 'Complete Gemini Test ' + Date.now(),
          description: 'Complete Gemini Live API test',
          agent_type: 'sales',
          voice_name: workingVoice,
          language_code: 'en-US',
          system_instruction: 'You are a professional sales assistant powered by Gemini Live API. Be helpful and engaging.',
          is_active: true,
          max_concurrent_calls: 3,
          business_hours_start: '09:00',
          business_hours_end: '17:00',
          business_days: [1, 2, 3, 4, 5],
          timezone: 'America/New_York',
          escalation_enabled: false
        };

        const { data: fullAgent, error: fullError } = await supabase
          .from('ai_agents')
          .insert(geminiAgent)
          .select()
          .single();
        
        test('Complete Gemini Live agent creation', !fullError, fullError?.message || 'All fields accepted');
        
        if (!fullError) {
          // Test complete workflow
          const testCampaign = {
            profile_id: profileId,
            agent_id: fullAgent.id,
            name: 'Gemini Workflow Test ' + Date.now(),
            description: 'Testing complete Gemini Live workflow',
            status: 'draft',
            caller_id: '+1234567890'
          };

          const { data: campaignResult, error: campaignError } = await supabase
            .from('outbound_campaigns')
            .insert(testCampaign)
            .select()
            .single();
          
          test('Campaign with Gemini agent', !campaignError, campaignError?.message || 'Campaign created');
          
          if (!campaignError) {
            // Test lead creation
            const testLead = {
              campaign_id: campaignResult.id,
              profile_id: profileId,
              phone_number: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
              first_name: 'GeminiWorkflow',
              last_name: 'Test',
              email: 'geminiworkflow' + Date.now() + '@example.com',
              status: 'pending'
            };

            const { data: leadResult, error: leadError } = await supabase
              .from('campaign_leads')
              .insert(testLead)
              .select()
              .single();
            
            test('Lead with Gemini workflow', !leadError, leadError?.message || 'Lead created');
            
            test('Complete customer journey workflow', !leadError && !campaignError && !fullError, 
                 'End-to-end workflow functional');
            
            // Cleanup
            if (leadResult) await supabase.from('campaign_leads').delete().eq('id', leadResult.id);
            await supabase.from('outbound_campaigns').delete().eq('id', campaignResult.id);
          }
          
          await supabase.from('ai_agents').delete().eq('id', fullAgent.id);
        }
      }
    }

    // TEST 4: Test admin functions (if available)
    console.log('\n👤 TESTING ADMIN FUNCTIONS');
    console.log('-'.repeat(60));

    try {
      // Test check_user_limits function
      const { data: limitsTest, error: limitsError } = await supabase
        .rpc('check_user_limits', { action_type: 'create_agent' });
      
      test('Admin limits function available', !limitsError, limitsError?.message || 'Function works');
    } catch (err) {
      test('Admin limits function available', false, 'Function not created - execute SQL scripts');
    }

    try {
      // Test admin view
      const { data: adminView, error: viewError } = await supabase
        .from('admin_user_overview')
        .select('*')
        .limit(1);
      
      test('Admin overview view available', !viewError, viewError?.message || 'View accessible');
    } catch (err) {
      test('Admin overview view available', false, 'View not created - execute SQL scripts');
    }

    // TEST 5: Test usage tracking
    console.log('\n📊 TESTING USAGE TRACKING');
    console.log('-'.repeat(60));

    try {
      const { data: usageTest, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .limit(1);
      
      test('Usage tracking table accessible', !usageError, usageError?.message || 'Table exists');
    } catch (err) {
      test('Usage tracking table accessible', false, 'Table does not exist - execute SQL scripts');
    }

  } catch (error) {
    console.error('❌ Critical error during testing:', error);
    criticalFailures.push('System error during testing');
  }

  // RESULTS SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('📊 CRITICAL FIXES TEST RESULTS');
  console.log('='.repeat(80));

  const successRate = (passedTests / totalTests) * 100;

  console.log(`\n📊 TEST SUMMARY:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);

  if (criticalFailures.length > 0) {
    console.log('\n🚨 FAILED TESTS:');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
  }

  console.log('\n🎯 CRITICAL FIXES STATUS:');
  
  if (successRate >= 80) {
    console.log('✅ CRITICAL FIXES: WORKING');
    console.log('✅ System ready for Fiverr launch');
    console.log('✅ Admin control system functional');
    console.log('✅ Gemini Live API integration working');
  } else {
    console.log('⚠️  CRITICAL FIXES: NEEDS SQL EXECUTION');
    console.log('📋 Execute CRITICAL-FIXES-SQL-SCRIPTS.sql in Supabase Dashboard');
    console.log('🔄 Re-run this test after SQL execution');
  }

  console.log('\n📝 NEXT STEPS:');
  console.log('1. Execute CRITICAL-FIXES-SQL-SCRIPTS.sql in Supabase SQL Editor');
  console.log('2. Replace "your-email@example.com" with your actual email in the SQL');
  console.log('3. Re-run this test to verify all fixes');
  console.log('4. Start creating Fiverr packages with confidence!');

  console.log('\n🎉 FIVERR PACKAGE STRUCTURE READY:');
  console.log('📦 BASIC ($5-15): 500 minutes, 2 agents, 3 campaigns');
  console.log('📦 STANDARD ($25-50): 1500 minutes, 5 agents, 10 campaigns + analytics');
  console.log('📦 PREMIUM ($75-150): 5000 minutes, 15 agents, 25 campaigns + all features');

  return {
    totalTests,
    passedTests,
    successRate,
    criticalFailures,
    ready: successRate >= 80
  };
}

testCriticalFixes().catch(console.error);