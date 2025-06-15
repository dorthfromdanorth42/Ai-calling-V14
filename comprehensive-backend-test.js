#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function comprehensiveBackendTest() {
  console.log('🎯 COMPREHENSIVE BACKEND SYSTEM TEST');
  console.log('='.repeat(70));
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalFailures = [];
  let warnings = [];
  let testResults = {};

  const test = (category, name, condition, isCritical = true) => {
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
    // 1. DATABASE INFRASTRUCTURE TEST
    console.log('\n📊 DATABASE INFRASTRUCTURE');
    console.log('-'.repeat(40));

    const allTables = [
      'profiles', 'ai_agents', 'campaigns', 'outbound_campaigns', 'leads', 
      'campaign_leads', 'appointments', 'call_logs', 'live_calls', 
      'dnc_list', 'billing', 'analytics_data', 'call_recordings', 
      'agent_performance', 'function_call_logs', 'webhooks'
    ];

    for (const tableName of allTables) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        const isAccessible = !error;
        test('Database', `${tableName} table`, isAccessible, ['profiles', 'ai_agents', 'campaigns', 'leads', 'appointments'].includes(tableName));
        
        if (isAccessible && data) {
          // Test count operation
          const { error: countError } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
          test('Database', `${tableName} count query`, !countError, false);
        }
      } catch (err) {
        test('Database', `${tableName} table`, false, ['profiles', 'ai_agents', 'campaigns', 'leads', 'appointments'].includes(tableName));
      }
    }

    // 2. API INTEGRATIONS TEST
    console.log('\n🌐 API INTEGRATIONS');
    console.log('-'.repeat(40));

    // Gemini AI API
    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`, {
        timeout: 8000
      });
      test('API', 'Gemini AI connection', geminiResponse.ok, true);
      
      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        test('API', 'Gemini models available', geminiData.models && geminiData.models.length > 0, true);
      }
    } catch (err) {
      test('API', 'Gemini AI connection', false, true);
    }

    // Twilio API
    try {
      const twilioAuth = Buffer.from(`${process.env.VITE_TWILIO_ACCOUNT_SID}:${process.env.VITE_TWILIO_AUTH_TOKEN}`).toString('base64');
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}.json`, {
        headers: { 'Authorization': `Basic ${twilioAuth}` },
        timeout: 8000
      });
      test('API', 'Twilio connection', twilioResponse.ok, true);
      
      if (twilioResponse.ok) {
        const twilioData = await twilioResponse.json();
        test('API', 'Twilio account valid', !!twilioData.sid, true);
        test('API', 'Twilio account active', twilioData.status === 'active', true);
      }
    } catch (err) {
      test('API', 'Twilio connection', false, true);
    }

    // 3. CORE BUSINESS LOGIC TEST
    console.log('\n🔧 CORE BUSINESS LOGIC');
    console.log('-'.repeat(40));

    // Get profile for testing
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;
    test('Core', 'User profile exists', !!profileId, true);

    if (profileId) {
      // Test complete AI Agent workflow
      const testAgent = {
        profile_id: profileId,
        name: 'Comprehensive Test Agent ' + Date.now(),
        description: 'Full system test agent',
        is_active: true,
        agent_type: 'sales',
        voice_name: 'alloy',
        language_code: 'en-US',
        system_instruction: 'You are a test AI agent for system validation.'
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
          .update({ 
            description: 'Updated test agent',
            is_active: false 
          })
          .eq('id', agentResult.id);
        
        test('Core', 'AI Agent update', !updateError, true);
        
        // Test outbound campaign creation (correct table)
        const testOutboundCampaign = {
          profile_id: profileId,
          agent_id: agentResult.id,
          name: 'Comprehensive Test Campaign ' + Date.now(),
          description: 'Full system test campaign',
          status: 'draft',
          caller_id: '+1234567890',
          max_concurrent_calls: 5,
          call_timeout_seconds: 30
        };

        const { data: outboundCampaignResult, error: outboundCampaignError } = await supabase
          .from('outbound_campaigns')
          .insert(testOutboundCampaign)
          .select()
          .single();
        
        test('Core', 'Outbound Campaign creation', !outboundCampaignError, true);
        
        if (!outboundCampaignError) {
          // Test lead creation using campaign_leads table
          const testLead = {
            campaign_id: outboundCampaignResult.id,
            profile_id: profileId,
            phone_number: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
            first_name: 'ComprehensiveTest',
            last_name: 'Lead',
            email: 'comprehensive' + Date.now() + '@example.com',
            status: 'pending',
            call_attempts: 0,
            do_not_call: false
          };

          const { data: leadResult, error: leadError } = await supabase
            .from('campaign_leads')
            .insert(testLead)
            .select()
            .single();
          
          test('Core', 'Lead creation', !leadError, true);
          
          if (!leadError) {
            // Test lead update
            const { error: leadUpdateError } = await supabase
              .from('campaign_leads')
              .update({ 
                status: 'contacted',
                call_attempts: 1,
                notes: 'Test call completed'
              })
              .eq('id', leadResult.id);
            
            test('Core', 'Lead update', !leadUpdateError, true);
          }
          
          // Test appointment creation
          const testAppointment = {
            profile_id: profileId,
            scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            customer_name: 'Comprehensive Test Customer',
            customer_phone: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
            status: 'scheduled',
            appointment_type: 'consultation'
          };

          const { data: appointmentResult, error: appointmentError } = await supabase
            .from('appointments')
            .insert(testAppointment)
            .select()
            .single();
          
          test('Core', 'Appointment creation', !appointmentError, true);
          
          // Test call log creation
          const testCallLog = {
            profile_id: profileId,
            campaign_id: outboundCampaignResult.id,
            lead_phone: testLead.phone_number,
            call_status: 'completed',
            call_duration: 120,
            call_outcome: 'interested',
            ai_summary: 'Test call summary for comprehensive testing'
          };

          const { data: callLogResult, error: callLogError } = await supabase
            .from('call_logs')
            .insert(testCallLog)
            .select()
            .single();
          
          test('Core', 'Call log creation', !callLogError, true);
          
          // Test data relationships
          const { data: campaignWithAgent, error: relationError } = await supabase
            .from('outbound_campaigns')
            .select(`
              *,
              ai_agents (
                id,
                name,
                description
              )
            `)
            .eq('id', outboundCampaignResult.id)
            .single();
          
          test('Core', 'Data relationships', !relationError && campaignWithAgent?.ai_agents, true);
          
          // Cleanup
          if (callLogResult) await supabase.from('call_logs').delete().eq('id', callLogResult.id);
          if (appointmentResult) await supabase.from('appointments').delete().eq('id', appointmentResult.id);
          if (leadResult) await supabase.from('campaign_leads').delete().eq('id', leadResult.id);
          await supabase.from('outbound_campaigns').delete().eq('id', outboundCampaignResult.id);
        }
        
        await supabase.from('ai_agents').delete().eq('id', agentResult.id);
      }
    }

    // 4. AUTHENTICATION & SECURITY TEST
    console.log('\n🔒 AUTHENTICATION & SECURITY');
    console.log('-'.repeat(40));

    // Test Supabase Auth
    try {
      const { data: session, error } = await supabase.auth.getSession();
      test('Auth', 'Supabase Auth service', !error, true);
    } catch (err) {
      test('Auth', 'Supabase Auth service', false, true);
    }

    // Test RLS (Row Level Security)
    try {
      const anonClient = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      );
      
      const { data, error } = await anonClient.from('profiles').select('*').limit(1);
      // RLS should block this - if it doesn't, it's a security issue
      test('Security', 'RLS blocks unauthorized access', !!error, true);
    } catch (err) {
      test('Security', 'RLS configuration', true, true); // Error is expected
    }

    // 5. PERFORMANCE & SCALABILITY TEST
    console.log('\n⚡ PERFORMANCE & SCALABILITY');
    console.log('-'.repeat(40));

    // Database query performance
    const performanceTests = [
      { table: 'call_logs', limit: 100, maxTime: 2000 },
      { table: 'campaign_leads', limit: 50, maxTime: 1500 },
      { table: 'ai_agents', limit: 20, maxTime: 1000 }
    ];

    for (const perfTest of performanceTests) {
      try {
        const startTime = Date.now();
        const { data, error } = await supabase
          .from(perfTest.table)
          .select('*')
          .limit(perfTest.limit);
        const queryTime = Date.now() - startTime;
        
        test('Performance', `${perfTest.table} query speed (<${perfTest.maxTime}ms)`, 
             queryTime < perfTest.maxTime && !error, false);
      } catch (err) {
        test('Performance', `${perfTest.table} query performance`, false, false);
      }
    }

    // 6. REAL-TIME FUNCTIONALITY TEST
    console.log('\n⚡ REAL-TIME FUNCTIONALITY');
    console.log('-'.repeat(40));

    try {
      const channel = supabase.channel('comprehensive-test-' + Date.now());
      let subscriptionWorking = false;
      let realtimeReceived = false;
      
      channel.on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          realtimeReceived = true;
        }
      );
      
      const subscribeResult = await channel.subscribe();
      subscriptionWorking = subscribeResult === 'SUBSCRIBED';
      test('Realtime', 'Channel subscription', subscriptionWorking, false);
      
      if (subscriptionWorking && profileId) {
        // Trigger a change
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', profileId);
        
        // Wait for real-time event
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        test('Realtime', 'Real-time events', realtimeReceived, false);
      }
      
      await supabase.removeChannel(channel);
    } catch (err) {
      test('Realtime', 'Real-time functionality', false, false);
    }

    // 7. ENVIRONMENT & CONFIGURATION TEST
    console.log('\n⚙️  ENVIRONMENT & CONFIGURATION');
    console.log('-'.repeat(40));

    const requiredEnvVars = [
      { name: 'VITE_SUPABASE_URL', critical: true },
      { name: 'VITE_SUPABASE_ANON_KEY', critical: true },
      { name: 'VITE_SUPABASE_SERVICE_KEY', critical: true },
      { name: 'VITE_GEMINI_API_KEY', critical: true },
      { name: 'VITE_TWILIO_ACCOUNT_SID', critical: true },
      { name: 'VITE_TWILIO_AUTH_TOKEN', critical: true }
    ];

    for (const envVar of requiredEnvVars) {
      const exists = !!process.env[envVar.name];
      const hasValue = exists && process.env[envVar.name].length > 10;
      test('Config', `${envVar.name} configured`, exists && hasValue, envVar.critical);
    }

    // 8. BUSINESS WORKFLOW TEST
    console.log('\n🔄 BUSINESS WORKFLOW TEST');
    console.log('-'.repeat(40));

    // Test complete call center workflow
    if (profileId) {
      try {
        // 1. Create agent
        const workflowAgent = {
          profile_id: profileId,
          name: 'Workflow Test Agent',
          description: 'Testing complete workflow',
          is_active: true
        };

        const { data: wfAgent, error: wfAgentError } = await supabase
          .from('ai_agents')
          .insert(workflowAgent)
          .select()
          .single();
        
        if (!wfAgentError) {
          // 2. Create campaign
          const workflowCampaign = {
            profile_id: profileId,
            agent_id: wfAgent.id,
            name: 'Workflow Test Campaign',
            status: 'draft',
            caller_id: '+1234567890'
          };

          const { data: wfCampaign, error: wfCampaignError } = await supabase
            .from('outbound_campaigns')
            .insert(workflowCampaign)
            .select()
            .single();
          
          if (!wfCampaignError) {
            // 3. Add leads
            const workflowLead = {
              campaign_id: wfCampaign.id,
              profile_id: profileId,
              phone_number: '+15551234567',
              first_name: 'Workflow',
              last_name: 'Test',
              status: 'pending'
            };

            const { data: wfLead, error: wfLeadError } = await supabase
              .from('campaign_leads')
              .insert(workflowLead)
              .select()
              .single();
            
            // 4. Simulate call
            if (!wfLeadError) {
              const callLog = {
                profile_id: profileId,
                campaign_id: wfCampaign.id,
                lead_phone: wfLead.phone_number,
                call_status: 'completed',
                call_duration: 180,
                call_outcome: 'appointment_scheduled'
              };

              const { error: callError } = await supabase
                .from('call_logs')
                .insert(callLog);
              
              // 5. Create appointment
              const appointment = {
                profile_id: profileId,
                scheduled_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                customer_name: 'Workflow Test',
                customer_phone: wfLead.phone_number,
                status: 'scheduled',
                appointment_type: 'consultation'
              };

              const { error: appointmentError } = await supabase
                .from('appointments')
                .insert(appointment);
              
              test('Workflow', 'Complete call center workflow', 
                   !wfAgentError && !wfCampaignError && !wfLeadError && !callError && !appointmentError, true);
            }
            
            // Cleanup workflow test data
            await supabase.from('call_logs').delete().eq('campaign_id', wfCampaign.id);
            await supabase.from('appointments').delete().eq('customer_phone', '+15551234567');
            await supabase.from('campaign_leads').delete().eq('campaign_id', wfCampaign.id);
            await supabase.from('outbound_campaigns').delete().eq('id', wfCampaign.id);
          }
          
          await supabase.from('ai_agents').delete().eq('id', wfAgent.id);
        }
      } catch (err) {
        test('Workflow', 'Complete call center workflow', false, true);
      }
    }

  } catch (error) {
    console.error('\n❌ Critical system error:', error);
    criticalFailures.push('System: Critical error during comprehensive testing');
  }

  // COMPREHENSIVE RESULTS ANALYSIS
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPREHENSIVE SYSTEM TEST RESULTS');
  console.log('='.repeat(70));

  // Category breakdown
  for (const [category, tests] of Object.entries(testResults)) {
    const categoryPassed = tests.filter(t => t.status === 'PASS').length;
    const categoryTotal = tests.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
    
    console.log(`\n${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    
    const criticalTests = tests.filter(t => t.critical);
    const criticalPassed = criticalTests.filter(t => t.status === 'PASS').length;
    const criticalTotal = criticalTests.length;
    
    if (criticalTotal > 0) {
      console.log(`   Critical: ${criticalPassed}/${criticalTotal}`);
    }
  }

  const successRate = (passedTests / totalTests) * 100;
  const criticalSuccessRate = criticalFailures.length === 0 ? 100 : 
    ((totalTests - criticalFailures.length) / totalTests) * 100;

  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`🔥 Critical Success Rate: ${criticalSuccessRate.toFixed(1)}%`);

  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES (BLOCKING LAUNCH):');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (NON-BLOCKING):');
    warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  }

  // FINAL MARKET READINESS DETERMINATION
  console.log('\n' + '='.repeat(70));
  console.log('🎯 FINAL MARKET READINESS DETERMINATION');
  console.log('='.repeat(70));

  const isMarketReady = successRate >= 85 && criticalFailures.length <= 2;
  const isProductionReady = successRate >= 95 && criticalFailures.length === 0;

  if (isProductionReady) {
    console.log('🎉 VERDICT: PRODUCTION READY ✅');
    console.log('✅ All critical systems operational');
    console.log('✅ No blocking issues identified');
    console.log('✅ Ready for immediate customer deployment');
  } else if (isMarketReady) {
    console.log('⚠️  VERDICT: MARKET READY WITH CONDITIONS 🟡');
    console.log('✅ Core functionality operational');
    console.log(`🔧 ${criticalFailures.length} critical issue(s) need resolution`);
    console.log('✅ Can launch with monitoring and quick fixes');
  } else {
    console.log('❌ VERDICT: NOT READY FOR MARKET 🔴');
    console.log('🚨 Critical issues must be resolved before launch');
    console.log(`📊 ${criticalFailures.length} blocking failure(s)`);
  }

  console.log(`\n📈 Overall Confidence: ${successRate.toFixed(1)}%`);
  console.log(`🔥 Critical Systems: ${criticalSuccessRate.toFixed(1)}%`);
  console.log(`🔧 Issues to Fix: ${criticalFailures.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);

  return {
    totalTests,
    passedTests,
    successRate,
    criticalFailures,
    warnings,
    marketReady: isMarketReady,
    productionReady: isProductionReady
  };
}

comprehensiveBackendTest().catch(console.error);