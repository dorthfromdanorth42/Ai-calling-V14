#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function criticalFunctionalityTest() {
  console.log('🎯 CRITICAL FUNCTIONALITY TEST - MARKET READINESS VALIDATION');
  console.log('='.repeat(70));
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalFailures = [];
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
      }
    }
  };

  try {
    // 1. CORE DATABASE FUNCTIONALITY
    console.log('\n📊 CORE DATABASE FUNCTIONALITY');
    console.log('-'.repeat(40));

    const criticalTables = ['profiles', 'ai_agents', 'campaigns', 'leads', 'appointments', 'call_logs'];
    
    for (const tableName of criticalTables) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1);
        test('Database', `${tableName} table accessible`, !error, true);
      } catch (err) {
        test('Database', `${tableName} table accessible`, false, true);
      }
    }

    // 2. AUTHENTICATION & SECURITY
    console.log('\n🔒 AUTHENTICATION & SECURITY');
    console.log('-'.repeat(40));

    try {
      const { data: session, error } = await supabase.auth.getSession();
      test('Auth', 'Supabase Auth service', !error, true);
    } catch (err) {
      test('Auth', 'Supabase Auth service', false, true);
    }

    // Test RLS policies
    try {
      const anonClient = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      );
      
      const { data, error } = await anonClient.from('profiles').select('*').limit(1);
      test('Security', 'Row Level Security active', !!error, true);
    } catch (err) {
      test('Security', 'RLS policy test', false, true);
    }

    // 3. API INTEGRATIONS
    console.log('\n🌐 API INTEGRATIONS');
    console.log('-'.repeat(40));

    // Test Gemini API
    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`, {
        timeout: 5000
      });
      test('API', 'Gemini AI API connection', geminiResponse.ok, true);
    } catch (err) {
      test('API', 'Gemini AI API connection', false, true);
    }

    // Test Twilio API
    try {
      const twilioAuth = Buffer.from(`${process.env.VITE_TWILIO_ACCOUNT_SID}:${process.env.VITE_TWILIO_AUTH_TOKEN}`).toString('base64');
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}.json`, {
        headers: { 'Authorization': `Basic ${twilioAuth}` },
        timeout: 5000
      });
      test('API', 'Twilio API connection', twilioResponse.ok, true);
    } catch (err) {
      test('API', 'Twilio API connection', false, true);
    }

    // 4. CORE BUSINESS LOGIC
    console.log('\n🔧 CORE BUSINESS LOGIC');
    console.log('-'.repeat(40));

    // Get profile for testing
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;
    test('Core', 'User profile exists', !!profileId, true);

    // Test AI Agent workflow
    if (profileId) {
      try {
        const testAgent = {
          profile_id: profileId,
          name: 'Critical Test Agent ' + Date.now(),
          description: 'Testing core functionality',
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
            .update({ description: 'Updated for testing' })
            .eq('id', agentResult.id);
          
          test('Core', 'AI Agent update', !updateError, true);
          
          // Test campaign creation with agent
          const testCampaign = {
            profile_id: profileId,
            agent_id: agentResult.id,
            name: 'Critical Test Campaign ' + Date.now(),
            description: 'Testing campaign functionality',
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
            // Test lead creation
            const { data: existingLeads } = await supabase.from('leads').select('*').limit(1);
            
            if (existingLeads && existingLeads.length > 0) {
              const sampleLead = existingLeads[0];
              const testLead = {
                ...Object.fromEntries(
                  Object.entries(sampleLead)
                    .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
                    .map(([key, value]) => {
                      if (key === 'phone_number') return [key, '+1555000' + Math.floor(Math.random() * 1000)];
                      if (key === 'first_name') return [key, 'CriticalTest'];
                      if (key === 'last_name') return [key, 'Lead'];
                      if (key === 'email') return [key, 'critical' + Date.now() + '@example.com'];
                      if (key === 'campaign_id') return [key, campaignResult.id];
                      return [key, value];
                    })
                )
              };

              const { data: leadResult, error: leadError } = await supabase
                .from('leads')
                .insert(testLead)
                .select()
                .single();
              
              test('Core', 'Lead creation', !leadError, true);
              
              // Test appointment creation
              const testAppointment = {
                profile_id: profileId,
                scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                customer_name: 'Critical Test Customer',
                customer_phone: '+1555000999',
                status: 'scheduled',
                appointment_type: 'consultation'
              };

              const { data: appointmentResult, error: appointmentError } = await supabase
                .from('appointments')
                .insert(testAppointment)
                .select()
                .single();
              
              test('Core', 'Appointment creation', !appointmentError, true);
              
              // Test data relationships
              const { data: campaignWithAgent, error: joinError } = await supabase
                .from('campaigns')
                .select(`
                  *,
                  ai_agents (
                    id,
                    name
                  )
                `)
                .eq('id', campaignResult.id)
                .single();
              
              test('Core', 'Data relationships working', !joinError && campaignWithAgent?.ai_agents, true);
              
              // Cleanup
              if (appointmentResult) await supabase.from('appointments').delete().eq('id', appointmentResult.id);
              if (leadResult) await supabase.from('leads').delete().eq('id', leadResult.id);
            }
            
            await supabase.from('campaigns').delete().eq('id', campaignResult.id);
          }
          
          await supabase.from('ai_agents').delete().eq('id', agentResult.id);
        }
      } catch (err) {
        test('Core', 'Business logic workflow', false, true);
      }
    }

    // 5. REAL-TIME FUNCTIONALITY
    console.log('\n⚡ REAL-TIME FUNCTIONALITY');
    console.log('-'.repeat(40));

    try {
      const channel = supabase.channel('critical-test-' + Date.now());
      let realtimeWorking = false;
      
      channel.on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          realtimeWorking = true;
        }
      );
      
      const subscribeResult = await channel.subscribe();
      test('Realtime', 'Channel subscription', subscribeResult === 'SUBSCRIBED', false);
      
      // Trigger a change if we have a profile
      if (profileId) {
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', profileId);
        
        // Wait for real-time event
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        test('Realtime', 'Real-time events', realtimeWorking, false);
      }
      
      await supabase.removeChannel(channel);
    } catch (err) {
      test('Realtime', 'Real-time functionality', false, false);
    }

    // 6. PERFORMANCE VALIDATION
    console.log('\n⚡ PERFORMANCE VALIDATION');
    console.log('-'.repeat(40));

    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .limit(50);
      const queryTime = Date.now() - startTime;
      
      test('Performance', 'Database query speed (<3s)', queryTime < 3000 && !error, false);
      test('Performance', 'Database responsiveness', !error, true);
    } catch (err) {
      test('Performance', 'Database performance', false, true);
    }

    // 7. ENVIRONMENT CONFIGURATION
    console.log('\n⚙️  ENVIRONMENT CONFIGURATION');
    console.log('-'.repeat(40));

    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_SERVICE_KEY',
      'VITE_GEMINI_API_KEY',
      'VITE_TWILIO_ACCOUNT_SID',
      'VITE_TWILIO_AUTH_TOKEN'
    ];

    for (const envVar of requiredEnvVars) {
      const exists = !!process.env[envVar];
      test('Config', `${envVar} configured`, exists, true);
    }

  } catch (error) {
    console.error('\n❌ Critical system error:', error);
    criticalFailures.push('System: Critical error during testing');
  }

  // RESULTS ANALYSIS
  console.log('\n' + '='.repeat(70));
  console.log('📊 CRITICAL FUNCTIONALITY TEST RESULTS');
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
  const hasCriticalFailures = criticalFailures.length > 0;

  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);

  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES:');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
  }

  // MARKET READINESS DETERMINATION
  console.log('\n' + '='.repeat(70));
  console.log('🎯 MARKET READINESS DETERMINATION');
  console.log('='.repeat(70));

  if (successRate >= 90 && criticalFailures.length === 0) {
    console.log('🎉 VERDICT: MARKET READY ✅');
    console.log('✅ All critical functionality verified');
    console.log('✅ No blocking issues identified');
    console.log('✅ System ready for production deployment');
  } else if (successRate >= 80 && criticalFailures.length <= 2) {
    console.log('⚠️  VERDICT: NEARLY READY 🟡');
    console.log('🔧 Minor critical issues need resolution');
    console.log(`📊 ${criticalFailures.length} critical issue(s) to fix`);
  } else {
    console.log('❌ VERDICT: NOT READY 🔴');
    console.log('🚨 Critical issues must be resolved');
    console.log(`📊 ${criticalFailures.length} critical failure(s)`);
  }

  console.log(`\n📈 Confidence Level: ${successRate.toFixed(1)}%`);
  console.log(`🔧 Critical Issues: ${criticalFailures.length}`);

  return {
    totalTests,
    passedTests,
    successRate,
    criticalFailures,
    marketReady: successRate >= 80 && criticalFailures.length <= 2,
    productionReady: successRate >= 90 && criticalFailures.length === 0
  };
}

criticalFunctionalityTest().catch(console.error);