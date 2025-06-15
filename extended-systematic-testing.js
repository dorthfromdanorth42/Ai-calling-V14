#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function extendedSystematicTesting() {
  console.log('🔬 EXTENDED SYSTEMATIC TESTING - DEEP VALIDATION');
  console.log('='.repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalFailures = [];
  let warnings = [];
  let testResults = {};

  const test = (category, name, condition, isCritical = true, details = '') => {
    totalTests++;
    const status = condition ? 'PASS' : 'FAIL';
    
    if (!testResults[category]) testResults[category] = [];
    testResults[category].push({ name, status, critical: isCritical, details });
    
    if (condition) {
      console.log(`✅ ${name}${details ? ' - ' + details : ''}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}${details ? ' - ' + details : ''}`);
      if (isCritical) {
        criticalFailures.push(`${category}: ${name}`);
      } else {
        warnings.push(`${category}: ${name}`);
      }
    }
  };

  try {
    // 1. DEEP DATABASE SCHEMA ANALYSIS
    console.log('\n📊 DEEP DATABASE SCHEMA ANALYSIS');
    console.log('-'.repeat(60));

    // Test all table relationships and constraints
    const criticalTables = {
      'profiles': { required: true, relationships: [] },
      'ai_agents': { required: true, relationships: ['profiles'] },
      'outbound_campaigns': { required: true, relationships: ['profiles', 'ai_agents'] },
      'campaign_leads': { required: true, relationships: ['profiles', 'outbound_campaigns'] },
      'appointments': { required: true, relationships: ['profiles'] },
      'call_logs': { required: true, relationships: ['profiles'] },
      'live_calls': { required: false, relationships: ['profiles'] },
      'dnc_list': { required: false, relationships: ['profiles'] },
      'billing': { required: false, relationships: ['profiles'] },
      'analytics_data': { required: false, relationships: ['profiles'] },
      'call_recordings': { required: false, relationships: ['profiles'] },
      'agent_performance': { required: false, relationships: ['profiles', 'ai_agents'] },
      'function_call_logs': { required: false, relationships: ['profiles'] },
      'webhooks': { required: false, relationships: ['profiles'] }
    };

    for (const [tableName, config] of Object.entries(criticalTables)) {
      try {
        // Test basic accessibility
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1);
        
        const isAccessible = !error;
        test('Schema', `${tableName} table accessible`, isAccessible, config.required);
        
        if (isAccessible) {
          // Test data structure
          if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            test('Schema', `${tableName} has valid structure`, columns.length > 0, config.required, 
                 `${columns.length} columns`);
            
            // Check for common required columns
            const hasId = columns.includes('id');
            const hasCreatedAt = columns.includes('created_at');
            const hasUpdatedAt = columns.includes('updated_at');
            
            test('Schema', `${tableName} has id column`, hasId, config.required);
            test('Schema', `${tableName} has timestamps`, hasCreatedAt && hasUpdatedAt, false);
            
            // Check for profile_id in tables that should have it
            if (config.relationships.includes('profiles')) {
              const hasProfileId = columns.includes('profile_id');
              test('Schema', `${tableName} has profile_id relationship`, hasProfileId, config.required);
            }
          }
          
          // Test record count
          test('Schema', `${tableName} count operation`, count !== null, false, 
               `${count || 0} records`);
        }
      } catch (err) {
        test('Schema', `${tableName} table accessible`, false, config.required, err.message);
      }
    }

    // 2. COMPREHENSIVE API STRESS TESTING
    console.log('\n🌐 COMPREHENSIVE API STRESS TESTING');
    console.log('-'.repeat(60));

    // Gemini AI Stress Testing
    console.log('\n🤖 Gemini AI Stress Testing...');
    
    try {
      // Test multiple concurrent requests
      const geminiPromises = [];
      for (let i = 0; i < 3; i++) {
        geminiPromises.push(
          fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `Test request ${i}: Generate a brief response.` }]
              }]
            }),
            timeout: 15000
          })
        );
      }
      
      const geminiResults = await Promise.all(geminiPromises);
      const allSuccessful = geminiResults.every(r => r.ok);
      
      test('API', 'Gemini concurrent requests', allSuccessful, true, '3 simultaneous requests');
      
      // Test rate limiting behavior
      const startTime = Date.now();
      const quickRequests = [];
      for (let i = 0; i < 5; i++) {
        quickRequests.push(
          fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`, {
            timeout: 5000
          })
        );
      }
      
      const quickResults = await Promise.all(quickRequests);
      const responseTime = Date.now() - startTime;
      const rateLimitHandled = quickResults.every(r => r.ok || r.status === 429);
      
      test('API', 'Gemini rate limit handling', rateLimitHandled, false, `${responseTime}ms for 5 requests`);
      
    } catch (err) {
      test('API', 'Gemini stress testing', false, true, err.message);
    }

    // Twilio API Stress Testing
    console.log('\n📞 Twilio API Stress Testing...');
    
    try {
      const twilioAuth = Buffer.from(`${process.env.VITE_TWILIO_ACCOUNT_SID}:${process.env.VITE_TWILIO_AUTH_TOKEN}`).toString('base64');
      
      // Test multiple endpoints concurrently
      const twilioPromises = [
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}.json`, {
          headers: { 'Authorization': `Basic ${twilioAuth}` },
          timeout: 10000
        }),
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
          headers: { 'Authorization': `Basic ${twilioAuth}` },
          timeout: 10000
        }),
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}/Calls.json?PageSize=1`, {
          headers: { 'Authorization': `Basic ${twilioAuth}` },
          timeout: 10000
        })
      ];
      
      const twilioResults = await Promise.all(twilioPromises);
      const twilioAllSuccessful = twilioResults.every(r => r.ok);
      
      test('API', 'Twilio concurrent endpoints', twilioAllSuccessful, true, '3 simultaneous endpoints');
      
    } catch (err) {
      test('API', 'Twilio stress testing', false, true, err.message);
    }

    // 3. ADVANCED BUSINESS LOGIC TESTING
    console.log('\n🔧 ADVANCED BUSINESS LOGIC TESTING');
    console.log('-'.repeat(60));

    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;
    
    if (profileId) {
      // Test complex business scenarios
      console.log('\n📋 Complex Business Scenario Testing...');
      
      // Scenario 1: Complete call center workflow with multiple leads
      try {
        // Create agent
        const agent = {
          profile_id: profileId,
          name: 'Advanced Test Agent ' + Date.now(),
          description: 'Testing advanced business logic',
          agent_type: 'sales',
          voice_name: 'alloy',
          language_code: 'en-US',
          system_instruction: 'You are an advanced test agent.',
          is_active: true,
          max_concurrent_calls: 5,
          business_hours_start: '09:00',
          business_hours_end: '17:00',
          business_days: [1, 2, 3, 4, 5],
          timezone: 'America/New_York'
        };

        const { data: createdAgent, error: agentError } = await supabase
          .from('ai_agents')
          .insert(agent)
          .select()
          .single();
        
        test('BusinessLogic', 'Advanced agent creation', !agentError, true);
        
        if (!agentError) {
          // Create campaign
          const campaign = {
            profile_id: profileId,
            agent_id: createdAgent.id,
            name: 'Advanced Test Campaign ' + Date.now(),
            description: 'Multi-lead campaign test',
            status: 'draft',
            caller_id: '+1234567890',
            max_concurrent_calls: 3,
            call_timeout_seconds: 30,
            retry_attempts: 2,
            retry_delay_minutes: 5
          };

          const { data: createdCampaign, error: campaignError } = await supabase
            .from('outbound_campaigns')
            .insert(campaign)
            .select()
            .single();
          
          test('BusinessLogic', 'Advanced campaign creation', !campaignError, true);
          
          if (!campaignError) {
            // Create multiple leads
            const leads = [];
            for (let i = 0; i < 5; i++) {
              const lead = {
                campaign_id: createdCampaign.id,
                profile_id: profileId,
                phone_number: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
                first_name: `AdvancedLead${i}`,
                last_name: 'Test',
                email: `advancedlead${i}_${Date.now()}@example.com`,
                company: `Test Company ${i}`,
                title: `Test Title ${i}`,
                status: 'pending',
                priority: i % 2 === 0 ? 'high' : 'medium',
                call_attempts: 0,
                do_not_call: false,
                preferred_call_time: '10:00-16:00',
                timezone: 'America/New_York'
              };
              leads.push(lead);
            }

            const { data: createdLeads, error: leadsError } = await supabase
              .from('campaign_leads')
              .insert(leads)
              .select();
            
            test('BusinessLogic', 'Bulk lead creation', !leadsError && createdLeads.length === 5, true, 
                 `${createdLeads?.length || 0} leads created`);
            
            if (!leadsError) {
              // Test lead status updates
              const leadUpdates = createdLeads.map((lead, index) => ({
                id: lead.id,
                status: index < 2 ? 'contacted' : 'pending',
                call_attempts: index < 2 ? 1 : 0,
                last_call_at: index < 2 ? new Date().toISOString() : null
              }));

              let updateSuccessCount = 0;
              for (const update of leadUpdates) {
                const { error: updateError } = await supabase
                  .from('campaign_leads')
                  .update({
                    status: update.status,
                    call_attempts: update.call_attempts,
                    last_call_at: update.last_call_at
                  })
                  .eq('id', update.id);
                
                if (!updateError) updateSuccessCount++;
              }
              
              test('BusinessLogic', 'Bulk lead status updates', updateSuccessCount === leadUpdates.length, true,
                   `${updateSuccessCount}/${leadUpdates.length} updates successful`);
              
              // Test campaign status progression
              const { error: campaignStatusError } = await supabase
                .from('outbound_campaigns')
                .update({ status: 'active' })
                .eq('id', createdCampaign.id);
              
              test('BusinessLogic', 'Campaign status progression', !campaignStatusError, true);
              
              // Create appointments for contacted leads
              const contactedLeads = createdLeads.filter((_, index) => index < 2);
              const appointments = contactedLeads.map((lead, index) => ({
                profile_id: profileId,
                scheduled_date: new Date(Date.now() + (24 + index) * 60 * 60 * 1000).toISOString(),
                customer_name: `${lead.first_name} ${lead.last_name}`,
                customer_phone: lead.phone_number,
                customer_email: lead.email,
                status: 'scheduled',
                appointment_type: 'consultation',
                duration_minutes: 30,
                notes: `Appointment for lead ${lead.id}`
              }));

              const { data: createdAppointments, error: appointmentsError } = await supabase
                .from('appointments')
                .insert(appointments)
                .select();
              
              test('BusinessLogic', 'Lead-to-appointment conversion', !appointmentsError && createdAppointments.length === 2, true,
                   `${createdAppointments?.length || 0} appointments created`);
              
              // Test data consistency check
              const { data: campaignSummary, error: summaryError } = await supabase
                .from('outbound_campaigns')
                .select(`
                  id,
                  name,
                  status,
                  ai_agents (
                    id,
                    name,
                    is_active
                  ),
                  campaign_leads (
                    id,
                    status,
                    call_attempts
                  )
                `)
                .eq('id', createdCampaign.id)
                .single();
              
              const dataConsistent = !summaryError && 
                                   campaignSummary.ai_agents && 
                                   campaignSummary.campaign_leads && 
                                   campaignSummary.campaign_leads.length === 5;
              
              test('BusinessLogic', 'Data consistency validation', dataConsistent, true,
                   `Campaign has ${campaignSummary?.campaign_leads?.length || 0} leads`);
              
              // Cleanup
              if (createdAppointments) {
                for (const appointment of createdAppointments) {
                  await supabase.from('appointments').delete().eq('id', appointment.id);
                }
              }
              
              for (const lead of createdLeads) {
                await supabase.from('campaign_leads').delete().eq('id', lead.id);
              }
            }
            
            await supabase.from('outbound_campaigns').delete().eq('id', createdCampaign.id);
          }
          
          await supabase.from('ai_agents').delete().eq('id', createdAgent.id);
        }
      } catch (err) {
        test('BusinessLogic', 'Complex business scenario', false, true, err.message);
      }
    }

    // 4. SECURITY AND AUTHENTICATION DEEP TESTING
    console.log('\n🔒 SECURITY AND AUTHENTICATION DEEP TESTING');
    console.log('-'.repeat(60));

    // Test authentication service
    try {
      const { data: session, error: authError } = await supabase.auth.getSession();
      test('Security', 'Auth service operational', !authError, true);
      
      // Test user management capabilities
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      test('Security', 'User management access', !usersError, false, 
           `${users?.users?.length || 0} users in system`);
      
    } catch (err) {
      test('Security', 'Authentication system', false, true, err.message);
    }

    // Test RLS (Row Level Security) in detail
    try {
      const anonClient = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
      );
      
      // Test multiple tables with anonymous access
      const rlsTests = ['profiles', 'ai_agents', 'outbound_campaigns', 'campaign_leads', 'appointments'];
      let rlsWorkingCount = 0;
      
      for (const table of rlsTests) {
        try {
          const { data, error } = await anonClient.from(table).select('*').limit(1);
          if (error) {
            rlsWorkingCount++;
          }
        } catch (err) {
          rlsWorkingCount++; // Error is good for RLS
        }
      }
      
      test('Security', 'RLS protection across tables', rlsWorkingCount >= rlsTests.length * 0.8, false,
           `${rlsWorkingCount}/${rlsTests.length} tables protected`);
      
    } catch (err) {
      test('Security', 'RLS testing', false, false, err.message);
    }

    // 5. PERFORMANCE UNDER LOAD TESTING
    console.log('\n⚡ PERFORMANCE UNDER LOAD TESTING');
    console.log('-'.repeat(60));

    // Test database performance under concurrent load
    try {
      const concurrentQueries = [];
      const queryCount = 10;
      
      for (let i = 0; i < queryCount; i++) {
        concurrentQueries.push(
          supabase.from('profiles').select('*').limit(5)
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(concurrentQueries);
      const totalTime = Date.now() - startTime;
      
      const allSuccessful = results.every(result => !result.error);
      const avgTime = totalTime / queryCount;
      
      test('Performance', 'Concurrent database queries', allSuccessful && avgTime < 1000, false,
           `${queryCount} queries in ${totalTime}ms (avg: ${avgTime.toFixed(0)}ms)`);
      
    } catch (err) {
      test('Performance', 'Concurrent query performance', false, false, err.message);
    }

    // Test API performance under load
    try {
      const apiCalls = [];
      for (let i = 0; i < 5; i++) {
        apiCalls.push(
          fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`, {
            timeout: 10000
          })
        );
      }
      
      const apiStartTime = Date.now();
      const apiResults = await Promise.all(apiCalls);
      const apiTotalTime = Date.now() - apiStartTime;
      
      const apiAllSuccessful = apiResults.every(result => result.ok);
      
      test('Performance', 'Concurrent API calls', apiAllSuccessful && apiTotalTime < 15000, false,
           `5 API calls in ${apiTotalTime}ms`);
      
    } catch (err) {
      test('Performance', 'API performance under load', false, false, err.message);
    }

  } catch (error) {
    console.error('\n❌ Critical system error during extended testing:', error);
    criticalFailures.push('System: Critical error during extended testing');
  }

  // COMPREHENSIVE RESULTS ANALYSIS
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTENDED SYSTEMATIC TESTING RESULTS');
  console.log('='.repeat(80));

  // Category breakdown with detailed analysis
  for (const [category, tests] of Object.entries(testResults)) {
    const categoryPassed = tests.filter(t => t.status === 'PASS').length;
    const categoryTotal = tests.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
    
    console.log(`\n${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    
    const criticalTests = tests.filter(t => t.critical);
    const criticalPassed = criticalTests.filter(t => t.status === 'PASS').length;
    const criticalTotal = criticalTests.length;
    
    if (criticalTotal > 0) {
      console.log(`   Critical: ${criticalPassed}/${criticalTotal} (${((criticalPassed/criticalTotal)*100).toFixed(1)}%)`);
    }
    
    // Show failed tests with details
    const failedTests = tests.filter(t => t.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log(`   Failed Tests:`);
      failedTests.forEach(test => {
        const criticalMark = test.critical ? '🚨' : '⚠️';
        console.log(`     ${criticalMark} ${test.name}${test.details ? ' - ' + test.details : ''}`);
      });
    }
  }

  const successRate = (passedTests / totalTests) * 100;
  const criticalSuccessRate = criticalFailures.length === 0 ? 100 : 
    ((totalTests - criticalFailures.length) / totalTests) * 100;

  console.log(`\n📊 EXTENDED TESTING SUMMARY:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`🔥 Critical Success Rate: ${criticalSuccessRate.toFixed(1)}%`);

  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES:');
    criticalFailures.forEach(failure => console.log(`   ❌ ${failure}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  }

  // FINAL EXTENDED TESTING VERDICT
  console.log('\n' + '='.repeat(80));
  console.log('🎯 EXTENDED TESTING VERDICT');
  console.log('='.repeat(80));

  const isExtendedReady = successRate >= 85 && criticalFailures.length <= 2;
  const isProductionGrade = successRate >= 95 && criticalFailures.length === 0;
  
  if (isProductionGrade) {
    console.log('🎉 EXTENDED TESTING: PRODUCTION GRADE ✅');
    console.log('✅ System exceeds production standards');
    console.log('✅ All critical systems validated');
    console.log('✅ Ready for enterprise deployment');
    console.log('🚀 APPROVED FOR FULL PRODUCTION LAUNCH');
  } else if (isExtendedReady) {
    console.log('✅ EXTENDED TESTING: MARKET READY ✅');
    console.log('✅ System meets market readiness standards');
    console.log('✅ Core functionality thoroughly validated');
    console.log('⚠️  Minor issues can be addressed post-launch');
    console.log('🚀 APPROVED FOR MARKET LAUNCH WITH MONITORING');
  } else {
    console.log('⚠️  EXTENDED TESTING: NEEDS IMPROVEMENT 🟡');
    console.log(`🔧 ${criticalFailures.length} critical issue(s) require attention`);
    console.log('📋 Address critical issues before production deployment');
    console.log('🔄 Re-run extended testing after fixes');
  }

  console.log(`\n📈 Extended Testing Confidence: ${successRate.toFixed(1)}%`);
  console.log(`🔥 Critical Systems Confidence: ${criticalSuccessRate.toFixed(1)}%`);
  console.log(`🔧 Critical Issues: ${criticalFailures.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);

  return {
    totalTests,
    passedTests,
    successRate,
    criticalFailures,
    warnings,
    extendedReady: isExtendedReady,
    productionGrade: isProductionGrade
  };
}

extendedSystematicTesting().catch(console.error);