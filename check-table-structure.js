#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function checkTableStructures() {
  console.log('🔍 CHECKING TABLE STRUCTURES');
  console.log('='.repeat(50));

  const tables = ['ai_agents', 'campaigns', 'leads', 'appointments'];

  for (const table of tables) {
    console.log(`\n📋 ${table.toUpperCase()} TABLE:`);
    
    try {
      // Try to get one record to see the structure
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        if (data && data.length > 0) {
          console.log(`✅ Columns: ${Object.keys(data[0]).join(', ')}`);
        } else {
          // Table exists but is empty, try to insert a minimal record to see required fields
          console.log(`⚠️  Table is empty, checking required fields...`);
        }
      }
    } catch (err) {
      console.log(`❌ Error accessing table: ${err.message}`);
    }
  }

  // Let's also check what columns are actually expected by looking at the schema
  console.log('\n🔍 CHECKING EXPECTED SCHEMA...');
  
  // Check if we can find schema files
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    const schemaFiles = [
      './supabase/migrations',
      './database',
      './schema.sql',
      './supabase.sql'
    ];
    
    for (const schemaPath of schemaFiles) {
      if (fs.existsSync(schemaPath)) {
        console.log(`✅ Found schema at: ${schemaPath}`);
      }
    }
  } catch (err) {
    console.log('No schema files found locally');
  }
}

checkTableStructures().catch(console.error);