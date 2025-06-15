#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
    console.log('🚀 Setting up AI Calling V14 Database Schema...');
    console.log('=' .repeat(60));
    
    try {
        // Read the SQL schema file
        const sqlSchema = readFileSync('./create-database-schema.sql', 'utf8');
        
        // Split into individual statements (basic splitting)
        const statements = sqlSchema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.trim().length === 0) {
                continue;
            }
            
            try {
                console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
                
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql: statement + ';'
                }).catch(async () => {
                    // Fallback: try direct execution for simple statements
                    if (statement.toLowerCase().includes('create table')) {
                        // For CREATE TABLE statements, we'll handle them differently
                        return { data: null, error: { message: 'Using fallback method' } };
                    }
                    return { data: null, error: { message: 'Statement execution failed' } };
                });
                
                if (error) {
                    console.log(`    ⚠️  Statement ${i + 1}: ${error.message}`);
                    errorCount++;
                } else {
                    console.log(`    ✅ Statement ${i + 1}: Success`);
                    successCount++;
                }
                
            } catch (err) {
                console.log(`    ❌ Statement ${i + 1}: ${err.message}`);
                errorCount++;
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n📊 SETUP SUMMARY:');
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log(`📈 Success Rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
        
        // Test the setup by checking if key tables exist
        console.log('\n🔍 Verifying setup...');
        await verifySetup();
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
    }
}

async function verifySetup() {
    const testTables = ['users', 'agents', 'calls', 'campaigns'];
    
    for (const table of testTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
                
            if (error) {
                console.log(`❌ Table ${table}: ${error.message}`);
            } else {
                console.log(`✅ Table ${table}: OK (${count || 0} records)`);
            }
        } catch (err) {
            console.log(`❌ Table ${table}: ${err.message}`);
        }
    }
    
    // Test admin user creation
    try {
        const { data: adminUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'gamblerspassion@gmail.com')
            .single();
            
        if (error) {
            console.log('⚠️  Admin user: Not found or error');
        } else {
            console.log(`✅ Admin user: Found (${adminUser.role}, ${adminUser.subscription_plan})`);
        }
    } catch (err) {
        console.log('⚠️  Admin user check failed');
    }
}

// Alternative method: Create tables using Supabase client
async function createTablesDirectly() {
    console.log('\n🔄 Creating tables using direct method...');
    
    const tables = [
        {
            name: 'users',
            sql: `
                CREATE TABLE IF NOT EXISTS public.users (
                    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    subscription_plan TEXT NOT NULL DEFAULT 'basic',
                    minutes_used INTEGER NOT NULL DEFAULT 0,
                    minutes_limit INTEGER NOT NULL DEFAULT 1000,
                    max_agents INTEGER NOT NULL DEFAULT 3,
                    allowed_features JSONB DEFAULT '["calls", "agents", "analytics"]'::jsonb,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        },
        {
            name: 'agents',
            sql: `
                CREATE TABLE IF NOT EXISTS public.agents (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    voice TEXT NOT NULL DEFAULT 'Puck',
                    language TEXT NOT NULL DEFAULT 'en-US',
                    phone_number TEXT,
                    system_prompt TEXT NOT NULL,
                    max_concurrent_calls INTEGER NOT NULL DEFAULT 1,
                    operating_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}'::jsonb,
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        }
    ];
    
    for (const table of tables) {
        try {
            console.log(`📋 Creating table: ${table.name}`);
            
            // Use a simple approach - just try to query the table first
            const { data, error } = await supabase
                .from(table.name)
                .select('*')
                .limit(0);
                
            if (error && error.message.includes('does not exist')) {
                console.log(`    ⚠️  Table ${table.name} doesn't exist, needs manual creation`);
            } else {
                console.log(`    ✅ Table ${table.name} already exists`);
            }
            
        } catch (err) {
            console.log(`    ❌ Error checking table ${table.name}: ${err.message}`);
        }
    }
}

// Run setup
setupDatabase().then(() => {
    console.log('\n🎉 Database setup completed!');
    console.log('\n💡 If tables are missing, please run the SQL manually in Supabase SQL Editor:');
    console.log('   1. Go to https://supabase.com/dashboard/project/wllyticlzvtsimgefsti/sql');
    console.log('   2. Copy and paste the contents of create-database-schema.sql');
    console.log('   3. Click "Run" to execute the schema');
}).catch(console.error);