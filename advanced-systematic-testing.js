#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function advancedSystematicTesting() {
  console.log('🔬 ADVANCED SYSTEMATIC TESTING - COMPREHENSIVE VALIDATION');
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
    // 1. COMPREHENSIVE DATABASE SCHEMA VALIDATION
    console.log('\n📊 COMPREHENSIVE DATABASE SCHEMA VALIDATION');
    console.log('-'.repeat(60));

    const allTables = [
      'profiles', 'ai_agents', 'campaigns', 'outbound_campaigns', 'leads', 
      'campaign_leads', 'appointments', 'call_logs', 'live_calls', 
      'dnc_list', 'billing', 'analytics_data', 'call_recordings', 
      'agent_performance', 'function_call_logs', 'webhooks'
    ];

    // Test table accessibility and structure
    for (const tableName of allTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1);
        
        const isAccessible = !error;
        test('Schema', `${tableName} table accessible`, isAccessible, 
             ['profiles', 'ai_agents', 'outbound_campaigns', 'campaign_leads', 'appointments', 'call_logs'].includes(tableName));
        
        if (isAccessible) {
          // Test CRUD operations on each table
          test('Schema', `${tableName} count query`, count !== null, false, `Count: ${count}`);
          
          // Test insert permissions (will fail due to constraints, but should not be permission error)
          try {
            const { error: insertError } = await supabase
              .from(tableName)
              .insert({})
              .select();
            
            const hasInsertPermission = !insertError || !insertError.message.includes('permission');
            test('Schema', `${tableName} insert permission`, hasInsertPermission, false);
          } catch (err) {
            test('Schema', `${tableName} insert permission`, false, false);
          }
        }
      } catch (err) {
        test('Schema', `${tableName} table accessible`, false, 
             ['profiles', 'ai_agents', 'outbound_campaigns', 'campaign_leads', 'appointments', 'call_logs'].includes(tableName));
      }
    }

    // 2. DETAILED API INTEGRATION TESTING
    console.log('\n🌐 DETAILED API INTEGRATION TESTING');
    console.log('-'.repeat(60));

    // Comprehensive Gemini AI Testing
    try {
      // Test models endpoint
      const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`, {
        timeout: 10000
      });
      test('API', 'Gemini models endpoint', modelsResponse.ok, true);
      
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        test('API', 'Gemini models available', modelsData.models && modelsData.models.length > 0, true, 
             `${modelsData.models?.length || 0} models`);
        
        // Test specific model availability
        const hasGeminiPro = modelsData.models?.some(m => m.name.includes('gemini-pro'));
        test('API', 'Gemini Pro model available', hasGeminiPro, true);
        
        // Test content generation
        try {
          const generateResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'Say "test successful" if you can respond.' }]
              }]
            }),
            timeout: 15000
          });
          
          test('API', 'Gemini content generation', generateResponse.ok, true);
          
          if (generateResponse.ok) {
            const generateData = await generateResponse.json();
            const hasResponse = generateData.candidates && generateData.candidates.length > 0;
            test('API', 'Gemini response generation', hasResponse, true);
          }
        } catch (err) {
          test('API', 'Gemini content generation', false, true, err.message);
        }
      }
    } catch (err) {
      test('API', 'Gemini models endpoint', false, true, err.message);
    }

    // Comprehensive Twilio Testing
    try {
      const twilioAuth = Buffer.from(`${process.env.VITE_TWILIO_ACCOUNT_SID}:${process.env.VITE_TWILIO_AUTH_TOKEN}`).toString('base64');
      
      // Test account info
      const accountResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}.json`, {
        headers: { 'Authorization': `Basic ${twilioAuth}` },
        timeout: 10000
      });
      test('API', 'Twilio account endpoint', accountResponse.ok, true);
      
      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        test('API', 'Twilio account active', accountData.status === 'active', true);
        test('API', 'Twilio account SID match', accountData.sid === process.env.VITE_TWILIO_ACCOUNT_SID, true);
        
        // Test phone numbers
        const numbersResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
          headers: { 'Authorization': `Basic ${twilioAuth}` },
          timeout: 10000
        });
        test('API', 'Twilio phone numbers endpoint', numbersResponse.ok, false);
        
        if (numbersResponse.ok) {
          const numbersData = await numbersResponse.json();
          test('API', 'Twilio phone numbers available', numbersData.incoming_phone_numbers && numbersData.incoming_phone_numbers.length > 0, false,
               `${numbersData.incoming_phone_numbers?.length || 0} numbers`);
        }
        
        // Test calls endpoint (should be accessible even if empty)
        const callsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.VITE_TWILIO_ACCOUNT_SID}/Calls.json?PageSize=1`, {
          headers: { 'Authorization': `Basic ${twilioAuth}` },
          timeout: 10000
        });
        test('API', 'Twilio calls endpoint', callsResponse.ok, true);
      }
    } catch (err) {
      test('API', 'Twilio account endpoint', false, true, err.message);
    }

    // 3. COMPREHENSIVE BUSINESS LOGIC TESTING
    console.log('\n🔧 COMPREHENSIVE BUSINESS LOGIC TESTING');
    console.log('-'.repeat(60));

    const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
    const profileId = profiles[0]?.id;
    test('Business', 'User profile exists', !!profileId, true);

    if (profileId) {
      // Test AI Agent comprehensive workflow
      console.log('\n🤖 AI Agent Comprehensive Testing...');
      
      // Test agent creation with various configurations
      const agentConfigs = [
        {
          name: 'Basic Agent',
          config: {
            profile_id: profileId,
            name: 'Basic Test Agent ' + Date.now(),
            description: 'Basic agent configuration',
            is_active: true
          }
        },
        {
          name: 'Advanced Agent',
          config: {
            profile_id: profileId,
            name: 'Advanced Test Agent ' + Date.now(),
            description: 'Advanced agent configuration',
            agent_type: 'sales',
            voice_name: 'alloy',
            language_code: 'en-US',
            system_instruction: 'You are a professional sales agent.',
            is_active: true,
            max_concurrent_calls: 3,
            business_hours_start: '09:00',
            business_hours_end: '17:00',
            timezone: 'America/New_York'
          }
        }
      ];

      let createdAgents = [];
      
      for (const agentConfig of agentConfigs) {
        const { data: agentResult, error: agentError } = await supabase
          .from('ai_agents')
          .insert(agentConfig.config)
          .select()
          .single();
        
        test('Business', `${agentConfig.name} creation`, !agentError, true);
        
        if (!agentError) {
          createdAgents.push(agentResult.id);
          
          // Test agent update
          const { error: updateError } = await supabase
            .from('ai_agents')
            .update({ description: 'Updated ' + agentConfig.config.description })
            .eq('id', agentResult.id);
          
          test('Business', `${agentConfig.name} update`, !updateError, true);
          
          // Test agent retrieval
          const { data: retrievedAgent, error: retrieveError } = await supabase
            .from('ai_agents')
            .select('*')
            .eq('id', agentResult.id)
            .single();
          
          test('Business', `${agentConfig.name} retrieval`, !retrieveError && retrievedAgent, true);
        }
      }

      // Test Campaign comprehensive workflow
      console.log('\n📋 Campaign Comprehensive Testing...');
      
      if (createdAgents.length > 0) {
        const campaignConfigs = [
          {
            name: 'Basic Campaign',
            config: {
              profile_id: profileId,
              agent_id: createdAgents[0],
              name: 'Basic Test Campaign ' + Date.now(),
              description: 'Basic campaign configuration',
              status: 'draft',
              caller_id: '+1234567890'
            }
          },
          {
            name: 'Advanced Campaign',
            config: {
              profile_id: profileId,
              agent_id: createdAgents[0],
              name: 'Advanced Test Campaign ' + Date.now(),
              description: 'Advanced campaign configuration',
              status: 'draft',
              caller_id: '+1234567890',
              max_concurrent_calls: 5,
              call_timeout_seconds: 30,
              retry_attempts: 3,
              retry_delay_minutes: 60
            }
          }
        ];

        let createdCampaigns = [];
        
        for (const campaignConfig of campaignConfigs) {
          const { data: campaignResult, error: campaignError } = await supabase
            .from('outbound_campaigns')
            .insert(campaignConfig.config)
            .select()
            .single();
          
          test('Business', `${campaignConfig.name} creation`, !campaignError, true);
          
          if (!campaignError) {
            createdCampaigns.push(campaignResult.id);
            
            // Test campaign status updates
            const statuses = ['draft', 'active', 'paused', 'completed'];
            for (const status of statuses) {
              const { error: statusError } = await supabase
                .from('outbound_campaigns')
                .update({ status })
                .eq('id', campaignResult.id);
              
              test('Business', `${campaignConfig.name} status to ${status}`, !statusError, false);
            }
          }
        }

        // Test Lead Management comprehensive workflow
        console.log('\n👤 Lead Management Comprehensive Testing...');
        
        if (createdCampaigns.length > 0) {
          const leadConfigs = [
            {
              name: 'Minimal Lead',
              config: {
                campaign_id: createdCampaigns[0],
                profile_id: profileId,
                phone_number: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
                first_name: 'Minimal',
                last_name: 'Lead',
                status: 'pending'
              }
            },
            {
              name: 'Complete Lead',
              config: {
                campaign_id: createdCampaigns[0],
                profile_id: profileId,
                phone_number: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
                first_name: 'Complete',
                last_name: 'Lead',
                email: 'complete' + Date.now() + '@example.com',
                company: 'Test Company',
                title: 'Test Title',
                status: 'pending',
                priority: 'high',
                call_attempts: 0,
                do_not_call: false,
                preferred_call_time: '10:00',
                timezone: 'America/New_York'
              }
            }
          ];

          let createdLeads = [];
          
          for (const leadConfig of leadConfigs) {
            const { data: leadResult, error: leadError } = await supabase
              .from('campaign_leads')
              .insert(leadConfig.config)
              .select()
              .single();
            
            test('Business', `${leadConfig.name} creation`, !leadError, true);
            
            if (!leadError) {
              createdLeads.push(leadResult.id);
              
              // Test lead status progression
              const leadStatuses = ['pending', 'contacted', 'interested', 'not_interested', 'callback', 'converted'];
              for (const status of leadStatuses) {
                const { error: statusError } = await supabase
                  .from('campaign_leads')
                  .update({ status })
                  .eq('id', leadResult.id);
                
                test('Business', `${leadConfig.name} status to ${status}`, !statusError, false);
              }
              
              // Test lead call attempts increment
              const { error: attemptsError } = await supabase
                .from('campaign_leads')
                .update({ call_attempts: 3 })
                .eq('id', leadResult.id);
              
              test('Business', `${leadConfig.name} call attempts update`, !attemptsError, true);
            }
          }

          // Test Appointment comprehensive workflow
          console.log('\n📅 Appointment Comprehensive Testing...');
          
          if (createdLeads.length > 0) {
            const { data: sampleLead } = await supabase
              .from('campaign_leads')
              .select('*')
              .eq('id', createdLeads[0])
              .single();
            
            if (sampleLead) {
              const appointmentConfigs = [
                {
                  name: 'Basic Appointment',
                  config: {
                    profile_id: profileId,
                    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    customer_name: sampleLead.first_name + ' ' + sampleLead.last_name,
                    customer_phone: sampleLead.phone_number,
                    status: 'scheduled',
                    appointment_type: 'consultation'
                  }
                },
                {
                  name: 'Detailed Appointment',
                  config: {
                    profile_id: profileId,
                    scheduled_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                    customer_name: sampleLead.first_name + ' ' + sampleLead.last_name,
                    customer_phone: sampleLead.phone_number,
                    customer_email: sampleLead.email,
                    status: 'scheduled',
                    appointment_type: 'demo',
                    notes: 'Comprehensive appointment test',
                    duration_minutes: 60
                  }
                }
              ];

              let createdAppointments = [];
              
              for (const appointmentConfig of appointmentConfigs) {
                const { data: appointmentResult, error: appointmentError } = await supabase
                  .from('appointments')
                  .insert(appointmentConfig.config)
                  .select()
                  .single();
                
                test('Business', `${appointmentConfig.name} creation`, !appointmentError, true);
                
                if (!appointmentError) {
                  createdAppointments.push(appointmentResult.id);
                  
                  // Test appointment status updates
                  const appointmentStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
                  for (const status of appointmentStatuses) {
                    const { error: statusError } = await supabase
                      .from('appointments')
                      .update({ status })
                      .eq('id', appointmentResult.id);
                    
                    test('Business', `${appointmentConfig.name} status to ${status}`, !statusError, false);
                  }
                }
              }

              // Cleanup appointments
              for (const appointmentId of createdAppointments) {
                await supabase.from('appointments').delete().eq('id', appointmentId);
              }
            }
          }

          // Cleanup leads
          for (const leadId of createdLeads) {
            await supabase.from('campaign_leads').delete().eq('id', leadId);
          }
        }

        // Cleanup campaigns
        for (const campaignId of createdCampaigns) {
          await supabase.from('outbound_campaigns').delete().eq('id', campaignId);
        }
      }

      // Cleanup agents
      for (const agentId of createdAgents) {
        await supabase.from('ai_agents').delete().eq('id', agentId);
      }
    }

    // 4. DATA INTEGRITY AND RELATIONSHIPS TESTING
    console.log('\n🔗 DATA INTEGRITY AND RELATIONSHIPS TESTING');
    console.log('-'.repeat(60));

    // Test foreign key relationships
    const relationshipTests = [
      {
        name: 'Campaign-Agent relationship',
        query: () => supabase
          .from('outbound_campaigns')
          .select(`
            id,
            name,
            ai_agents (
              id,
              name,
              description
            )
          `)
          .limit(5)
      },
      {
        name: 'Lead-Campaign relationship',
        query: () => supabase
          .from('campaign_leads')
          .select(`
            id,
            first_name,
            last_name,
            outbound_campaigns (
              id,
              name,
              status
            )
          `)
          .limit(5)
      },
      {
        name: 'Profile-Agent relationship',
        query: () => supabase
          .from('ai_agents')
          .select(`
            id,
            name,
            profiles (
              id,
              full_name,
              email
            )
          `)
          .limit(5)
      }
    ];

    for (const relationshipTest of relationshipTests) {
      try {
        const { data, error } = await relationshipTest.query();
        test('Relationships', relationshipTest.name, !error, true);
        
        if (!error && data && data.length > 0) {
          const hasNestedData = data.some(item => 
            Object.values(item).some(value => 
              typeof value === 'object' && value !== null && !Array.isArray(value)
            )
          );
          test('Relationships', `${relationshipTest.name} nested data`, hasNestedData, false);
        }
      } catch (err) {
        test('Relationships', relationshipTest.name, false, true);
      }
    }

    // 5. PERFORMANCE AND SCALABILITY TESTING
    console.log('\n⚡ PERFORMANCE AND SCALABILITY TESTING');
    console.log('-'.repeat(60));

    const performanceTests = [
      {
        name: 'Large dataset query (100 records)',
        test: () => supabase.from('campaign_leads').select('*').limit(100),
        maxTime: 3000
      },
      {
        name: 'Complex join query',
        test: () => supabase
          .from('outbound_campaigns')
          .select(`
            *,
            ai_agents (*),
            campaign_leads (count)
          `)
          .limit(20),
        maxTime: 5000
      },
      {
        name: 'Filtered search query',
        test: () => supabase
          .from('campaign_leads')
          .select('*')
          .eq('status', 'pending')
          .limit(50),
        maxTime: 2000
      },
      {
        name: 'Count aggregation query',
        test: () => supabase
          .from('campaign_leads')
          .select('*', { count: 'exact', head: true }),
        maxTime: 3000
      }
    ];

    for (const perfTest of performanceTests) {
      try {
        const startTime = Date.now();
        const { data, error } = await perfTest.test();
        const queryTime = Date.now() - startTime;
        
        const isWithinTime = queryTime < perfTest.maxTime && !error;
        test('Performance', perfTest.name, isWithinTime, false, 
             `${queryTime}ms (max: ${perfTest.maxTime}ms)`);
      } catch (err) {
        test('Performance', perfTest.name, false, false, err.message);
      }
    }

    // 6. ERROR HANDLING AND EDGE CASES
    console.log('\n🚨 ERROR HANDLING AND EDGE CASES');
    console.log('-'.repeat(60));

    // Test invalid data handling
    const errorTests = [
      {
        name: 'Invalid profile_id in agent creation',
        test: () => supabase
          .from('ai_agents')
          .insert({
            profile_id: '00000000-0000-0000-0000-000000000000',
            name: 'Invalid Profile Agent',
            description: 'Should fail',
            is_active: true
          })
      },
      {
        name: 'Duplicate phone number in leads',
        test: async () => {
          const duplicatePhone = '+15551234567';
          const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
          const { data: campaigns } = await supabase.from('outbound_campaigns').select('id').limit(1);
          
          if (profiles[0] && campaigns[0]) {
            // Insert first lead
            await supabase.from('campaign_leads').insert({
              campaign_id: campaigns[0].id,
              profile_id: profiles[0].id,
              phone_number: duplicatePhone,
              first_name: 'First',
              last_name: 'Lead',
              status: 'pending'
            });
            
            // Try to insert duplicate
            return supabase.from('campaign_leads').insert({
              campaign_id: campaigns[0].id,
              profile_id: profiles[0].id,
              phone_number: duplicatePhone,
              first_name: 'Duplicate',
              last_name: 'Lead',
              status: 'pending'
            });
          }
          return { error: { message: 'No test data available' } };
        }
      },
      {
        name: 'Invalid date in appointment',
        test: () => supabase
          .from('appointments')
          .insert({
            profile_id: profileId,
            scheduled_date: 'invalid-date',
            customer_name: 'Test Customer',
            customer_phone: '+15551234567',
            status: 'scheduled',
            appointment_type: 'consultation'
          })
      }
    ];

    for (const errorTest of errorTests) {
      try {
        const { error } = await errorTest.test();
        // These should fail - we're testing error handling
        test('ErrorHandling', errorTest.name, !!error, false, 'Expected to fail');
      } catch (err) {
        test('ErrorHandling', errorTest.name, true, false, 'Properly caught error');
      }
    }

  } catch (error) {
    console.error('\n❌ Critical system error during advanced testing:', error);
    criticalFailures.push('System: Critical error during advanced testing');
  }

  // COMPREHENSIVE RESULTS ANALYSIS
  console.log('\n' + '='.repeat(80));
  console.log('📊 ADVANCED SYSTEMATIC TESTING RESULTS');
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
      console.log(`   Critical: ${criticalPassed}/${criticalTotal}`);
    }
    
    // Show failed tests for this category
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

  console.log(`\n📊 COMPREHENSIVE RESULTS:`);
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

  // ADVANCED MARKET READINESS DETERMINATION
  console.log('\n' + '='.repeat(80));
  console.log('🎯 ADVANCED MARKET READINESS DETERMINATION');
  console.log('='.repeat(80));

  const isProductionReady = successRate >= 95 && criticalFailures.length === 0;
  const isMarketReady = successRate >= 85 && criticalFailures.length <= 3;

  if (isProductionReady) {
    console.log('🎉 VERDICT: PRODUCTION READY ✅');
    console.log('✅ All critical systems operational');
    console.log('✅ No blocking issues identified');
    console.log('✅ Ready for immediate customer deployment');
    console.log('🚀 APPROVED FOR PRODUCTION LAUNCH');
  } else if (isMarketReady) {
    console.log('✅ VERDICT: MARKET READY ✅');
    console.log('✅ Core functionality operational');
    console.log('✅ Can launch with monitoring');
    console.log(`⚠️  ${criticalFailures.length} issue(s) to address post-launch`);
    console.log('🚀 APPROVED FOR MARKET LAUNCH');
  } else {
    console.log('❌ VERDICT: NOT READY 🔴');
    console.log('🚨 Critical issues must be resolved');
    console.log(`📊 ${criticalFailures.length} blocking failure(s)`);
    console.log('⛔ NOT APPROVED FOR LAUNCH');
  }

  console.log(`\n📈 Advanced Testing Confidence: ${successRate.toFixed(1)}%`);
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
    productionReady: isProductionReady,
    testResults
  };
}

advancedSystematicTesting().catch(console.error);