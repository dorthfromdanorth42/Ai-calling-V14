import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

async function applySchemaFix() {
    console.log('🔧 Applying Schema Fixes...\n');
    
    try {
        // Read the SQL file
        const sqlContent = readFileSync('./fix-schema.sql', 'utf8');
        
        // Split into individual statements (basic splitting by semicolon)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.trim().length === 0) {
                continue;
            }
            
            try {
                console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
                
                const { data, error } = await supabase.rpc('exec_sql', { 
                    sql_query: statement 
                });
                
                if (error) {
                    // Try direct execution if RPC fails
                    const { error: directError } = await supabase
                        .from('_temp_table_that_does_not_exist')
                        .select('*');
                    
                    // If it's a table creation or alteration, we need to use a different approach
                    console.log(`⚠️  Statement ${i + 1} may need manual execution: ${error.message}`);
                    errorCount++;
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                    successCount++;
                }
                
            } catch (err) {
                console.log(`❌ Error in statement ${i + 1}: ${err.message}`);
                errorCount++;
            }
        }
        
        console.log('\n📊 SCHEMA FIX SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Successful statements: ${successCount}`);
        console.log(`❌ Failed statements: ${errorCount}`);
        
        if (errorCount > 0) {
            console.log('\n⚠️  Some statements failed. You may need to run them manually in Supabase SQL Editor.');
            console.log('📋 Copy the contents of fix-schema.sql and run it in your Supabase dashboard.');
        }
        
    } catch (error) {
        console.error('❌ Failed to apply schema fixes:', error.message);
    }
}

// Alternative: Create a simple test to verify the fixes worked
async function verifyFixes() {
    console.log('\n🔍 Verifying Schema Fixes...\n');
    
    const testQueries = [
        { table: 'profiles', column: 'full_name', query: 'SELECT full_name FROM profiles LIMIT 1' },
        { table: 'call_logs', column: 'phone_number', query: 'SELECT phone_number FROM call_logs LIMIT 1' },
        { table: 'leads', column: 'name', query: 'SELECT name FROM leads LIMIT 1' },
        { table: 'dnc_list', column: 'phone_number', query: 'SELECT phone_number FROM dnc_list LIMIT 1' },
        { table: 'billing', column: 'plan_type', query: 'SELECT plan_type FROM billing LIMIT 1' }
    ];
    
    for (const test of testQueries) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: test.query });
            
            if (error) {
                console.log(`❌ ${test.table}.${test.column} - Still missing or inaccessible`);
            } else {
                console.log(`✅ ${test.table}.${test.column} - Available`);
            }
        } catch (err) {
            console.log(`⚠️  ${test.table}.${test.column} - Could not verify: ${err.message}`);
        }
    }
}

// Since Supabase doesn't allow direct SQL execution via the client,
// let's just output the SQL for manual execution
console.log('🔧 SCHEMA FIX REQUIRED\n');
console.log('Due to Supabase security restrictions, you need to manually run the SQL fixes.');
console.log('Please follow these steps:\n');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the contents of fix-schema.sql');
console.log('4. Run the SQL script');
console.log('\nAlternatively, here are the critical missing tables that need to be created:\n');

const criticalTables = [
    'leads',
    'dnc_list', 
    'billing',
    'analytics_data',
    'call_recordings',
    'agent_performance'
];

console.log('❌ MISSING TABLES:');
criticalTables.forEach(table => console.log(`   - ${table}`));

console.log('\n⚠️  MISSING COLUMNS:');
console.log('   - profiles.full_name');
console.log('   - call_logs.phone_number');
console.log('   - ai_agents.system_prompt');
console.log('   - campaigns.target_audience');
console.log('   - appointments.appointment_date');
console.log('   - live_calls.call_id');

console.log('\n📋 The fix-schema.sql file contains all necessary fixes.');
console.log('🚀 After applying the fixes, re-run the schema test with: node test-schema.js');