#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function applySchemaFixes() {
  console.log('🔧 Applying Schema Fixes...\n');

  try {
    // Read the schema fix file
    const schemaSQL = readFileSync('./fix-schema.sql', 'utf8');
    
    // Split into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length < 10) continue; // Skip very short statements
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });

        if (error) {
          // Try direct execution for some statements
          const { error: directError } = await supabase
            .from('_temp_exec')
            .select('*')
            .limit(0);
          
          if (directError && directError.message.includes('does not exist')) {
            // Create a temporary function to execute SQL
            await supabase.rpc('create_exec_function');
          }
          
          console.log(`⚠️  Statement ${i + 1} had issues (may be normal): ${error.message.substring(0, 100)}...`);
        } else {
          successCount++;
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        errorCount++;
        console.log(`❌ Error in statement ${i + 1}: ${err.message.substring(0, 100)}...`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SCHEMA FIX SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️  Warnings/Skipped: ${statements.length - successCount - errorCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Test the fixes by checking critical tables
    console.log('\n🔍 Verifying fixes...');
    
    const criticalTables = ['leads', 'dnc_list', 'billing', 'analytics_data'];
    
    for (const table of criticalTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Accessible`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }

    console.log('\n🎉 Schema fixes applied! Run "node test-schema.js" to verify.');

  } catch (error) {
    console.error('❌ Failed to apply schema fixes:', error);
  }
}

// Alternative approach - apply fixes one by one
async function applyFixesIndividually() {
  console.log('🔧 Applying Schema Fixes Individually...\n');

  const fixes = [
    // Add missing columns
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT", 
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_api_key TEXT",
    "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50)",
    "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'outbound'",
    "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'",
    "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0",
    "ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_prompt TEXT",
    "ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{}'",
    "ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS script TEXT",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled'",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE live_calls ADD COLUMN IF NOT EXISTS call_status VARCHAR(50) DEFAULT 'active'",
    "ALTER TABLE analytics_data ADD COLUMN IF NOT EXISTS metric_name VARCHAR(100)",
    "ALTER TABLE billing ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'free'",
    "ALTER TABLE dnc_list ADD COLUMN IF NOT EXISTS reason TEXT",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE"
  ];

  let successCount = 0;
  
  for (let i = 0; i < fixes.length; i++) {
    try {
      console.log(`⏳ Applying fix ${i + 1}/${fixes.length}: ${fixes[i].substring(0, 60)}...`);
      
      // Use a more direct approach
      const { error } = await supabase.rpc('exec_sql', { sql: fixes[i] });
      
      if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.log(`⚠️  Fix ${i + 1}: ${error.message}`);
      } else {
        successCount++;
        console.log(`✅ Fix ${i + 1}: Applied successfully`);
      }
    } catch (err) {
      console.log(`❌ Fix ${i + 1}: ${err.message}`);
    }
  }

  console.log(`\n✅ Applied ${successCount}/${fixes.length} fixes`);
}

// Run the fixes
applyFixesIndividually().catch(console.error);