-- =====================================================
-- TIER 1 & TIER 2 FEATURES DATABASE SCHEMA
-- AI Calling V10 - Complete Infrastructure
-- =====================================================

-- Function Call Logs (Enhanced Gemini Integration)
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

-- Appointments (Function Call Results)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    call_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_type VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe Integration Tables
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
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id)
);

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fiverr Package System
CREATE TABLE IF NOT EXISTS fiverr_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    price_usd INTEGER NOT NULL,
    delivery_days INTEGER NOT NULL,
    revisions INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,
    features JSONB,
    requirements JSONB,
    extras JSONB,
    popular BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiverr_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id VARCHAR(50) REFERENCES fiverr_packages(id),
    extras JSONB,
    total_price_usd INTEGER NOT NULL,
    delivery_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requirements_submitted BOOLEAN DEFAULT false,
    client_info JSONB NOT NULL,
    project_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Notifications System
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    metadata JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    notification_types JSONB DEFAULT '{}',
    quiet_hours JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint VARCHAR(500) NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, endpoint)
);

-- Compliance System
CREATE TABLE IF NOT EXISTS dnc_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    notes TEXT,
    added_by VARCHAR(255),
    call_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, phone_number)
);

CREATE TABLE IF NOT EXISTS tcpa_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    consent_type VARCHAR(100) NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL,
    consent_method VARCHAR(100) NOT NULL,
    consent_text TEXT,
    recording_url VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    witness VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,
    legal_basis VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    data_categories JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rule_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    parameters JSONB,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    phone_number VARCHAR(50),
    call_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES compliance_rules(id) ON DELETE SET NULL,
    auto_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_calls INTEGER NOT NULL,
    compliant_calls INTEGER NOT NULL,
    violations JSONB,
    compliance_score INTEGER,
    recommendations JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Privacy & Security
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    data_type VARCHAR(100) NOT NULL,
    retention_days INTEGER NOT NULL,
    auto_delete BOOLEAN DEFAULT false,
    encryption_required BOOLEAN DEFAULT false,
    backup_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_processing_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    contact_id VARCHAR(255) NOT NULL,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    legal_basis VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    data_categories JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    subject_name VARCHAR(255) NOT NULL,
    request_details TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    response_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    response_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    resource_accessed VARCHAR(255),
    action_performed VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'low',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Intelligence Analytics
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL(15,4) NOT NULL,
    period VARCHAR(20) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    dimensions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    kpi_name VARCHAR(255) NOT NULL,
    target_value DECIMAL(15,4) NOT NULL,
    current_value DECIMAL(15,4) DEFAULT 0,
    target_period VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'on_track',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    configuration JSONB NOT NULL,
    schedule JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictive_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    impact_level VARCHAR(20) NOT NULL,
    metric_affected VARCHAR(255) NOT NULL,
    predicted_value DECIMAL(15,4),
    time_horizon VARCHAR(50),
    action_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Webhook System
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    events JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    retry_config JSONB DEFAULT '{}',
    security_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    source VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Advanced Agent Management
CREATE TABLE IF NOT EXISTS agent_personalities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    personality_traits JSONB,
    communication_style JSONB,
    voice_settings JSONB,
    script_templates JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    average_duration_seconds INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    customer_satisfaction DECIMAL(3,2) DEFAULT 0,
    efficiency_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, metric_date)
);

CREATE TABLE IF NOT EXISTS agent_training_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    session_type VARCHAR(100) NOT NULL,
    training_data JSONB,
    performance_before JSONB,
    performance_after JSONB,
    improvements JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Function Call Logs
CREATE INDEX IF NOT EXISTS idx_function_call_logs_profile_id ON function_call_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_function_call_logs_call_id ON function_call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_function_call_logs_function_name ON function_call_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_function_call_logs_created_at ON function_call_logs(created_at);

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_profile_id ON user_subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_profile_id ON usage_records(profile_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Compliance
CREATE INDEX IF NOT EXISTS idx_dnc_lists_profile_phone ON dnc_lists(profile_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_tcpa_consents_profile_phone ON tcpa_consents(profile_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_profile_id ON compliance_violations(profile_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_profile_id ON analytics_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name_period ON analytics_metrics(metric_name, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_profile_id ON kpi_targets(profile_id);

-- Webhooks
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_profile_id ON webhook_endpoints(profile_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_profile_id ON webhook_events(profile_id);

-- Agent Management
CREATE INDEX IF NOT EXISTS idx_agent_personalities_profile_id ON agent_personalities(profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_date ON agent_performance_metrics(agent_id, metric_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE function_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tcpa_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_training_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profile-based access
CREATE POLICY "Users can access their own function call logs" ON function_call_logs FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own appointments" ON appointments FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own subscriptions" ON user_subscriptions FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own usage records" ON usage_records FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own notifications" ON notifications FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own notification preferences" ON notification_preferences FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own push subscriptions" ON push_subscriptions FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own DNC lists" ON dnc_lists FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own TCPA consents" ON tcpa_consents FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own compliance rules" ON compliance_rules FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own compliance violations" ON compliance_violations FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own compliance reports" ON compliance_reports FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own data retention policies" ON data_retention_policies FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own data processing consents" ON data_processing_consents FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own data subject requests" ON data_subject_requests FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own security audit logs" ON security_audit_logs FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own analytics metrics" ON analytics_metrics FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own KPI targets" ON kpi_targets FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own custom reports" ON custom_reports FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own predictive insights" ON predictive_insights FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own webhook endpoints" ON webhook_endpoints FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own webhook events" ON webhook_events FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "Users can access their own agent personalities" ON agent_personalities FOR ALL USING (profile_id = auth.uid());

-- Special policies for webhook deliveries (linked through endpoints)
CREATE POLICY "Users can access webhook deliveries for their endpoints" ON webhook_deliveries FOR ALL USING (
    endpoint_id IN (SELECT id FROM webhook_endpoints WHERE profile_id = auth.uid())
);

-- Special policies for agent performance metrics (linked through agents)
CREATE POLICY "Users can access performance metrics for their agents" ON agent_performance_metrics FOR ALL USING (
    agent_id IN (SELECT id FROM ai_agents WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can access training sessions for their agents" ON agent_training_sessions FOR ALL USING (
    agent_id IN (SELECT id FROM ai_agents WHERE profile_id = auth.uid())
);

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, price_cents, interval, stripe_price_id, features, limits) VALUES
('basic', 'Basic', 'Perfect for small businesses getting started', 9900, 'month', 'price_basic_monthly', 
 '["Up to 500 calls per month", "2 AI agents", "5 active campaigns", "Basic analytics", "Email support", "10GB storage"]',
 '{"calls_per_month": 500, "agents": 2, "campaigns": 5, "storage_gb": 10}'),
('standard', 'Standard', 'Ideal for growing businesses', 29900, 'month', 'price_standard_monthly',
 '["Up to 2,000 calls per month", "5 AI agents", "20 active campaigns", "Advanced analytics", "Priority support", "50GB storage", "Custom webhooks", "API access"]',
 '{"calls_per_month": 2000, "agents": 5, "campaigns": 20, "storage_gb": 50}'),
('premium', 'Premium', 'For enterprises with high volume needs', 79900, 'month', 'price_premium_monthly',
 '["Up to 10,000 calls per month", "Unlimited AI agents", "Unlimited campaigns", "Real-time analytics", "Dedicated support", "200GB storage", "Advanced webhooks", "Full API access", "Custom integrations", "White-label options"]',
 '{"calls_per_month": 10000, "agents": -1, "campaigns": -1, "storage_gb": 200}')
ON CONFLICT (id) DO NOTHING;

-- Insert default Fiverr packages
INSERT INTO fiverr_packages (id, name, title, description, price_usd, delivery_days, revisions, category, features, requirements, extras) VALUES
('basic-ai-agent', 'Basic AI Agent Setup', 'I will set up a basic AI calling agent for your business', 
 'Get started with AI calling automation. Perfect for small businesses looking to automate their customer outreach.', 
 15000, 3, 2, 'basic',
 '["1 AI agent configuration", "Basic script setup", "Up to 100 contacts import", "Basic analytics dashboard", "3 days of support", "Training video included"]',
 '["Business description and goals", "Target audience information", "Preferred calling script or talking points", "Contact list (CSV format)", "Business hours and timezone"]',
 '[{"id": "extra-contacts", "title": "Additional 500 contacts import", "description": "Import up to 500 additional contacts to your campaign", "price": 2500, "delivery_time_addition": 1}]'),
('standard-ai-system', 'Standard AI Call Center', 'I will build a complete AI call center system for your business',
 'Full-featured AI calling system with multiple agents, advanced analytics, and comprehensive automation.',
 45000, 7, 3, 'standard',
 '["3 AI agents with different personalities", "Advanced script customization", "Up to 1,000 contacts import", "Campaign management system", "Real-time analytics dashboard", "Webhook integrations", "DNC list management", "7 days of support", "Live training session"]',
 '["Detailed business requirements", "Target audience personas", "Multiple script variations", "Contact lists with segmentation", "Integration requirements", "Compliance requirements"]',
 '[{"id": "extra-agents", "title": "2 additional AI agents", "description": "Add 2 more specialized AI agents to your system", "price": 10000, "delivery_time_addition": 2}]'),
('premium-enterprise', 'Premium Enterprise Solution', 'I will create a custom enterprise AI calling solution',
 'Enterprise-grade AI calling system with unlimited agents, custom integrations, and white-label options.',
 120000, 14, 5, 'premium',
 '["Unlimited AI agents", "Custom voice training", "Unlimited contacts", "Multi-campaign management", "Advanced analytics & reporting", "Custom integrations", "White-label solution", "Compliance management", "Priority support (30 days)", "Dedicated account manager", "Custom training program"]',
 '["Enterprise requirements document", "Technical specifications", "Integration architecture", "Compliance requirements", "Branding guidelines", "Team structure and roles", "Success metrics and KPIs"]',
 '[{"id": "extra-voice-training", "title": "Custom voice model training", "description": "Train AI with your specific voice and tone", "price": 50000, "delivery_time_addition": 7}]')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tcpa_consents_updated_at BEFORE UPDATE ON tcpa_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_processing_consents_updated_at BEFORE UPDATE ON data_processing_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_subject_requests_updated_at BEFORE UPDATE ON data_subject_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpi_targets_updated_at BEFORE UPDATE ON kpi_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON custom_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_endpoints_updated_at BEFORE UPDATE ON webhook_endpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_personalities_updated_at BEFORE UPDATE ON agent_personalities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_violations;
ALTER PUBLICATION supabase_realtime ADD TABLE function_call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE predictive_insights;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Add a comment to indicate schema completion
COMMENT ON SCHEMA public IS 'AI Calling V10 - Tier 1 & Tier 2 Features Schema - Complete Infrastructure for Enhanced Gemini Function Calling, Stripe Payments, Fiverr Packages, Real-Time Notifications, Compliance, Privacy & Security, Business Intelligence, and Enhanced Webhooks';