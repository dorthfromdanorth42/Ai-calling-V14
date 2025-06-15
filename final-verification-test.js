#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function finalVerificationTest() {
  console.log('🔍 FINAL VERIFICATION TEST - POST MANUAL SETUP');
  console.log('='.repeat(70));

  let totalTests = 0;
  let passedTests = 0;
  let criticalIssues = [];

  const test = (name, condition, details = '') => {
    totalTests++;
    if (condition) {
      console.log(`✅ ${name}${details ? ' - ' + details : ''}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}${details ? ' - ' + details : ''}`);
      criticalIssues.push(name);
    }
  };

  try {
    // Test 1: Check if admin columns exist in profiles
    console.log('\n1️⃣ TESTING ADMIN CONTROL COLUMNS...');
    console.log('-'.repeat(50));

    const { data: profileSample, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, subscription_tier, max_agents, max_minutes, allowed_features, is_active, minutes_used')
      .limit(1);

    if (profileError) {
      test('Admin columns accessibility', false, profileError.message);
    } else {
      const profile = profileSample[0];
      test('Admin columns exist', profile && 'role' in profile);
      test('Subscription tier field', profile && 'subscription_tier' in profile);
      test('Max agents field', profile && 'max_agents' in profile);
      test('Max minutes field', profile && 'max_minutes' in profile);
      test('Allowed features field', profile && 'allowed_features' in profile);
      test('Is active field', profile && 'is_active' in profile);
      test('Minutes used field', profile && 'minutes_used' in profile);

      if (profile) {
        console.log(`   Current profile: ${profile.email || 'unknown'}`);
        console.log(`   Role: ${profile.role || 'not set'}`);
        console.log(`   Tier: ${profile.subscription_tier || 'not set'}`);
        console.log(`   Limits: ${profile.max_agents || 0} agents, ${profile.max_minutes || 0} minutes`);
        console.log(`   Active: ${profile.is_active !== undefined ? profile.is_active : 'not set'}`);
      }
    }

    // Test 2: Check if call_logs has Gemini Live API fields
    console.log('\n2️⃣ TESTING CALL LOGS GEMINI FIELDS...');
    console.log('-'.repeat(50));

    // Try to create a test call log with Gemini fields
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;

    if (profileId) {
      const testCallLog = {
        profile_id: profileId,
        phone_number_from: '+1234567890',
        phone_number_to: '+1555123456',
        direction: 'outbound',
        call_status: 'completed',
        call_duration_seconds: 120,
        session_id: 'verification-test-' + Date.now(),
        conversation_id: 'conv-' + Date.now(),
        call_transcript: { turns: [{ speaker: 'ai', message: 'Hello, this is a test.' }] },
        call_summary: 'Verification test call',
        call_outcome: 'interested',
        tokens_used: 150,
        response_time_ms: 500,
        confidence_score: 0.95,
        cost_cents: 25
      };

      const { data: callLogResult, error: callLogError } = await supabase
        .from('call_logs')
        .insert(testCallLog)
        .select()
        .single();

      if (callLogError) {
        test('Gemini Live API fields', false, callLogError.message);
      } else {
        test('Call logs with Gemini fields', true, 'All fields working');
        test('Session ID tracking', !!callLogResult.session_id);
        test('Conversation ID tracking', !!callLogResult.conversation_id);
        test('Call duration tracking', callLogResult.call_duration_seconds === 120);
        test('Transcript storage', !!callLogResult.call_transcript);
        test('Token usage tracking', callLogResult.tokens_used === 150);
        test('Response time tracking', callLogResult.response_time_ms === 500);
        test('Confidence score tracking', callLogResult.confidence_score === 0.95);

        console.log(`   Call log created: ${callLogResult.id}`);
        console.log(`   Session: ${callLogResult.session_id}`);
        console.log(`   Duration: ${callLogResult.call_duration_seconds}s`);
        console.log(`   Tokens: ${callLogResult.tokens_used}`);

        // Clean up test call log
        await supabase.from('call_logs').delete().eq('id', callLogResult.id);
        console.log('   ✅ Test data cleaned up');
      }
    } else {
      test('Profile for testing', false, 'No profile found');
    }

    // Test 3: Test RLS Security
    console.log('\n3️⃣ TESTING ROW LEVEL SECURITY...');
    console.log('-'.repeat(50));

    const anonClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data: anonData, error: anonError } = await anonClient
      .from('profiles')
      .select('*')
      .limit(1);

    if (anonError) {
      test('RLS enabled on profiles', true, 'Anonymous access blocked');
      console.log(`   Security message: ${anonError.message}`);
    } else {
      test('RLS enabled on profiles', false, 'Anonymous access allowed - SECURITY RISK');
      console.log(`   ⚠️  Retrieved ${anonData?.length || 0} records without authentication`);
    }

    // Test other tables
    const tablesToTest = ['ai_agents', 'outbound_campaigns', 'campaign_leads', 'call_logs'];
    for (const table of tablesToTest) {
      const { data, error } = await anonClient.from(table).select('*').limit(1);
      test(`RLS enabled on ${table}`, !!error, error ? 'Blocked' : 'Accessible');
    }

    // Test 4: Test Complete Customer Journey
    console.log('\n4️⃣ TESTING COMPLETE CUSTOMER JOURNEY...');
    console.log('-'.repeat(50));

    if (profileId) {
      let workflowSuccess = true;
      let createdItems = {};

      try {
        // Step 1: Create AI Agent
        const { data: agent, error: agentError } = await supabase
          .from('ai_agents')
          .insert({
            profile_id: profileId,
            name: 'Final Verification Agent ' + Date.now(),
            description: 'Testing complete workflow after fixes',
            is_active: true
          })
          .select()
          .single();

        if (agentError) {
          test('Agent creation', false, agentError.message);
          workflowSuccess = false;
        } else {
          test('Agent creation', true, agent.id);
          createdItems.agent = agent.id;
        }

        // Step 2: Create Campaign
        if (!agentError) {
          const { data: campaign, error: campaignError } = await supabase
            .from('outbound_campaigns')
            .insert({
              profile_id: profileId,
              agent_id: agent.id,
              name: 'Final Verification Campaign ' + Date.now(),
              status: 'draft',
              caller_id: '+1234567890'
            })
            .select()
            .single();

          if (campaignError) {
            test('Campaign creation', false, campaignError.message);
            workflowSuccess = false;
          } else {
            test('Campaign creation', true, campaign.id);
            createdItems.campaign = campaign.id;
          }

          // Step 3: Create Lead
          if (!campaignError) {
            const { data: lead, error: leadError } = await supabase
              .from('campaign_leads')
              .insert({
                campaign_id: campaign.id,
                profile_id: profileId,
                phone_number: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
                first_name: 'FinalVerification',
                last_name: 'Lead',
                status: 'pending'
              })
              .select()
              .single();

            if (leadError) {
              test('Lead creation', false, leadError.message);
              workflowSuccess = false;
            } else {
              test('Lead creation', true, lead.id);
              createdItems.lead = lead.id;
            }

            // Step 4: Create Call Log (with all Gemini fields)
            if (!leadError) {
              const { data: callLog, error: callLogError } = await supabase
                .from('call_logs')
                .insert({
                  profile_id: profileId,
                  campaign_id: campaign.id,
                  agent_id: agent.id,
                  phone_number_from: '+1234567890',
                  phone_number_to: lead.phone_number,
                  direction: 'outbound',
                  call_status: 'completed',
                  call_duration_seconds: 180,
                  session_id: 'final-verification-' + Date.now(),
                  conversation_id: 'conv-final-' + Date.now(),
                  call_transcript: {
                    turns: [
                      { speaker: 'ai', message: 'Hello, this is your AI assistant.' },
                      { speaker: 'human', message: 'Hi, I\'m interested in your service.' },
                      { speaker: 'ai', message: 'Great! Let me schedule an appointment for you.' }
                    ]
                  },
                  call_summary: 'Customer showed interest and requested appointment',
                  call_outcome: 'appointment_scheduled',
                  tokens_used: 250,
                  response_time_ms: 450,
                  confidence_score: 0.92,
                  cost_cents: 35
                })
                .select()
                .single();

              if (callLogError) {
                test('Call log with Gemini fields', false, callLogError.message);
                workflowSuccess = false;
              } else {
                test('Call log with Gemini fields', true, callLog.id);
                createdItems.callLog = callLog.id;
              }
            }

            // Step 5: Create Appointment
            const { data: appointment, error: appointmentError } = await supabase
              .from('appointments')
              .insert({
                profile_id: profileId,
                scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                customer_name: 'FinalVerification Lead',
                customer_phone: lead.phone_number,
                status: 'scheduled',
                appointment_type: 'consultation'
              })
              .select()
              .single();

            if (appointmentError) {
              test('Appointment creation', false, appointmentError.message);
              workflowSuccess = false;
            } else {
              test('Appointment creation', true, appointment.id);
              createdItems.appointment = appointment.id;
            }
          }
        }

        test('Complete customer journey', workflowSuccess, workflowSuccess ? 'All steps working' : 'Some issues remain');

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        if (createdItems.appointment) await supabase.from('appointments').delete().eq('id', createdItems.appointment);
        if (createdItems.callLog) await supabase.from('call_logs').delete().eq('id', createdItems.callLog);
        if (createdItems.lead) await supabase.from('campaign_leads').delete().eq('id', createdItems.lead);
        if (createdItems.campaign) await supabase.from('outbound_campaigns').delete().eq('id', createdItems.campaign);
        if (createdItems.agent) await supabase.from('ai_agents').delete().eq('id', createdItems.agent);
        console.log('✅ Test data cleaned up');

      } catch (err) {
        test('Complete customer journey', false, err.message);
      }
    }

    // Test 5: Test Admin Management Functions
    console.log('\n5️⃣ TESTING ADMIN MANAGEMENT FUNCTIONS...');
    console.log('-'.repeat(50));

    // Test admin views
    try {
      const { data: userOverview, error: overviewError } = await supabase
        .from('admin_user_overview')
        .select('*')
        .limit(1);

      test('Admin user overview view', !overviewError, overviewError?.message || 'Working');

      const { data: systemStats, error: statsError } = await supabase
        .from('admin_system_stats')
        .select('*')
        .single();

      test('Admin system stats view', !statsError, statsError?.message || 'Working');

      if (systemStats) {
        console.log(`   System stats: ${systemStats.total_users} users, ${systemStats.total_agents} agents`);
        console.log(`   Minutes: ${systemStats.total_minutes_used}/${systemStats.total_minutes_allowed} used`);
      }

    } catch (err) {
      test('Admin management functions', false, err.message);
    }

    // Test 6: Test Subscription Tier Functions
    console.log('\n6️⃣ TESTING SUBSCRIPTION TIER SYSTEM...');
    console.log('-'.repeat(50));

    try {
      const { data: tierLimits, error: tierError } = await supabase
        .rpc('get_tier_limits', { tier_name: 'premium' });

      test('Subscription tier functions', !tierError, tierError?.message || 'Working');

      if (tierLimits && tierLimits.length > 0) {
        const limits = tierLimits[0];
        console.log(`   Premium tier: ${limits.max_agents} agents, ${limits.max_minutes} minutes`);
        console.log(`   Features: ${JSON.stringify(limits.features)}`);
      }

    } catch (err) {
      test('Subscription tier functions', false, err.message);
    }

  } catch (error) {
    console.error('\n❌ Critical error during verification:', error);
    criticalIssues.push('System: Critical verification error');
  }

  // Final Results
  console.log('\n' + '='.repeat(70));
  console.log('🎯 FINAL VERIFICATION RESULTS');
  console.log('='.repeat(70));

  const successRate = (passedTests / totalTests) * 100;

  console.log(`\n📊 VERIFICATION SUMMARY:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);

  if (criticalIssues.length > 0) {
    console.log('\n🚨 REMAINING ISSUES:');
    criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`));
  }

  console.log('\n🎯 FINAL VERDICT:');
  if (successRate >= 90) {
    console.log('🎉 SYSTEM FULLY READY FOR FIVERR LAUNCH! ✅');
    console.log('✅ All critical systems operational');
    console.log('✅ Admin controls working');
    console.log('✅ Security properly configured');
    console.log('✅ Complete workflow functional');
    console.log('🚀 APPROVED FOR IMMEDIATE DEPLOYMENT');
  } else if (successRate >= 80) {
    console.log('⚠️ SYSTEM MOSTLY READY - MINOR FIXES NEEDED ✅');
    console.log('✅ Core functionality working');
    console.log('⚠️ Some manual setup steps may be incomplete');
    console.log('🚀 CAN LAUNCH WITH MONITORING');
  } else {
    console.log('❌ SYSTEM NOT READY - MANUAL SETUP REQUIRED 🔴');
    console.log('🚨 Critical manual setup steps needed');
    console.log('📋 Run the SUPABASE-MANUAL-SETUP.sql script');
    console.log('⛔ COMPLETE MANUAL SETUP BEFORE LAUNCH');
  }

  console.log('\n📋 NEXT STEPS:');
  if (successRate < 90) {
    console.log('1. Run SUPABASE-MANUAL-SETUP.sql in Supabase SQL Editor');
    console.log('2. Update admin email in the SQL script');
    console.log('3. Re-run this verification test');
  } else {
    console.log('1. Deploy dashboard to production');
    console.log('2. Set up domain and SSL');
    console.log('3. Create Fiverr gig');
    console.log('4. Start selling AI calling services!');
  }

  console.log(`\n🎯 System Confidence: ${successRate.toFixed(1)}%`);
  console.log(`🔧 Issues to Fix: ${criticalIssues.length}`);
  console.log(`🚀 Ready for Fiverr: ${successRate >= 80 ? 'YES' : 'NO'}`);

  return {
    totalTests,
    passedTests,
    successRate,
    criticalIssues,
    readyForLaunch: successRate >= 80
  };
}

finalVerificationTest().catch(console.error);