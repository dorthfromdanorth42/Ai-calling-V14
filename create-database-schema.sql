-- AI Calling V14 - Complete Database Schema
-- This script creates all required tables, views, functions, and policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'manager')),
    subscription_plan TEXT NOT NULL DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'pro', 'enterprise')),
    minutes_used INTEGER NOT NULL DEFAULT 0,
    minutes_limit INTEGER NOT NULL DEFAULT 1000,
    max_agents INTEGER NOT NULL DEFAULT 3,
    allowed_features JSONB DEFAULT '["calls", "agents", "analytics"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agents table
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sales', 'customer_service', 'technical_support', 'appointment_booking', 'general')),
    voice TEXT NOT NULL DEFAULT 'Puck',
    language TEXT NOT NULL DEFAULT 'en-US',
    phone_number TEXT,
    system_prompt TEXT NOT NULL,
    max_concurrent_calls INTEGER NOT NULL DEFAULT 1,
    operating_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "timezone": "UTC"}'::jsonb,
    escalation_enabled BOOLEAN DEFAULT false,
    escalation_number TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID,
    phone_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no_answer')),
    duration INTEGER DEFAULT 0, -- in seconds
    recording_url TEXT,
    transcript TEXT,
    sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
    cost DECIMAL(10,4) DEFAULT 0.00,
    twilio_call_sid TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    leads_count INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    schedule JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    phone_number TEXT NOT NULL,
    name TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'called', 'answered', 'voicemail', 'busy', 'failed', 'dnc', 'converted')),
    call_attempts INTEGER DEFAULT 0,
    last_called_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    custom_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT ARRAY['call.completed'],
    secret TEXT,
    active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing table
CREATE TABLE IF NOT EXISTS public.billing (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    plan TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    stripe_subscription_id TEXT,
    stripe_invoice_id TEXT,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Do Not Call (DNC) list
CREATE TABLE IF NOT EXISTS public.dnc_list (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    reason TEXT,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Analytics table
CREATE TABLE IF NOT EXISTS public.call_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    keywords TEXT[],
    topics TEXT[],
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Permissions table (for granular access control)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    permission TEXT NOT NULL,
    granted_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission)
);

-- Agent Configurations table (for advanced agent settings)
CREATE TABLE IF NOT EXISTS public.agent_configurations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
    configuration_key TEXT NOT NULL,
    configuration_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, configuration_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON public.calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON public.calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_appointments_call_id ON public.appointments(call_id);
CREATE INDEX IF NOT EXISTS idx_dnc_phone_number ON public.dnc_list(phone_number);

-- Create views for common queries
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    u.id,
    u.email,
    u.subscription_plan,
    u.minutes_used,
    u.minutes_limit,
    COUNT(DISTINCT a.id) as agent_count,
    COUNT(DISTINCT c.id) as total_calls,
    COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_calls,
    COALESCE(SUM(c.duration), 0) as total_duration,
    COALESCE(AVG(c.duration), 0) as avg_call_duration
FROM public.users u
LEFT JOIN public.agents a ON u.id = a.user_id AND a.active = true
LEFT JOIN public.calls c ON u.id = c.user_id AND c.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.subscription_plan, u.minutes_used, u.minutes_limit;

CREATE OR REPLACE VIEW public.call_summary AS
SELECT 
    DATE(c.created_at) as call_date,
    c.user_id,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN c.status = 'failed' THEN 1 END) as failed_calls,
    AVG(c.duration) as avg_duration,
    SUM(c.duration) as total_duration
FROM public.calls c
GROUP BY DATE(c.created_at), c.user_id;

CREATE OR REPLACE VIEW public.campaign_performance AS
SELECT 
    cp.id,
    cp.name,
    cp.user_id,
    cp.status,
    cp.leads_count,
    cp.completed_calls,
    cp.successful_calls,
    CASE 
        WHEN cp.leads_count > 0 THEN (cp.completed_calls::float / cp.leads_count * 100)
        ELSE 0 
    END as completion_rate,
    CASE 
        WHEN cp.completed_calls > 0 THEN (cp.successful_calls::float / cp.completed_calls * 100)
        ELSE 0 
    END as success_rate
FROM public.campaigns cp;

CREATE OR REPLACE VIEW public.agent_metrics AS
SELECT 
    a.id,
    a.name,
    a.user_id,
    a.type,
    COUNT(c.id) as total_calls,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
    AVG(c.duration) as avg_duration,
    AVG(ca.satisfaction_score) as avg_satisfaction
FROM public.agents a
LEFT JOIN public.calls c ON a.id = c.agent_id
LEFT JOIN public.call_analytics ca ON c.id = ca.call_id
WHERE a.active = true
GROUP BY a.id, a.name, a.user_id, a.type;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION public.create_user_with_permissions(
    user_email TEXT,
    user_role TEXT DEFAULT 'user',
    subscription_plan TEXT DEFAULT 'basic',
    minutes_limit INTEGER DEFAULT 1000,
    max_agents INTEGER DEFAULT 3
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Insert user (assumes auth.users already exists)
    INSERT INTO public.users (id, email, role, subscription_plan, minutes_limit, max_agents)
    VALUES (gen_random_uuid(), user_email, user_role, subscription_plan, minutes_limit, max_agents)
    RETURNING id INTO new_user_id;
    
    -- Add default permissions based on role
    IF user_role = 'admin' THEN
        INSERT INTO public.user_permissions (user_id, permission)
        VALUES 
            (new_user_id, 'admin.users.manage'),
            (new_user_id, 'admin.billing.view'),
            (new_user_id, 'admin.system.configure');
    END IF;
    
    RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_minutes(
    user_id UUID,
    minutes_to_add INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users 
    SET minutes_used = minutes_used + minutes_to_add,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats(user_id UUID)
RETURNS TABLE(
    total_calls BIGINT,
    completed_calls BIGINT,
    total_duration BIGINT,
    avg_duration NUMERIC,
    agent_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(c.id) as total_calls,
        COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
        COALESCE(SUM(c.duration), 0) as total_duration,
        COALESCE(AVG(c.duration), 0) as avg_duration,
        COUNT(DISTINCT a.id) as agent_count
    FROM public.calls c
    LEFT JOIN public.agents a ON c.agent_id = a.id
    WHERE c.user_id = get_user_stats.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_campaign_with_leads(
    campaign_name TEXT,
    campaign_user_id UUID,
    campaign_agent_id UUID,
    leads_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_campaign_id UUID;
    lead_record JSONB;
    leads_count INTEGER := 0;
BEGIN
    -- Create campaign
    INSERT INTO public.campaigns (user_id, agent_id, name, status)
    VALUES (campaign_user_id, campaign_agent_id, campaign_name, 'draft')
    RETURNING id INTO new_campaign_id;
    
    -- Insert leads
    FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
    LOOP
        INSERT INTO public.leads (campaign_id, phone_number, name, email, custom_data)
        VALUES (
            new_campaign_id,
            lead_record->>'phone_number',
            lead_record->>'name',
            lead_record->>'email',
            lead_record
        );
        leads_count := leads_count + 1;
    END LOOP;
    
    -- Update campaign with leads count
    UPDATE public.campaigns 
    SET leads_count = leads_count
    WHERE id = new_campaign_id;
    
    RETURN new_campaign_id;
END;
$$;

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configurations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Agents policies
CREATE POLICY "Users can view own agents" ON public.agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agents" ON public.agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents" ON public.agents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents" ON public.agents
    FOR DELETE USING (auth.uid() = user_id);

-- Calls policies
CREATE POLICY "Users can view own calls" ON public.calls
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calls" ON public.calls
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Campaigns policies
CREATE POLICY "Users can view own campaigns" ON public.campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own campaigns" ON public.campaigns
    FOR ALL USING (auth.uid() = user_id);

-- Leads policies
CREATE POLICY "Users can view campaign leads" ON public.leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = leads.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage campaign leads" ON public.leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = leads.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

-- Admin policies (service role bypass)
CREATE POLICY "Service role can access all data" ON public.users
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can access all agents" ON public.agents
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can access all calls" ON public.calls
    FOR ALL USING (current_setting('role') = 'service_role');

-- Insert default admin user if not exists
INSERT INTO public.users (id, email, role, subscription_plan, minutes_limit, max_agents, allowed_features)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'gamblerspassion@gmail.com',
    'admin',
    'enterprise',
    50000,
    100,
    '["calls", "agents", "analytics", "campaigns", "billing", "admin", "webhooks", "dnc"]'::jsonb
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    subscription_plan = 'enterprise',
    minutes_limit = 50000,
    max_agents = 100,
    allowed_features = '["calls", "agents", "analytics", "campaigns", "billing", "admin", "webhooks", "dnc"]'::jsonb;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;