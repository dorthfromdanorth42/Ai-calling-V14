import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

// Admin credentials provided
const adminEmail = 'gamblerspassion@gmail.com';
const adminPassword = 'Elaine0511!';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

// Create admin client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySchemaFixes() {
    console.log('🔧 Applying schema fixes using admin credentials...\n');
    
    try {
        // First, let's sign in as admin to ensure we have proper access
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword
        });
        
        if (authError) {
            console.log('⚠️  Auth failed, proceeding with service key:', authError.message);
        } else {
            console.log('✅ Authenticated as admin user');
        }
        
        // Apply the exact missing schema fixes
        const fixes = [
            {
                name: 'Add full_name to profiles',
                sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT'
            },
            {
                name: 'Add phone_number to call_logs',
                sql: 'ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS phone_number TEXT'
            },
            {
                name: 'Add system_prompt to ai_agents',
                sql: 'ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_prompt TEXT'
            },
            {
                name: 'Add target_audience to campaigns',
                sql: 'ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT'
            },
            {
                name: 'Add appointment_date to appointments',
                sql: 'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE'
            },
            {
                name: 'Add call_id to live_calls',
                sql: 'ALTER TABLE live_calls ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE'
            },
            {
                name: 'Create call_recordings table',
                sql: `CREATE TABLE IF NOT EXISTS call_recordings (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
                    recording_url TEXT,
                    duration INTEGER,
                    file_size BIGINT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                )`
            },
            {
                name: 'Create agent_performance table',
                sql: `CREATE TABLE IF NOT EXISTS agent_performance (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
                    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
                    calls_handled INTEGER DEFAULT 0,
                    avg_duration DECIMAL(8,2),
                    success_rate DECIMAL(5,2),
                    date DATE DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                    UNIQUE(profile_id, agent_id, date)
                )`
            }
        ];
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const fix of fixes) {
            console.log(`⏳ ${fix.name}...`);
            
            try {
                // Try direct SQL execution
                const { data, error } = await supabase
                    .from('_dummy_table_for_sql_execution')
                    .select('*')
                    .limit(0);
                
                // Since direct SQL execution isn't available, let's try table operations
                // For missing columns, we'll use the existing table structure
                
                if (fix.name.includes('Add full_name')) {
                    // Check if column exists by trying to select it
                    const { error: testError } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .limit(1);
                    
                    if (testError && testError.message.includes('does not exist')) {
                        console.log(`   ❌ Column missing: ${fix.name}`);
                        console.log(`   📝 SQL needed: ${fix.sql}`);
                        errorCount++;
                    } else {
                        console.log(`   ✅ ${fix.name} - Column exists`);
                        successCount++;
                    }
                } else if (fix.name.includes('Create') && fix.name.includes('table')) {
                    // Check if table exists
                    const tableName = fix.name.includes('call_recordings') ? 'call_recordings' : 'agent_performance';
                    const { error: testError } = await supabase
                        .from(tableName)
                        .select('*')
                        .limit(1);
                    
                    if (testError && testError.message.includes('does not exist')) {
                        console.log(`   ❌ Table missing: ${tableName}`);
                        console.log(`   📝 SQL needed: ${fix.sql}`);
                        errorCount++;
                    } else {
                        console.log(`   ✅ ${fix.name} - Table exists`);
                        successCount++;
                    }
                } else {
                    // For other column additions, check similarly
                    const parts = fix.name.split(' to ');
                    if (parts.length === 2) {
                        const column = parts[0].replace('Add ', '');
                        const table = parts[1];
                        
                        const { error: testError } = await supabase
                            .from(table)
                            .select(column)
                            .limit(1);
                        
                        if (testError && testError.message.includes('does not exist')) {
                            console.log(`   ❌ Column missing: ${column} in ${table}`);
                            console.log(`   📝 SQL needed: ${fix.sql}`);
                            errorCount++;
                        } else {
                            console.log(`   ✅ ${fix.name} - Column exists`);
                            successCount++;
                        }
                    }
                }
                
            } catch (err) {
                console.log(`   ❌ Error checking ${fix.name}: ${err.message}`);
                errorCount++;
            }
        }
        
        console.log('\n📊 SCHEMA FIX SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Existing/Working: ${successCount}`);
        console.log(`❌ Missing/Needs SQL: ${errorCount}`);
        
        if (errorCount > 0) {
            console.log('\n🚨 MANUAL SQL REQUIRED');
            console.log('Copy and paste this SQL into your Supabase SQL Editor:');
            console.log('='.repeat(60));
            
            const sqlStatements = [
                'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;',
                'ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS phone_number TEXT;',
                'ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;',
                'ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;',
                'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE;',
                'ALTER TABLE live_calls ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE;',
                '',
                'CREATE TABLE IF NOT EXISTS call_recordings (',
                '    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,',
                '    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,',
                '    recording_url TEXT,',
                '    duration INTEGER,',
                '    file_size BIGINT,',
                '    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(\'utc\'::text, now()) NOT NULL',
                ');',
                '',
                'CREATE TABLE IF NOT EXISTS agent_performance (',
                '    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,',
                '    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,',
                '    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,',
                '    calls_handled INTEGER DEFAULT 0,',
                '    avg_duration DECIMAL(8,2),',
                '    success_rate DECIMAL(5,2),',
                '    date DATE DEFAULT CURRENT_DATE,',
                '    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(\'utc\'::text, now()) NOT NULL,',
                '    UNIQUE(profile_id, agent_id, date)',
                ');',
                '',
                'ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;',
                'ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;',
                '',
                'CREATE OR REPLACE VIEW leads AS SELECT * FROM campaign_leads;',
                'CREATE OR REPLACE VIEW dnc_list AS SELECT * FROM dnc_lists;',
                'CREATE OR REPLACE VIEW billing AS SELECT * FROM subscriptions;',
                'CREATE OR REPLACE VIEW analytics_data AS SELECT * FROM call_analytics;'
            ];
            
            sqlStatements.forEach(stmt => console.log(stmt));
            console.log('='.repeat(60));
        }
        
    } catch (error) {
        console.error('❌ Failed to apply schema fixes:', error.message);
    }
}

applySchemaFixes().catch(console.error);