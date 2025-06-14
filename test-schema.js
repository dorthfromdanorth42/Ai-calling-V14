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

// Expected tables and their critical columns based on the application code
const expectedSchema = {
    profiles: ['id', 'email', 'full_name', 'created_at', 'updated_at'],
    call_logs: ['id', 'profile_id', 'phone_number', 'direction', 'status', 'duration', 'created_at', 'updated_at'],
    ai_agents: ['id', 'profile_id', 'name', 'description', 'system_prompt', 'voice_settings', 'is_active', 'created_at', 'updated_at'],
    campaigns: ['id', 'profile_id', 'name', 'description', 'status', 'target_audience', 'script', 'created_at', 'updated_at'],
    appointments: ['id', 'profile_id', 'customer_name', 'customer_phone', 'appointment_date', 'status', 'notes', 'created_at', 'updated_at'],
    leads: ['id', 'profile_id', 'name', 'phone', 'email', 'status', 'source', 'created_at', 'updated_at'],
    dnc_list: ['id', 'profile_id', 'phone_number', 'reason', 'created_at'],
    webhooks: ['id', 'profile_id', 'name', 'url', 'events', 'is_active', 'created_at', 'updated_at'],
    billing: ['id', 'profile_id', 'plan_type', 'status', 'current_period_start', 'current_period_end', 'created_at', 'updated_at'],
    live_calls: ['id', 'profile_id', 'call_id', 'agent_name', 'customer_phone', 'call_status', 'created_at', 'updated_at'],
    function_call_logs: ['id', 'profile_id', 'call_id', 'function_name', 'parameters', 'result', 'success', 'created_at'],
    analytics_data: ['id', 'profile_id', 'metric_name', 'metric_value', 'date', 'created_at'],
    call_recordings: ['id', 'call_id', 'recording_url', 'duration', 'created_at'],
    agent_performance: ['id', 'profile_id', 'agent_id', 'calls_handled', 'avg_duration', 'success_rate', 'date', 'created_at']
};

async function testSchema() {
    console.log('🔍 Testing Supabase Schema Compatibility...\n');
    
    const results = {
        existing: [],
        missing: [],
        columnIssues: []
    };

    // Test connection first
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Database connection successful\n');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return;
    }

    // Check each expected table
    for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
        console.log(`📋 Checking table: ${tableName}`);
        
        try {
            // Try to query the table to see if it exists
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    console.log(`   ❌ Table missing: ${tableName}`);
                    results.missing.push(tableName);
                } else {
                    console.log(`   ⚠️  Table error: ${tableName} - ${error.message}`);
                    results.columnIssues.push({ table: tableName, error: error.message });
                }
            } else {
                console.log(`   ✅ Table exists: ${tableName}`);
                results.existing.push(tableName);
                
                // Check if we can get column info by trying to select specific columns
                try {
                    const selectColumns = expectedColumns.join(', ');
                    const { error: colError } = await supabase
                        .from(tableName)
                        .select(selectColumns)
                        .limit(1);
                    
                    if (colError) {
                        console.log(`   ⚠️  Column issues in ${tableName}: ${colError.message}`);
                        results.columnIssues.push({ table: tableName, error: colError.message });
                    } else {
                        console.log(`   ✅ All expected columns present in ${tableName}`);
                    }
                } catch (colError) {
                    console.log(`   ⚠️  Could not verify columns in ${tableName}: ${colError.message}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ Error checking ${tableName}: ${error.message}`);
            results.columnIssues.push({ table: tableName, error: error.message });
        }
        
        console.log(''); // Empty line for readability
    }

    // Summary
    console.log('📊 SCHEMA TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Existing tables: ${results.existing.length}`);
    console.log(`❌ Missing tables: ${results.missing.length}`);
    console.log(`⚠️  Tables with issues: ${results.columnIssues.length}`);
    
    if (results.missing.length > 0) {
        console.log('\n❌ MISSING TABLES:');
        results.missing.forEach(table => console.log(`   - ${table}`));
    }
    
    if (results.columnIssues.length > 0) {
        console.log('\n⚠️  TABLE ISSUES:');
        results.columnIssues.forEach(issue => {
            console.log(`   - ${issue.table}: ${issue.error}`);
        });
    }

    // Test RLS policies
    console.log('\n🔒 Testing Row Level Security...');
    try {
        // Test with anon key to see if RLS is working
        const anonSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { data, error } = await anonSupabase.from('profiles').select('*').limit(1);
        
        if (error && error.code === 'PGRST301') {
            console.log('✅ RLS is properly configured (access denied for anonymous users)');
        } else if (data) {
            console.log('⚠️  RLS may not be properly configured (anonymous access allowed)');
        } else {
            console.log(`⚠️  RLS test inconclusive: ${error?.message}`);
        }
    } catch (error) {
        console.log(`⚠️  Could not test RLS: ${error.message}`);
    }

    return results;
}

// Run the test
testSchema().catch(console.error);