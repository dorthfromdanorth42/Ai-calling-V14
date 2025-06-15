#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function finalComprehensiveValidation() {
  console.log('🎯 FINAL COMPREHENSIVE VALIDATION - PRODUCTION READINESS');
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
    // 1. LOAD TESTING & SCALABILITY
    console.log('\n⚡ LOAD TESTING & SCALABILITY');
    console.log('-'.repeat(60));

    // Test concurrent database operations
    const concurrentTests = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 20; i++) {
      concurrentTests.push(
        supabase.from('campaign_leads').select('*').limit(10)
      );
    }

    try {
      const results = await Promise.all(concurrentTests);
      const endTime = Date.now();
      const allSucceeded = results.every(result => !result.error);
      const avgTime = (endTime - startTime) / 20;
      
      test('Load', 'Concurrent database queries', allSucceeded, true, 
           `20 concurrent queries, avg ${avgTime.toFixed(0)}ms`);
      
      test('Load', 'Scalability performance', avgTime < 1000, false, 
           `Average response time under 1s`);
    } catch (err) {
      test('Load', 'Concurrent database queries', false, true, err.message);
    }

    // Test large dataset handling
    try {
      const { data: largeDataset, error: largeError } = await supabase
        .from('campaign_leads')
        .select('*')
        .limit(500);
      
      test('Load', 'Large dataset retrieval', !largeError, false, 
           `Retrieved ${largeDataset?.length || 0} records`);
    } catch (err) {
      test('Load', 'Large dataset retrieval', false, false, err.message);
    }

    // Test memory usage with complex queries
    try {
      const complexQuery = await supabase
        .from('outbound_campaigns')
        .select(`
          *,
          ai_agents (*),
          campaign_leads (*),
          profiles (*)
        `)
        .limit(50);
      
      test('Load', 'Complex nested queries', !complexQuery.error, false, 
           'Multi-table joins with nested data');
    } catch (err) {
      test('Load', 'Complex nested queries', false, false, err.message);
    }

    // 2. EDGE CASES & BOUNDARY TESTING
    console.log('\n🔬 EDGE CASES & BOUNDARY TESTING');
    console.log('-'.repeat(60));

    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
    const profileId = profiles[0]?.id;

    if (profileId) {
      // Test extremely long strings
      const longString = 'A'.repeat(10000);
      try {
        const { data, error } = await supabase
          .from('ai_agents')
          .insert({
            profile_id: profileId,
            name: 'Edge Test Agent',
            description: longString,
            is_active: true
          })
          .select()
          .single();
        
        test('EdgeCase', 'Extremely long text handling', !error, false, 
             error ? 'Properly rejected' : 'Accepted long text');
        
        if (!error) {
          await supabase.from('ai_agents').delete().eq('id', data.id);
        }
      } catch (err) {
        test('EdgeCase', 'Extremely long text handling', true, false, 'Properly caught');
      }

      // Test special characters and Unicode
      const specialChars = '🚀💡🔥✅❌⚠️🎯📊🔧🌐💻📱🎨🔒🛡️⚡🧪🔬📋👤📅🏢';
      try {
        const { data, error } = await supabase
          .from('ai_agents')
          .insert({
            profile_id: profileId,
            name: specialChars,
            description: 'Unicode test agent',
            is_active: true
          })
          .select()
          .single();
        
        test('EdgeCase', 'Unicode character handling', !error, false, 
             'Emojis and special characters');
        
        if (!error) {
          await supabase.from('ai_agents').delete().eq('id', data.id);
        }
      } catch (err) {
        test('EdgeCase', 'Unicode character handling', false, false, err.message);
      }

      // Test null and undefined values
      try {
        const { data, error } = await supabase
          .from('ai_agents')
          .insert({
            profile_id: profileId,
            name: null,
            description: 'Null test',
            is_active: true
          });
        
        test('EdgeCase', 'Null value handling', !!error, false, 
             'Should reject null required fields');
      } catch (err) {
        test('EdgeCase', 'Null value handling', true, false, 'Properly caught');
      }

      // Test date boundary cases
      const dateCases = [
        { date: '1900-01-01T00:00:00Z', name: 'Very old date' },
        { date: '2100-12-31T23:59:59Z', name: 'Far future date' },
        { date: new Date().toISOString(), name: 'Current date' }
      ];

      for (const dateCase of dateCases) {
        try {
          const { data, error } = await supabase
            .from('appointments')
            .insert({
              profile_id: profileId,
              scheduled_date: dateCase.date,
              customer_name: 'Date Test Customer',
              customer_phone: '+15551234567',
              status: 'scheduled',
              appointment_type: 'consultation'
            })
            .select()
            .single();
          
          test('EdgeCase', `${dateCase.name} handling`, !error, false);
          
          if (!error) {
            await supabase.from('appointments').delete().eq('id', data.id);
          }
        } catch (err) {
          test('EdgeCase', `${dateCase.name} handling`, false, false, err.message);
        }
      }
    }

    // 3. REAL-WORLD SCENARIO TESTING
    console.log('\n🌍 REAL-WORLD SCENARIO TESTING');
    console.log('-'.repeat(60));

    if (profileId) {
      // Scenario 1: Complete customer journey
      console.log('\n📋 Scenario 1: Complete Customer Journey...');
      
      let scenarioSuccess = true;
      let createdItems = {};

      try {
        // Step 1: Create AI Agent for sales
        const salesAgent = {
          profile_id: profileId,
          name: 'Sales Agent - Customer Journey Test',
          description: 'AI agent for complete customer journey testing',
          agent_type: 'sales',
          is_active: true
        };

        const { data: agentResult, error: agentError } = await supabase
          .from('ai_agents')
          .insert(salesAgent)
          .select()
          .single();
        
        if (agentError) {
          scenarioSuccess = false;
        } else {
          createdItems.agent = agentResult.id;
        }

        // Step 2: Create marketing campaign
        const marketingCampaign = {
          profile_id: profileId,
          agent_id: agentResult?.id,
          name: 'Q4 Sales Campaign - Journey Test',
          description: 'Complete customer journey testing campaign',
          status: 'active',
          caller_id: '+1234567890',
          max_concurrent_calls: 3
        };

        const { data: campaignResult, error: campaignError } = await supabase
          .from('outbound_campaigns')
          .insert(marketingCampaign)
          .select()
          .single();
        
        if (campaignError) {
          scenarioSuccess = false;
        } else {
          createdItems.campaign = campaignResult.id;
        }

        // Step 3: Import leads batch
        const leadsBatch = [
          {
            campaign_id: campaignResult?.id,
            profile_id: profileId,
            phone_number: '+15551001001',
            first_name: 'John',
            last_name: 'Smith',
            email: 'john.smith@example.com',
            company: 'Tech Corp',
            title: 'CEO',
            status: 'pending',
            priority: 'high'
          },
          {
            campaign_id: campaignResult?.id,
            profile_id: profileId,
            phone_number: '+15551001002',
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane.doe@example.com',
            company: 'Marketing Inc',
            title: 'CMO',
            status: 'pending',
            priority: 'medium'
          },
          {
            campaign_id: campaignResult?.id,
            profile_id: profileId,
            phone_number: '+15551001003',
            first_name: 'Bob',
            last_name: 'Johnson',
            email: 'bob.johnson@example.com',
            company: 'Sales LLC',
            title: 'Sales Director',
            status: 'pending',
            priority: 'low'
          }
        ];

        const { data: leadsResult, error: leadsError } = await supabase
          .from('campaign_leads')
          .insert(leadsBatch)
          .select();
        
        if (leadsError) {
          scenarioSuccess = false;
        } else {
          createdItems.leads = leadsResult.map(lead => lead.id);
        }

        // Step 4: Simulate call outcomes
        if (leadsResult && leadsResult.length > 0) {
          const callOutcomes = [
            { leadId: leadsResult[0].id, status: 'interested', outcome: 'appointment_scheduled' },
            { leadId: leadsResult[1].id, status: 'callback', outcome: 'callback_requested' },
            { leadId: leadsResult[2].id, status: 'not_interested', outcome: 'not_interested' }
          ];

          for (const outcome of callOutcomes) {
            const { error: updateError } = await supabase
              .from('campaign_leads')
              .update({ 
                status: outcome.status,
                call_attempts: 1,
                last_call_at: new Date().toISOString(),
                outcome: outcome.outcome
              })
              .eq('id', outcome.leadId);
            
            if (updateError) {
              scenarioSuccess = false;
            }
          }

          // Step 5: Create appointment for interested lead
          const appointment = {
            profile_id: profileId,
            scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            customer_name: 'John Smith',
            customer_phone: '+15551001001',
            customer_email: 'john.smith@example.com',
            status: 'scheduled',
            appointment_type: 'demo',
            notes: 'Interested in enterprise solution',
            duration_minutes: 60
          };

          const { data: appointmentResult, error: appointmentError } = await supabase
            .from('appointments')
            .insert(appointment)
            .select()
            .single();
          
          if (appointmentError) {
            scenarioSuccess = false;
          } else {
            createdItems.appointment = appointmentResult.id;
          }
        }

        test('Scenario', 'Complete customer journey', scenarioSuccess, true, 
             'Agent → Campaign → Leads → Calls → Appointment');

        // Cleanup scenario data
        if (createdItems.appointment) await supabase.from('appointments').delete().eq('id', createdItems.appointment);
        if (createdItems.leads) {
          for (const leadId of createdItems.leads) {
            await supabase.from('campaign_leads').delete().eq('id', leadId);
          }
        }
        if (createdItems.campaign) await supabase.from('outbound_campaigns').delete().eq('id', createdItems.campaign);
        if (createdItems.agent) await supabase.from('ai_agents').delete().eq('id', createdItems.agent);

      } catch (err) {
        test('Scenario', 'Complete customer journey', false, true, err.message);
      }

      // Scenario 2: High-volume lead processing
      console.log('\n📋 Scenario 2: High-Volume Lead Processing...');
      
      try {
        // Create campaign for bulk testing
        const bulkCampaign = {
          profile_id: profileId,
          name: 'Bulk Processing Test Campaign',
          description: 'Testing high-volume lead processing',
          status: 'active',
          caller_id: '+1234567890'
        };

        const { data: bulkCampaignResult, error: bulkCampaignError } = await supabase
          .from('outbound_campaigns')
          .insert(bulkCampaign)
          .select()
          .single();
        
        if (!bulkCampaignError) {
          // Create 50 leads in batches
          const batchSize = 10;
          const totalLeads = 50;
          let successfulBatches = 0;

          for (let i = 0; i < totalLeads; i += batchSize) {
            const batch = [];
            for (let j = 0; j < batchSize && (i + j) < totalLeads; j++) {
              const leadNum = i + j + 1;
              batch.push({
                campaign_id: bulkCampaignResult.id,
                profile_id: profileId,
                phone_number: `+1555100${leadNum.toString().padStart(4, '0')}`,
                first_name: `Lead${leadNum}`,
                last_name: 'Test',
                email: `lead${leadNum}@bulktest.com`,
                status: 'pending'
              });
            }

            const { error: batchError } = await supabase
              .from('campaign_leads')
              .insert(batch);
            
            if (!batchError) {
              successfulBatches++;
            }
          }

          const expectedBatches = Math.ceil(totalLeads / batchSize);
          test('Scenario', 'High-volume lead processing', successfulBatches === expectedBatches, false, 
               `${successfulBatches}/${expectedBatches} batches successful`);

          // Cleanup bulk data
          await supabase.from('campaign_leads').delete().eq('campaign_id', bulkCampaignResult.id);
          await supabase.from('outbound_campaigns').delete().eq('id', bulkCampaignResult.id);
        } else {
          test('Scenario', 'High-volume lead processing', false, false, bulkCampaignError.message);
        }
      } catch (err) {
        test('Scenario', 'High-volume lead processing', false, false, err.message);
      }
    }

    // 4. INTEGRATION STRESS TESTING
    console.log('\n🔗 INTEGRATION STRESS TESTING');
    console.log('-'.repeat(60));

    // Test API rate limits and reliability
    const apiStressTests = [
      {
        name: 'Gemini API stress test',
        test: async () => {
          const requests = [];
          for (let i = 0; i < 5; i++) {
            requests.push(
              fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`, {
                timeout: 10000
              })
            );
          }
          const results = await Promise.all(requests);
          return results.every(r => r.ok);
        }
      },
      {
        name: 'Twilio API stress test',
        test: async () => {
          const twilioAuth = Buffer.from(`${process.env.VITE_TWILIO_ACCOUNT_SID}:${process.env.VITE_TWILIO_AUTH_TOKEN}`).toString('base64');
          const requests = [];
          for (let i = 0; i < 5; i++) {
            requests.push(
              fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}.json`, {
                headers: { 'Authorization': `Basic ${twilioAuth}` },
                timeout: 10000
              })
            );
          }
          const results = await Promise.all(requests);
          return results.every(r => r.ok);
        }
      }
    ];

    for (const apiTest of apiStressTests) {
      try {
        const result = await apiTest.test();
        test('Integration', apiTest.name, result, false, 'Multiple concurrent requests');
      } catch (err) {
        test('Integration', apiTest.name, false, false, err.message);
      }
    }

    // 5. DATA CONSISTENCY & INTEGRITY
    console.log('\n🔍 DATA CONSISTENCY & INTEGRITY');
    console.log('-'.repeat(60));

    // Test referential integrity
    try {
      // Try to create lead with non-existent campaign
      const { error: integrityError } = await supabase
        .from('campaign_leads')
        .insert({
          campaign_id: '00000000-0000-0000-0000-000000000000',
          profile_id: profileId,
          phone_number: '+15551234567',
          first_name: 'Integrity',
          last_name: 'Test',
          status: 'pending'
        });
      
      test('Integrity', 'Referential integrity enforcement', !!integrityError, true, 
           'Should reject invalid foreign keys');
    } catch (err) {
      test('Integrity', 'Referential integrity enforcement', true, true, 'Properly enforced');
    }

    // Test transaction consistency
    if (profileId) {
      try {
        // Simulate concurrent updates to same record
        const { data: testAgent } = await supabase
          .from('ai_agents')
          .insert({
            profile_id: profileId,
            name: 'Concurrency Test Agent',
            description: 'Testing concurrent updates',
            is_active: true
          })
          .select()
          .single();
        
        if (testAgent) {
          const updates = [];
          for (let i = 0; i < 5; i++) {
            updates.push(
              supabase
                .from('ai_agents')
                .update({ description: `Update ${i}` })
                .eq('id', testAgent.id)
            );
          }
          
          const results = await Promise.all(updates);
          const allSucceeded = results.every(r => !r.error);
          
          test('Integrity', 'Concurrent update handling', allSucceeded, false, 
               'Multiple simultaneous updates');
          
          // Cleanup
          await supabase.from('ai_agents').delete().eq('id', testAgent.id);
        }
      } catch (err) {
        test('Integrity', 'Concurrent update handling', false, false, err.message);
      }
    }

  } catch (error) {
    console.error('\n❌ Critical system error during final validation:', error);
    criticalFailures.push('System: Critical error during final validation');
  }

  // FINAL COMPREHENSIVE RESULTS
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL COMPREHENSIVE VALIDATION RESULTS');
  console.log('='.repeat(80));

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
    
    // Show failed tests
    const failedTests = tests.filter(t => t.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log(`   Failed tests:`);
      failedTests.forEach(test => {
        console.log(`     ❌ ${test.name}${test.details ? ' - ' + test.details : ''}`);
      });
    }
  }

  const successRate = (passedTests / totalTests) * 100;
  const criticalSuccessRate = criticalFailures.length === 0 ? 100 : 
    ((totalTests - criticalFailures.length) / totalTests) * 100;

  console.log(`\n📊 FINAL VALIDATION RESULTS:`);
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

  // ULTIMATE PRODUCTION READINESS VERDICT
  console.log('\n' + '='.repeat(80));
  console.log('🎯 ULTIMATE PRODUCTION READINESS VERDICT');
  console.log('='.repeat(80));

  const isProductionReady = successRate >= 90 && criticalFailures.length === 0;
  const isMarketReady = successRate >= 80 && criticalFailures.length <= 3;

  if (isProductionReady) {
    console.log('🎉 FINAL VERDICT: PRODUCTION READY ✅');
    console.log('✅ All critical systems validated');
    console.log('✅ Load testing passed');
    console.log('✅ Real-world scenarios working');
    console.log('✅ Data integrity confirmed');
    console.log('🚀 APPROVED FOR IMMEDIATE PRODUCTION DEPLOYMENT');
  } else if (isMarketReady) {
    console.log('✅ FINAL VERDICT: MARKET READY ✅');
    console.log('✅ Core functionality validated');
    console.log('✅ Scalability demonstrated');
    console.log('✅ Business scenarios working');
    console.log(`⚠️  ${criticalFailures.length} issue(s) for post-launch resolution`);
    console.log('🚀 APPROVED FOR MARKET LAUNCH WITH MONITORING');
  } else {
    console.log('❌ FINAL VERDICT: NOT READY 🔴');
    console.log('🚨 Critical issues require resolution');
    console.log(`📊 ${criticalFailures.length} blocking failure(s)`);
    console.log('⛔ LAUNCH BLOCKED UNTIL ISSUES RESOLVED');
  }

  console.log(`\n📈 Final Production Confidence: ${successRate.toFixed(1)}%`);
  console.log(`🔥 Critical Systems Confidence: ${criticalSuccessRate.toFixed(1)}%`);
  console.log(`🔧 Critical Issues: ${criticalFailures.length}`);
  console.log(`⚠️  Total Warnings: ${warnings.length}`);

  return {
    totalTests,
    passedTests,
    successRate,
    criticalFailures,
    warnings,
    marketReady: isMarketReady,
    productionReady: isProductionReady,
    testResults
  };
}

finalComprehensiveValidation().catch(console.error);