#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectDatabase() {
    console.log('🔍 Inspecting Supabase Database...');
    
    try {
        // Get all tables
        const { data: tables, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_type', 'BASE TABLE');
            
        if (error) {
            console.log('❌ Could not fetch tables:', error.message);
            
            // Try alternative method
            console.log('🔄 Trying alternative method...');
            const { data: authTables, error: authError } = await supabase.auth.admin.listUsers();
            
            if (authError) {
                console.log('❌ Auth check failed:', authError.message);
            } else {
                console.log('✅ Auth system is working');
                console.log('📊 Users in auth system:', authTables.users?.length || 0);
            }
            
            return;
        }
        
        console.log('📋 Existing tables:');
        if (tables && tables.length > 0) {
            tables.forEach(table => {
                console.log(`  - ${table.table_name}`);
            });
        } else {
            console.log('  No tables found in public schema');
        }
        
    } catch (error) {
        console.error('❌ Database inspection failed:', error.message);
    }
}

inspectDatabase();