import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFixesDirectly() {
    console.log('🔧 Applying schema fixes directly to Supabase...\n');
    
    const fixes = [
        // Add missing columns
        'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT',
        'ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS phone_number TEXT',
        'ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_prompt TEXT',
        'ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT',
        'ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE',
        'ALTER TABLE live_calls ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE',
        
        // Update existing data
        'UPDATE profiles SET full_name = client_name WHERE full_name IS NULL',
        'UPDATE call_logs SET phone_number = phone_number_to WHERE phone_number IS NULL',
        'UPDATE ai_agents SET system_prompt = system_instruction WHERE system_prompt IS NULL',
        'UPDATE appointments SET appointment_date = scheduled_date WHERE appointment_date IS NULL',
        'UPDATE live_calls SET call_id = call_log_id WHERE call_id IS NULL',
        
        // Create missing tables
        `CREATE TABLE IF NOT EXISTS call_recordings (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
            recording_url TEXT,
            duration INTEGER,
            file_size BIGINT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        )`,
        
        `CREATE TABLE IF NOT EXISTS agent_performance (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
            calls_handled INTEGER DEFAULT 0,
            avg_duration DECIMAL(8,2),
            success_rate DECIMAL(5,2),
            date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            UNIQUE(profile_id, agent_id, date)
        )`,
        
        // Enable RLS
        'ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY',
        'ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY'
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < fixes.length; i++) {
        const sql = fixes[i];
        console.log(`⏳ Executing fix ${i + 1}/${fixes.length}...`);
        
        try {
            const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
            
            if (error) {
                console.log(`❌ Fix ${i + 1} failed: ${error.message}`);
                errorCount++;
            } else {
                console.log(`✅ Fix ${i + 1} applied successfully`);
                successCount++;
            }
        } catch (err) {
            console.log(`❌ Fix ${i + 1} error: ${err.message}`);
            errorCount++;
        }
    }
    
    // Create views (these might need to be done separately)
    const views = [
        'CREATE OR REPLACE VIEW leads AS SELECT * FROM campaign_leads',
        'CREATE OR REPLACE VIEW dnc_list AS SELECT * FROM dnc_lists',
        'CREATE OR REPLACE VIEW billing AS SELECT * FROM subscriptions',
        'CREATE OR REPLACE VIEW analytics_data AS SELECT * FROM call_analytics'
    ];
    
    console.log('\n📊 Creating views...');
    for (let i = 0; i < views.length; i++) {
        const sql = views[i];
        console.log(`⏳ Creating view ${i + 1}/${views.length}...`);
        
        try {
            const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
            
            if (error) {
                console.log(`❌ View ${i + 1} failed: ${error.message}`);
                errorCount++;
            } else {
                console.log(`✅ View ${i + 1} created successfully`);
                successCount++;
            }
        } catch (err) {
            console.log(`❌ View ${i + 1} error: ${err.message}`);
            errorCount++;
        }
    }
    
    console.log('\n📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    
    if (errorCount > 0) {
        console.log('\n⚠️  Some operations failed. This might be due to Supabase RPC limitations.');
        console.log('You may need to run the SQL manually in the Supabase dashboard.');
    } else {
        console.log('\n🎉 All schema fixes applied successfully!');
        console.log('Run the schema test again to verify: node test-schema.js');
    }
}

applyFixesDirectly().catch(console.error);