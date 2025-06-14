import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExactMissing() {
    console.log('🔍 CHECKING EXACT MISSING SCHEMA ELEMENTS\n');
    
    // Based on the test results, these are what the app expects vs what exists
    const issues = {
        missingColumns: [
            { table: 'profiles', column: 'full_name', exists: 'client_name' },
            { table: 'call_logs', column: 'phone_number', exists: 'phone_number_from, phone_number_to' },
            { table: 'ai_agents', column: 'system_prompt', exists: 'system_instruction' },
            { table: 'campaigns', column: 'target_audience', exists: false },
            { table: 'appointments', column: 'appointment_date', exists: 'scheduled_date' },
            { table: 'live_calls', column: 'call_id', exists: 'call_log_id' }
        ],
        missingTables: [
            { expected: 'leads', actual: 'campaign_leads' },
            { expected: 'dnc_list', actual: 'dnc_lists' },
            { expected: 'billing', actual: 'subscriptions' },
            { expected: 'analytics_data', actual: 'call_analytics' },
            { expected: 'call_recordings', actual: false },
            { expected: 'agent_performance', actual: false }
        ]
    };

    console.log('📋 COLUMN MAPPING ISSUES:');
    console.log('='.repeat(50));
    
    issues.missingColumns.forEach(issue => {
        console.log(`❌ ${issue.table}.${issue.column}`);
        if (issue.exists) {
            console.log(`   ℹ️  Similar column exists: ${issue.exists}`);
        } else {
            console.log(`   ⚠️  No similar column found`);
        }
    });

    console.log('\n📋 TABLE MAPPING ISSUES:');
    console.log('='.repeat(50));
    
    issues.missingTables.forEach(issue => {
        console.log(`❌ Expected: ${issue.expected}`);
        if (issue.actual) {
            console.log(`   ℹ️  Similar table exists: ${issue.actual}`);
        } else {
            console.log(`   ⚠️  No similar table found`);
        }
    });

    // Now let's check what the app code actually expects
    console.log('\n🔍 ANALYZING APPLICATION EXPECTATIONS...');
    
    // Check if we can create views/aliases to map existing schema to expected names
    const fixes = [];
    
    // 1. Column aliases - these need ALTER TABLE statements
    fixes.push('-- Fix column name mismatches');
    fixes.push('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;');
    fixes.push('UPDATE profiles SET full_name = client_name WHERE full_name IS NULL;');
    
    fixes.push('ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS phone_number TEXT;');
    fixes.push('UPDATE call_logs SET phone_number = phone_number_to WHERE phone_number IS NULL;');
    
    fixes.push('ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;');
    fixes.push('UPDATE ai_agents SET system_prompt = system_instruction WHERE system_prompt IS NULL;');
    
    fixes.push('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;');
    
    fixes.push('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE;');
    fixes.push('UPDATE appointments SET appointment_date = scheduled_date WHERE appointment_date IS NULL;');
    
    fixes.push('ALTER TABLE live_calls ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE;');
    fixes.push('UPDATE live_calls SET call_id = call_log_id WHERE call_id IS NULL;');
    
    // 2. Table aliases - create views for table name mismatches
    fixes.push('');
    fixes.push('-- Create views for table name mismatches');
    fixes.push('CREATE OR REPLACE VIEW leads AS SELECT * FROM campaign_leads;');
    fixes.push('CREATE OR REPLACE VIEW dnc_list AS SELECT * FROM dnc_lists;');
    fixes.push('CREATE OR REPLACE VIEW billing AS SELECT * FROM subscriptions;');
    fixes.push('CREATE OR REPLACE VIEW analytics_data AS SELECT * FROM call_analytics;');
    
    // 3. Missing tables that don't have equivalents
    fixes.push('');
    fixes.push('-- Create missing tables');
    fixes.push(`CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    recording_url TEXT,
    duration INTEGER,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`);

    fixes.push(`CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    calls_handled INTEGER DEFAULT 0,
    avg_duration DECIMAL(8,2),
    success_rate DECIMAL(5,2),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, agent_id, date)
);`);

    fixes.push('');
    fixes.push('-- Enable RLS on new tables');
    fixes.push('ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;');
    fixes.push('ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;');
    
    fixes.push('');
    fixes.push('-- Create RLS policies');
    fixes.push(`CREATE POLICY "Users can view own call recordings" ON call_recordings FOR SELECT USING (
    EXISTS (SELECT 1 FROM call_logs WHERE call_logs.id = call_recordings.call_id AND call_logs.profile_id = auth.uid())
);`);
    fixes.push('CREATE POLICY "Users can view own agent performance" ON agent_performance FOR ALL USING (profile_id = auth.uid());');

    console.log('\n📝 EXACT SQL FIXES NEEDED:');
    console.log('='.repeat(50));
    fixes.forEach(fix => console.log(fix));
    
    return fixes.join('\n');
}

checkExactMissing().catch(console.error);