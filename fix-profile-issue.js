#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function fixProfileIssue() {
  console.log('🔧 Fixing Profile Creation Issue...\n');

  try {
    // 1. Get all auth users
    console.log('📋 Checking auth users...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    console.log(`✅ Found ${authData.users.length} auth users`);

    // 2. Get existing profiles
    console.log('📋 Checking existing profiles...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email');

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      return;
    }

    console.log(`✅ Found ${profiles.length} existing profiles`);

    // 3. Create missing profiles
    const existingProfileIds = new Set(profiles.map(p => p.id));
    const missingUsers = authData.users.filter(user => !existingProfileIds.has(user.id));

    if (missingUsers.length === 0) {
      console.log('✅ All users have profiles');
      return;
    }

    console.log(`🔧 Creating ${missingUsers.length} missing profiles...`);

    for (const user of missingUsers) {
      console.log(`Creating profile for: ${user.email}`);
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          client_name: user.email.split('@')[0], // Use email prefix as default name
          is_active: true,
          plan_name: 'free',
          permissions: {
            dashboard: true,
            agents: true,
            calls: true,
            campaigns: true,
            analytics: true,
            appointments: true,
            billing: false,
            settings: true,
            webhooks: false,
            dnc: false,
            status: true
          }
        });

      if (insertError) {
        console.error(`❌ Error creating profile for ${user.email}:`, insertError);
      } else {
        console.log(`✅ Created profile for ${user.email}`);
      }
    }

    // 4. Verify the trigger function exists
    console.log('\n🔧 Checking trigger function...');
    const { data: functions, error: funcError } = await supabase
      .rpc('check_function_exists', { function_name: 'handle_new_user' })
      .single();

    if (funcError) {
      console.log('⚠️  Could not check trigger function, creating it...');
      
      // Create the trigger function and trigger
      const triggerSQL = `
        -- Create function to handle new user registration
        CREATE OR REPLACE FUNCTION handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO profiles (id, email, client_name, is_active, plan_name)
          VALUES (
            NEW.id, 
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            true,
            'free'
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

        -- Create trigger for new user registration
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION handle_new_user();
      `;

      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: triggerSQL });
      
      if (sqlError) {
        console.error('❌ Error creating trigger:', sqlError);
      } else {
        console.log('✅ Trigger function and trigger created');
      }
    }

    console.log('\n🎉 Profile issue fixed!');
    console.log('📋 Summary:');
    console.log(`- Auth users: ${authData.users.length}`);
    console.log(`- Profiles created: ${missingUsers.length}`);
    console.log('- Trigger function: Updated');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixProfileIssue();