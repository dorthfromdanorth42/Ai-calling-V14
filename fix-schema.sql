-- =====================================================
-- CRITICAL SCHEMA FIXES FOR MARKET READINESS
-- AI Calling V11 - Fix Missing Tables and Columns
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FIX EXISTING TABLES - ADD MISSING COLUMNS
-- =====================================================

-- Fix profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- Fix call_logs table
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'outbound';
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;

-- Fix ai_agents table
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{}';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Fix campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS script TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Fix appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Fix live_calls table
ALTER TABLE live_calls ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE;

-- =====================================================
-- CREATE MISSING TABLES
-- =====================================================

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dnc_list table (Do Not Call)
CREATE TABLE IF NOT EXISTS dnc_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, phone_number)
);

-- Create billing table
CREATE TABLE IF NOT EXISTS billing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_data table
CREATE TABLE IF NOT EXISTS analytics_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2),
    date DATE DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_recordings table
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    recording_url TEXT,
    duration INTEGER,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_performance table
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    calls_handled INTEGER DEFAULT 0,
    avg_duration DECIMAL(8,2),
    success_rate DECIMAL(5,2),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, agent_id, date)
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_call_logs_profile_id ON call_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone_number ON call_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_leads_profile_id ON leads(profile_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE INDEX IF NOT EXISTS idx_dnc_list_phone_number ON dnc_list(phone_number);
CREATE INDEX IF NOT EXISTS idx_dnc_list_profile_id ON dnc_list(profile_id);

CREATE INDEX IF NOT EXISTS idx_analytics_data_profile_id ON analytics_data(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_data_date ON analytics_data(date);
CREATE INDEX IF NOT EXISTS idx_analytics_data_metric_name ON analytics_data(metric_name);

CREATE INDEX IF NOT EXISTS idx_agent_performance_profile_id ON agent_performance(profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_performance(date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
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

-- Create RLS policies for user data isolation
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can view own call logs" ON call_logs FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own agents" ON ai_agents FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own campaigns" ON campaigns FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own appointments" ON appointments FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own leads" ON leads FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own dnc list" ON dnc_list FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own billing" ON billing FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own analytics" ON analytics_data FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own call recordings" ON call_recordings FOR SELECT USING (
    EXISTS (SELECT 1 FROM call_logs WHERE call_logs.id = call_recordings.call_id AND call_logs.profile_id = auth.uid())
);
CREATE POLICY IF NOT EXISTS "Users can view own agent performance" ON agent_performance FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own live calls" ON live_calls FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own function call logs" ON function_call_logs FOR ALL USING (profile_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can view own webhooks" ON webhooks FOR ALL USING (profile_id = auth.uid());

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at columns
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_call_logs_updated_at BEFORE UPDATE ON call_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_ai_agents_updated_at BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_billing_updated_at BEFORE UPDATE ON billing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER IF NOT EXISTS update_live_calls_updated_at BEFORE UPDATE ON live_calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();