#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './dashboard/.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

const createAnalyticsTable = async () => {
  console.log('Creating analytics_data table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS analytics_data (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          metric_name VARCHAR(255) NOT NULL,
          metric_value DECIMAL(10,2),
          metric_type VARCHAR(50) DEFAULT 'counter',
          dimensions JSONB,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_data_profile_id ON analytics_data(profile_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_data_metric_name ON analytics_data(metric_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_data_timestamp ON analytics_data(timestamp);
    `
  });

  if (error) {
    console.error('Error creating analytics table:', error);
    return false;
  }
  
  console.log('✅ Analytics table created successfully!');
  return true;
};

createAnalyticsTable().then(success => {
  process.exit(success ? 0 : 1);
});