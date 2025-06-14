-- =====================================================
-- COMPLETE SUPABASE DATABASE SCHEMA
-- AI Calling V10 - All Features Implementation
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: CORE INFRASTRUCTURE TABLES
-- =====================================================

-- Enhanced profiles table with new integrations
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- =====================================================
-- STEP 2: FUNCTION CALL LOGS (Enhanced Gemini Integration)
-- =====================================================

CREATE TABLE IF NOT EXISTS function_call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    function_name VARCHAR(255) NOT NULL,
    parameters JSONB,
    result JSONB,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: LIVE CALL MONITORING TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS live_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    agent_name VARCHAR(255),
    customer_phone VARCHAR(50),
    call_status VARCHAR(50) DEFAULT 'active',
    call_quality DECIMAL(3,2),
    duration_seconds INTEGER DEFAULT 0,
    current_transcript TEXT,
    sentiment_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 4: WEBHOOK EVENT INTEGRATION
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    call_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processing_attempts INTEGER DEFAULT 0,
    last_processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- STEP 5: AUTO-DIALER ENGINE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS dialer_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 1,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 6: ENHANCED ANALYTICS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    average_call_duration DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_active_calls INTEGER DEFAULT 0,
    total_queued_calls INTEGER DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0,
    system_health VARCHAR(20) DEFAULT 'healthy',
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    error_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, metric_date)
);

-- =====================================================
-- STEP 7: ENTERPRISE FEATURES (TIER 1 & TIER 2)
-- =====================================================

-- Subscription Management
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    interval VARCHAR(20) NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    features JSONB,
    limits JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fiverr Integration
CREATE TABLE IF NOT EXISTS fiverr_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_basic DECIMAL(10,2),
    price_standard DECIMAL(10,2),
    price_premium DECIMAL(10,2),
    delivery_time_basic INTEGER,
    delivery_time_standard INTEGER,
    delivery_time_premium INTEGER,
    features_basic JSONB,
    features_standard JSONB,
    features_premium JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiverr_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    package_id UUID REFERENCES fiverr_packages(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    package_tier VARCHAR(20) NOT NULL,
    order_value DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requirements TEXT,
    delivery_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification System
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    call_notifications BOOLEAN DEFAULT true,
    appointment_notifications BOOLEAN DEFAULT true,
    billing_notifications BOOLEAN DEFAULT true,
    marketing_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Management
CREATE TABLE IF NOT EXISTS dnc_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    reason VARCHAR(255),
    source VARCHAR(100),
    added_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, phone_number)
);

CREATE TABLE IF NOT EXISTS tcpa_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_method VARCHAR(100),
    consent_text TEXT,
    ip_address INET,
    user_agent TEXT,
    recording_url TEXT,
    witness_info JSONB,
    expiry_date TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 8: INDEXES FOR PERFORMANCE
-- =====================================================

-- Function call logs indexes
CREATE INDEX IF NOT EXISTS idx_function_call_logs_profile_id ON function_call_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_function_call_logs_call_id ON function_call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_function_call_logs_created_at ON function_call_logs(created_at);

-- Live calls indexes
CREATE INDEX IF NOT EXISTS idx_live_calls_profile_id ON live_calls(profile_id);
CREATE INDEX IF NOT EXISTS idx_live_calls_status ON live_calls(call_status);
CREATE INDEX IF NOT EXISTS idx_live_calls_created_at ON live_calls(created_at);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_profile_id ON webhook_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Dialer queue indexes
CREATE INDEX IF NOT EXISTS idx_dialer_queue_profile_id ON dialer_queue(profile_id);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_campaign_id ON dialer_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_status ON dialer_queue(status);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_scheduled_time ON dialer_queue(scheduled_time);

-- Campaign metrics indexes
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_profile_id ON campaign_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON campaign_metrics(date);

-- System metrics indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_profile_id ON system_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_date ON system_metrics(metric_date);

-- =====================================================
-- STEP 9: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE function_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiverr_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiverr_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tcpa_consents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profile-based access
CREATE POLICY "Users can access their own function call logs" ON function_call_logs
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own live calls" ON live_calls
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own webhook events" ON webhook_events
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own dialer queue" ON dialer_queue
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own campaign metrics" ON campaign_metrics
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own system metrics" ON system_metrics
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own subscriptions" ON user_subscriptions
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own usage records" ON usage_records
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own fiverr packages" ON fiverr_packages
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own fiverr orders" ON fiverr_orders
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own notifications" ON notifications
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own notification preferences" ON notification_preferences
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own DNC lists" ON dnc_lists
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can access their own TCPA consents" ON tcpa_consents
    FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Public read access for subscription plans
CREATE POLICY "Anyone can read subscription plans" ON subscription_plans
    FOR SELECT USING (true);

-- =====================================================
-- STEP 10: TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for tables with updated_at columns
CREATE TRIGGER update_live_calls_updated_at BEFORE UPDATE ON live_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fiverr_packages_updated_at BEFORE UPDATE ON fiverr_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fiverr_orders_updated_at BEFORE UPDATE ON fiverr_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tcpa_consents_updated_at BEFORE UPDATE ON tcpa_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 11: INITIAL DATA SETUP
-- =====================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, price_cents, interval, stripe_price_id, features, limits) VALUES
('starter', 'Starter Plan', 'Perfect for small businesses getting started with AI calling', 2900, 'month', 'price_starter_monthly', 
 '["Basic AI Agent", "1000 minutes/month", "Email support", "Basic analytics"]'::jsonb,
 '{"monthly_minutes": 1000, "agents": 1, "campaigns": 5}'::jsonb),
('professional', 'Professional Plan', 'Advanced features for growing businesses', 9900, 'month', 'price_pro_monthly',
 '["Advanced AI Agents", "5000 minutes/month", "Priority support", "Advanced analytics", "Custom integrations"]'::jsonb,
 '{"monthly_minutes": 5000, "agents": 5, "campaigns": 25}'::jsonb),
('enterprise', 'Enterprise Plan', 'Full-featured solution for large organizations', 29900, 'month', 'price_enterprise_monthly',
 '["Unlimited AI Agents", "25000 minutes/month", "24/7 support", "Custom analytics", "White-label options"]'::jsonb,
 '{"monthly_minutes": 25000, "agents": -1, "campaigns": -1}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 12: DEMO DATA FOR TESTING
-- =====================================================

-- Note: Demo data will be inserted automatically by the application
-- when users first access the new features. This includes:
-- - Sample live calls for testing the monitoring dashboard
-- - Sample webhook events for testing integrations
-- - Sample dialer queue entries for testing auto-dialer
-- - Sample metrics for testing analytics dashboards

-- =====================================================
-- SCHEMA SETUP COMPLETE
-- =====================================================

-- Verify all tables exist
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'function_call_logs', 'live_calls', 'webhook_events', 
        'dialer_queue', 'campaign_metrics', 'system_metrics',
        'subscription_plans', 'user_subscriptions', 'usage_records',
        'fiverr_packages', 'fiverr_orders', 'notifications',
        'notification_preferences', 'dnc_lists', 'tcpa_consents'
    )
ORDER BY tablename;