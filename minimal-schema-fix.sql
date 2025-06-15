-- =====================================================
-- MINIMAL SCHEMA FIXES - Only Missing Columns
-- AI Calling V12 - Market Readiness
-- =====================================================

-- Fix 1: Add profile_id to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix 2: Add reason to dnc_list table  
ALTER TABLE dnc_list ADD COLUMN IF NOT EXISTS reason TEXT;

-- Fix 3: Add plan_type to billing table
ALTER TABLE billing ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'free';

-- Fix 4: Add call_status to live_calls table
ALTER TABLE live_calls ADD COLUMN IF NOT EXISTS call_status VARCHAR(50) DEFAULT 'active';

-- Fix 5: Add metric_name to analytics_data table
ALTER TABLE analytics_data ADD COLUMN IF NOT EXISTS metric_name VARCHAR(100) NOT NULL DEFAULT 'default_metric';

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS) - CRITICAL FOR PRODUCTION
-- =====================================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE ESSENTIAL RLS POLICIES
-- =====================================================

-- Users can only access their own data
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can manage own call logs" ON call_logs FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own agents" ON ai_agents FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own campaigns" ON campaigns FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own appointments" ON appointments FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own leads" ON leads FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own dnc list" ON dnc_list FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own billing" ON billing FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own analytics" ON analytics_data FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own live calls" ON live_calls FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own function logs" ON function_call_logs FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own webhooks" ON webhooks FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can manage own agent performance" ON agent_performance FOR ALL USING (profile_id = auth.uid());

-- Call recordings policy (linked through call_logs)
CREATE POLICY IF NOT EXISTS "Users can view own call recordings" ON call_recordings FOR SELECT USING (
    EXISTS (SELECT 1 FROM call_logs WHERE call_logs.id = call_recordings.call_id AND call_logs.profile_id = auth.uid())
);