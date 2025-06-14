-- Fix schema issues - only add what's actually missing
-- This script only creates tables that don't exist in the main schema

-- Check if analytics_data table exists, if not create it
-- (The main schema has call_analytics, but some code expects analytics_data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_data') THEN
        CREATE TABLE analytics_data (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            total_calls INTEGER DEFAULT 0,
            successful_calls INTEGER DEFAULT 0,
            failed_calls INTEGER DEFAULT 0,
            total_duration_seconds INTEGER DEFAULT 0,
            average_duration_seconds DECIMAL(8,2) DEFAULT 0,
            total_cost DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(profile_id, date)
        );
        
        -- Enable RLS
        ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;
        
        -- Create policy (without IF NOT EXISTS which is invalid)
        CREATE POLICY "Users can manage own analytics" ON analytics_data 
            FOR ALL USING (profile_id = auth.uid());
            
        -- Create index
        CREATE INDEX idx_analytics_data_profile_date ON analytics_data(profile_id, date);
    END IF;
END $$;

-- Ensure all required policies exist for existing tables
-- Note: We drop and recreate to avoid conflicts since IF NOT EXISTS doesn't work for policies

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
    FOR UPDATE USING (auth.uid() = id);

-- Call logs policies  
DROP POLICY IF EXISTS "Users can manage own call logs" ON call_logs;
CREATE POLICY "Users can manage own call logs" ON call_logs 
    FOR ALL USING (profile_id = auth.uid());

-- AI agents policies
DROP POLICY IF EXISTS "Users can manage own agents" ON ai_agents;
CREATE POLICY "Users can manage own agents" ON ai_agents 
    FOR ALL USING (profile_id = auth.uid());

-- Campaigns policies (note: table is called outbound_campaigns)
DROP POLICY IF EXISTS "Users can manage own campaigns" ON outbound_campaigns;
CREATE POLICY "Users can manage own campaigns" ON outbound_campaigns 
    FOR ALL USING (profile_id = auth.uid());

-- Appointments policies
DROP POLICY IF EXISTS "Users can manage own appointments" ON appointments;
CREATE POLICY "Users can manage own appointments" ON appointments 
    FOR ALL USING (profile_id = auth.uid());

-- Campaign leads policies (note: table is called campaign_leads, not leads)
DROP POLICY IF EXISTS "Users can manage own campaign leads" ON campaign_leads;
CREATE POLICY "Users can manage own campaign leads" ON campaign_leads 
    FOR ALL USING (profile_id IN (
        SELECT id FROM profiles WHERE id = auth.uid()
    ));