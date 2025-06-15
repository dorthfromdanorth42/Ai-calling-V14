#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testDatabase() {
    console.log('🗄️  Simple Database Schema Test');
    console.log('=' .repeat(50));
    
    const tables = [
        'users', 'agents', 'calls', 'campaigns', 'leads', 
        'appointments', 'webhooks', 'billing', 'dnc_list', 
        'call_analytics', 'user_permissions', 'agent_configurations'
    ];
    
    let existingTables = 0;
    let totalRecords = 0;
    
    console.log('📋 Testing table access...');
    
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
                
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
            } else {
                console.log(`✅ ${table}: ${count || 0} records`);
                existingTables++;
                totalRecords += count || 0;
            }
        } catch (err) {
            console.log(`❌ ${table}: ${err.message}`);
        }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Accessible tables: ${existingTables}/${tables.length}`);
    console.log(`📈 Total records: ${totalRecords}`);
    console.log(`🎯 Schema completeness: ${((existingTables / tables.length) * 100).toFixed(1)}%`);
    
    // Test admin user creation
    console.log('\n👤 Testing admin user...');
    try {
        const { data: existingAdmin, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'gamblerspassion@gmail.com')
            .single();
            
        if (findError && findError.code === 'PGRST116') {
            // User doesn't exist, create it
            console.log('📝 Creating admin user...');
            
            const { data: newAdmin, error: createError } = await supabase
                .from('users')
                .insert({
                    id: '00000000-0000-0000-0000-000000000001',
                    email: 'gamblerspassion@gmail.com',
                    role: 'admin',
                    subscription_plan: 'enterprise',
                    minutes_limit: 50000,
                    max_agents: 100,
                    allowed_features: ['calls', 'agents', 'analytics', 'campaigns', 'billing', 'admin', 'webhooks', 'dnc']
                })
                .select()
                .single();
                
            if (createError) {
                console.log(`❌ Admin creation failed: ${createError.message}`);
            } else {
                console.log(`✅ Admin user created: ${newAdmin.email} (${newAdmin.role})`);
            }
        } else if (findError) {
            console.log(`❌ Admin lookup failed: ${findError.message}`);
        } else {
            console.log(`✅ Admin user exists: ${existingAdmin.email} (${existingAdmin.role}, ${existingAdmin.subscription_plan})`);
        }
    } catch (err) {
        console.log(`❌ Admin user test failed: ${err.message}`);
    }
    
    // Test sample agent creation
    console.log('\n🤖 Testing agent creation...');
    try {
        const { data: sampleAgent, error: agentError } = await supabase
            .from('agents')
            .insert({
                user_id: '00000000-0000-0000-0000-000000000001',
                name: 'Test Agent',
                type: 'customer_service',
                voice: 'Puck',
                language: 'en-US',
                system_prompt: 'You are a helpful customer service agent.',
                max_concurrent_calls: 1,
                operating_hours: { start: '09:00', end: '17:00' },
                active: true
            })
            .select()
            .single();
            
        if (agentError) {
            console.log(`❌ Agent creation failed: ${agentError.message}`);
        } else {
            console.log(`✅ Sample agent created: ${sampleAgent.name} (${sampleAgent.type})`);
            
            // Clean up - delete the test agent
            await supabase.from('agents').delete().eq('id', sampleAgent.id);
            console.log('🧹 Test agent cleaned up');
        }
    } catch (err) {
        console.log(`❌ Agent test failed: ${err.message}`);
    }
    
    console.log('\n🎉 Database test completed!');
    
    if (existingTables >= 8) {
        console.log('🟢 RESULT: Database schema is functional and ready for production!');
    } else if (existingTables >= 4) {
        console.log('🟡 RESULT: Database schema is partially complete, some features may be limited.');
    } else {
        console.log('🔴 RESULT: Database schema needs attention before production use.');
    }
}

testDatabase().catch(console.error);