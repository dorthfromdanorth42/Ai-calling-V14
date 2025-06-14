import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWithRealUser() {
    console.log('🔍 TESTING BUTTON FUNCTIONALITY WITH REAL USER\n');
    
    // First, let's check what users exist
    console.log('📋 Checking existing users...');
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, client_name')
        .limit(5);
    
    if (profileError) {
        console.log('❌ Error fetching profiles:', profileError.message);
        return;
    }
    
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(profile => {
        console.log(`   - ${profile.email} (${profile.client_name || 'No name'}) - ID: ${profile.id}`);
    });
    
    if (profiles.length === 0) {
        console.log('\n🚨 NO USERS FOUND! Creating test user...');
        
        // Create a test user profile
        const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
                id: '00000000-0000-0000-0000-000000000001',
                email: 'test@example.com',
                client_name: 'Test User',
                company_name: 'Test Company'
            })
            .select();
        
        if (createError) {
            console.log('❌ Error creating test user:', createError.message);
            return;
        }
        
        console.log('✅ Test user created');
        profiles.push(newProfile[0]);
    }
    
    const testUserId = profiles[0].id;
    console.log(`\n🧪 Testing with user: ${profiles[0].email} (${testUserId})\n`);
    
    // Now test button functionality with real user
    const buttonTests = [
        {
            name: 'Create AI Agent',
            test: async () => {
                const { data, error } = await supabase
                    .from('ai_agents')
                    .insert({
                        profile_id: testUserId,
                        name: 'Test Agent',
                        description: 'Test agent for button functionality',
                        agent_type: 'customer_service',
                        voice_name: 'Puck',
                        system_instruction: 'You are a helpful assistant'
                    })
                    .select();
                
                if (error) throw error;
                
                // Clean up
                if (data && data[0]) {
                    await supabase.from('ai_agents').delete().eq('id', data[0].id);
                }
                
                return '✅ Agent CRUD operations work';
            }
        },
        {
            name: 'Create Campaign',
            test: async () => {
                const { data, error } = await supabase
                    .from('outbound_campaigns')
                    .insert({
                        profile_id: testUserId,
                        name: 'Test Campaign',
                        description: 'Test campaign for button functionality',
                        caller_id: '+1234567890',
                        status: 'draft'
                    })
                    .select();
                
                if (error) throw error;
                
                // Test status updates (start/stop buttons)
                const { error: updateError } = await supabase
                    .from('outbound_campaigns')
                    .update({ status: 'active' })
                    .eq('id', data[0].id);
                
                if (updateError) throw updateError;
                
                // Clean up
                await supabase.from('outbound_campaigns').delete().eq('id', data[0].id);
                
                return '✅ Campaign CRUD and status updates work';
            }
        },
        {
            name: 'Schedule Appointment',
            test: async () => {
                const { data, error } = await supabase
                    .from('appointments')
                    .insert({
                        profile_id: testUserId,
                        customer_name: 'Test Customer',
                        customer_phone: '+1234567890',
                        appointment_type: 'consultation',
                        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        status: 'scheduled'
                    })
                    .select();
                
                if (error) throw error;
                
                // Test status updates
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update({ status: 'confirmed' })
                    .eq('id', data[0].id);
                
                if (updateError) throw updateError;
                
                // Clean up
                await supabase.from('appointments').delete().eq('id', data[0].id);
                
                return '✅ Appointment scheduling and updates work';
            }
        },
        {
            name: 'Manage DNC List',
            test: async () => {
                const { data, error } = await supabase
                    .from('dnc_lists')
                    .insert({
                        profile_id: testUserId,
                        phone_number: '+1234567890',
                        source: 'manual',
                        notes: 'Test DNC entry'
                    })
                    .select();
                
                if (error) throw error;
                
                // Clean up
                await supabase.from('dnc_lists').delete().eq('id', data[0].id);
                
                return '✅ DNC list management works';
            }
        },
        {
            name: 'Create Webhook',
            test: async () => {
                const { data, error } = await supabase
                    .from('webhooks')
                    .insert({
                        profile_id: testUserId,
                        name: 'Test Webhook',
                        url: 'https://example.com/webhook',
                        events: ['call.completed', 'call.started']
                    })
                    .select();
                
                if (error) throw error;
                
                // Test webhook toggle
                const { error: updateError } = await supabase
                    .from('webhooks')
                    .update({ is_active: false })
                    .eq('id', data[0].id);
                
                if (updateError) throw updateError;
                
                // Clean up
                await supabase.from('webhooks').delete().eq('id', data[0].id);
                
                return '✅ Webhook creation and toggle work';
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
            console.log(`   ${result}`);
            passedTests++;
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            failures.push({ name: test.name, error: error.message });
            failedTests++;
        }
    }
    
    console.log('\n📊 BUTTON FUNCTIONALITY RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Working: ${passedTests}/${buttonTests.length}`);
    console.log(`❌ Broken: ${failedTests}/${buttonTests.length}`);
    
    if (failures.length > 0) {
        console.log('\n❌ BROKEN BUTTONS:');
        failures.forEach(failure => {
            console.log(`   - ${failure.name}: ${failure.error}`);
        });
        
        console.log('\n🔧 FIXES NEEDED:');
        if (failures.some(f => f.error.includes('does not exist'))) {
            console.log('   - Apply schema fixes (missing tables/columns)');
        }
        if (failures.some(f => f.error.includes('violates row-level security'))) {
            console.log('   - Fix RLS policies');
        }
    } else {
        console.log('\n🎉 ALL BUTTONS ARE FUNCTIONAL!');
    }
    
    // Test specific UI button scenarios
    console.log('\n🖱️  TESTING UI BUTTON SCENARIOS...');
    
    const uiTests = [
        {
            name: 'Agent Toggle (Active/Inactive)',
            test: async () => {
                const { data } = await supabase
                    .from('ai_agents')
                    .select('id, is_active')
                    .eq('profile_id', testUserId)
                    .limit(1);
                
                if (data && data[0]) {
                    const { error } = await supabase
                        .from('ai_agents')
                        .update({ is_active: !data[0].is_active })
                        .eq('id', data[0].id);
                    
                    if (error) throw error;
                    return '✅ Agent toggle works';
                } else {
                    return '⚠️  No agents to test toggle';
                }
            }
        },
        {
            name: 'Campaign Start/Stop/Pause',
            test: async () => {
                const { data } = await supabase
                    .from('outbound_campaigns')
                    .select('id, status')
                    .eq('profile_id', testUserId)
                    .limit(1);
                
                if (data && data[0]) {
                    // Test all status transitions
                    const statuses = ['active', 'paused', 'completed'];
                    for (const status of statuses) {
                        const { error } = await supabase
                            .from('outbound_campaigns')
                            .update({ status })
                            .eq('id', data[0].id);
                        
                        if (error) throw error;
                    }
                    return '✅ Campaign status controls work';
                } else {
                    return '⚠️  No campaigns to test';
                }
            }
        }
    ];
    
    for (const test of uiTests) {
        console.log(`⏳ ${test.name}...`);
        try {
            const result = await test.test();
            console.log(`   ${result}`);
        } catch (error) {
            console.log(`   ❌ ${error.message}`);
        }
    }
    
    return {
        passed: passedTests,
        failed: failedTests,
        total: buttonTests.length
    };
}

testWithRealUser().catch(console.error);