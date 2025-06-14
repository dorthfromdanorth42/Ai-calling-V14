import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testButtonFunctionality() {
    console.log('🔍 TESTING ALL BUTTON FUNCTIONALITY\n');
    console.log('='.repeat(60));
    
    // Test database operations that buttons would trigger
    const buttonTests = [
        {
            name: 'Create AI Agent Button',
            test: async () => {
                const { data, error } = await supabase
                    .from('ai_agents')
                    .insert({
                        profile_id: '00000000-0000-0000-0000-000000000001', // test user
                        name: 'Test Agent',
                        description: 'Test agent for button functionality',
                        agent_type: 'customer_service',
                        voice_name: 'Puck',
                        system_instruction: 'You are a helpful assistant'
                    })
                    .select();
                
                if (error) throw error;
                
                // Clean up test data
                if (data && data[0]) {
                    await supabase.from('ai_agents').delete().eq('id', data[0].id);
                }
                
                return 'Agent creation/deletion works';
            }
        },
        {
            name: 'Create Campaign Button',
            test: async () => {
                const { data, error } = await supabase
                    .from('outbound_campaigns')
                    .insert({
                        profile_id: '00000000-0000-0000-0000-000000000001',
                        name: 'Test Campaign',
                        description: 'Test campaign for button functionality',
                        caller_id: '+1234567890',
                        status: 'draft'
                    })
                    .select();
                
                if (error) throw error;
                
                // Clean up
                if (data && data[0]) {
                    await supabase.from('outbound_campaigns').delete().eq('id', data[0].id);
                }
                
                return 'Campaign creation/deletion works';
            }
        },
        {
            name: 'Schedule Appointment Button',
            test: async () => {
                const { data, error } = await supabase
                    .from('appointments')
                    .insert({
                        profile_id: '00000000-0000-0000-0000-000000000001',
                        customer_name: 'Test Customer',
                        customer_phone: '+1234567890',
                        appointment_type: 'consultation',
                        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                    })
                    .select();
                
                if (error) throw error;
                
                // Clean up
                if (data && data[0]) {
                    await supabase.from('appointments').delete().eq('id', data[0].id);
                }
                
                return 'Appointment scheduling works';
            }
        },
        {
            name: 'Add Lead Button',
            test: async () => {
                // First create a campaign to add lead to
                const { data: campaignData, error: campaignError } = await supabase
                    .from('outbound_campaigns')
                    .insert({
                        profile_id: '00000000-0000-0000-0000-000000000001',
                        name: 'Test Campaign for Lead',
                        caller_id: '+1234567890'
                    })
                    .select();
                
                if (campaignError) throw campaignError;
                
                const { data, error } = await supabase
                    .from('campaign_leads')
                    .insert({
                        campaign_id: campaignData[0].id,
                        phone_number: '+1234567890',
                        first_name: 'Test',
                        last_name: 'Lead'
                    })
                    .select();
                
                if (error) throw error;
                
                // Clean up
                if (data && data[0]) {
                    await supabase.from('campaign_leads').delete().eq('id', data[0].id);
                }
                await supabase.from('outbound_campaigns').delete().eq('id', campaignData[0].id);
                
                return 'Lead creation works';
            }
        },
        {
            name: 'Add to DNC Button',
            test: async () => {
                const { data, error } = await supabase
                    .from('dnc_lists')
                    .insert({
                        profile_id: '00000000-0000-0000-0000-000000000001',
                        phone_number: '+1234567890',
                        source: 'manual',
                        notes: 'Test DNC entry'
                    })
                    .select();
                
                if (error) throw error;
                
                // Clean up
                if (data && data[0]) {
                    await supabase.from('dnc_lists').delete().eq('id', data[0].id);
                }
                
                return 'DNC list management works';
            }
        },
        {
            name: 'Create Webhook Button',
            test: async () => {
                const { data, error } = await supabase
                    .from('webhooks')
                    .insert({
                        profile_id: '00000000-0000-0000-0000-000000000001',
                        name: 'Test Webhook',
                        url: 'https://example.com/webhook',
                        events: ['call.completed', 'call.started']
                    })
                    .select();
                
                if (error) throw error;
                
                // Clean up
                if (data && data[0]) {
                    await supabase.from('webhooks').delete().eq('id', data[0].id);
                }
                
                return 'Webhook creation works';
            }
        },
        {
            name: 'Update Profile Button',
            test: async () => {
                // Test profile update functionality
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .limit(1);
                
                if (error) throw error;
                
                if (data && data[0]) {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ client_name: 'Test Update' })
                        .eq('id', data[0].id);
                    
                    if (updateError) throw updateError;
                }
                
                return 'Profile updates work';
            }
        },
        {
            name: 'Start/Stop Campaign Button',
            test: async () => {
                const { data, error } = await supabase
                    .from('outbound_campaigns')
                    .insert({
                        profile_id: '00000000-0000-0000-0000-000000000001',
                        name: 'Test Campaign Status',
                        caller_id: '+1234567890',
                        status: 'draft'
                    })
                    .select();
                
                if (error) throw error;
                
                // Test status updates
                const { error: updateError } = await supabase
                    .from('outbound_campaigns')
                    .update({ status: 'active' })
                    .eq('id', data[0].id);
                
                if (updateError) throw updateError;
                
                const { error: stopError } = await supabase
                    .from('outbound_campaigns')
                    .update({ status: 'paused' })
                    .eq('id', data[0].id);
                
                if (stopError) throw stopError;
                
                // Clean up
                await supabase.from('outbound_campaigns').delete().eq('id', data[0].id);
                
                return 'Campaign start/stop works';
            }
        }
    ];
    
    let passedTests = 0;
    let failedTests = 0;
    const failures = [];
    
    for (const test of buttonTests) {
        console.log(`⏳ Testing: ${test.name}...`);
        
        try {
            const result = await test.test();
            console.log(`   ✅ ${result}`);
            passedTests++;
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            failures.push({ name: test.name, error: error.message });
            failedTests++;
        }
    }
    
    console.log('\n📊 BUTTON FUNCTIONALITY TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passedTests}/${buttonTests.length}`);
    console.log(`❌ Failed: ${failedTests}/${buttonTests.length}`);
    
    if (failures.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        failures.forEach(failure => {
            console.log(`   - ${failure.name}: ${failure.error}`);
        });
        
        console.log('\n🔧 COMMON FIXES NEEDED:');
        
        if (failures.some(f => f.error.includes('does not exist'))) {
            console.log('   - Apply the schema fixes first (missing tables/columns)');
        }
        
        if (failures.some(f => f.error.includes('violates row-level security'))) {
            console.log('   - RLS policies need to be configured properly');
        }
        
        if (failures.some(f => f.error.includes('violates foreign key'))) {
            console.log('   - Foreign key constraints need valid references');
        }
    } else {
        console.log('\n🎉 ALL BUTTON FUNCTIONALITY TESTS PASSED!');
        console.log('The dashboard buttons should work correctly.');
    }
    
    // Test API endpoints that buttons call
    console.log('\n🌐 TESTING API ENDPOINTS...');
    
    try {
        const healthResponse = await fetch('http://localhost:12001/health');
        if (healthResponse.ok) {
            console.log('✅ Server health endpoint working');
        } else {
            console.log('❌ Server health endpoint not responding');
        }
    } catch (error) {
        console.log('❌ Server not running - start with npm run start-services');
    }
    
    return {
        passed: passedTests,
        failed: failedTests,
        total: buttonTests.length,
        failures
    };
}

testButtonFunctionality().catch(console.error);