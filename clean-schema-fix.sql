-- =====================================================
-- CLEAN SCHEMA FIXES - NO MOCK DATA
-- Essential missing schema elements only
-- =====================================================

-- 1. Add missing columns to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE live_calls ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE;

-- 2. Create missing tables (production ready, no demo data)
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    recording_url TEXT,
    duration INTEGER,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    calls_handled INTEGER DEFAULT 0,
    avg_duration DECIMAL(8,2),
    success_rate DECIMAL(5,2),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, agent_id, date)
);

-- 3. Enable Row Level Security
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies (production security)
DROP POLICY IF EXISTS "Users can view own call recordings" ON call_recordings;
CREATE POLICY "Users can view own call recordings" ON call_recordings FOR SELECT USING (
    EXISTS (SELECT 1 FROM call_logs WHERE call_logs.id = call_recordings.call_id AND call_logs.profile_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view own agent performance" ON agent_performance;
CREATE POLICY "Users can view own agent performance" ON agent_performance FOR ALL USING (profile_id = auth.uid());

-- 5. Create views for table name compatibility
CREATE OR REPLACE VIEW leads AS SELECT * FROM campaign_leads;
CREATE OR REPLACE VIEW dnc_list AS SELECT * FROM dnc_lists;
CREATE OR REPLACE VIEW billing AS SELECT * FROM subscriptions;
CREATE OR REPLACE VIEW analytics_data AS SELECT * FROM call_analytics;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_profile_id ON agent_performance(profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_performance(date);

-- =====================================================
-- CLEAN UP ANY EXISTING MOCK DATA
-- =====================================================

-- Remove any demo/mock data that might exist
DELETE FROM live_calls WHERE customer_name IN ('John Smith', 'Sarah Johnson');
DELETE FROM webhook_events WHERE call_id LIKE 'demo-%';
DELETE FROM campaign_metrics WHERE profile_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM system_metrics WHERE profile_id = '00000000-0000-0000-0000-000000000000';

-- Remove any test phone numbers
DELETE FROM call_logs WHERE phone_number_from LIKE '+1-555-%' OR phone_number_to LIKE '+1-555-%';
DELETE FROM campaign_leads WHERE phone_number LIKE '+1-555-%';
DELETE FROM dnc_lists WHERE phone_number LIKE '+1-555-%';

-- =====================================================
-- PRODUCTION READY - NO MOCK DATA
-- Schema is now clean and ready for live use
-- =====================================================