-- =====================================================
-- CRITICAL FIXES SQL SCRIPTS FOR SUPABASE DASHBOARD
-- Execute these in order in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: FIX GEMINI LIVE API INTEGRATION
-- =====================================================

-- 1. Check current voice_name enum values
-- SELECT unnest(enum_range(NULL::voice_name));

-- 2. Add missing voice names to enum (if needed)
ALTER TYPE voice_name ADD VALUE IF NOT EXISTS 'alloy';
ALTER TYPE voice_name ADD VALUE IF NOT EXISTS 'echo';
ALTER TYPE voice_name ADD VALUE IF NOT EXISTS 'fable';
ALTER TYPE voice_name ADD VALUE IF NOT EXISTS 'onyx';
ALTER TYPE voice_name ADD VALUE IF NOT EXISTS 'nova';
ALTER TYPE voice_name ADD VALUE IF NOT EXISTS 'shimmer';

-- 3. Check current agent_type enum values
-- SELECT unnest(enum_range(NULL::agent_type));

-- 4. Add missing agent types to enum (if needed)
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'customer_service';
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'lead_qualification';
ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'appointment_setting';

-- 5. Ensure all required Gemini Live API fields exist in ai_agents table
-- (Most should already exist based on the test results)
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS call_timeout_seconds INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS retry_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS retry_delay_minutes INTEGER DEFAULT 5;

-- =====================================================
-- PART 2: CREATE ADMIN CONTROL SYSTEM
-- =====================================================

-- 1. Create user_permissions table for granular admin control
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id), -- Admin who created this user
  
  -- Dashboard Access Control
  can_access_dashboard BOOLEAN DEFAULT true,
  can_view_analytics BOOLEAN DEFAULT true,
  can_view_call_logs BOOLEAN DEFAULT true,
  can_view_appointments BOOLEAN DEFAULT true,
  can_manage_leads BOOLEAN DEFAULT true,
  
  -- Agent Control
  can_create_agents BOOLEAN DEFAULT true,
  max_agents INTEGER DEFAULT 3,
  allowed_agent_types TEXT[] DEFAULT ARRAY['sales', 'support'],
  allowed_voice_names TEXT[] DEFAULT ARRAY['alloy', 'echo', 'fable'],
  
  -- Campaign Control  
  can_create_campaigns BOOLEAN DEFAULT true,
  max_campaigns INTEGER DEFAULT 5,
  max_concurrent_calls INTEGER DEFAULT 3,
  
  -- Usage Limits (Perfect for Fiverr packages)
  monthly_minutes_limit INTEGER DEFAULT 1000,
  minutes_used INTEGER DEFAULT 0,
  minutes_reset_date TIMESTAMP DEFAULT (NOW() + INTERVAL '1 month'),
  
  -- Feature Access (Tiered features for different Fiverr packages)
  can_use_live_calls BOOLEAN DEFAULT true,
  can_record_calls BOOLEAN DEFAULT false,
  can_export_data BOOLEAN DEFAULT false,
  can_use_webhooks BOOLEAN DEFAULT false,
  can_use_analytics BOOLEAN DEFAULT true,
  can_use_integrations BOOLEAN DEFAULT false,
  
  -- Subscription Info (Perfect for Fiverr integration)
  subscription_tier TEXT DEFAULT 'basic', -- basic, premium, enterprise, admin
  subscription_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- Fiverr-specific fields
  fiverr_order_id TEXT,
  fiverr_buyer_username TEXT,
  package_type TEXT DEFAULT 'basic', -- basic, standard, premium
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create admin_settings table for system defaults
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id),
  
  -- Default permissions for new users (Fiverr package defaults)
  basic_monthly_minutes INTEGER DEFAULT 500,
  basic_max_agents INTEGER DEFAULT 2,
  basic_max_campaigns INTEGER DEFAULT 3,
  
  standard_monthly_minutes INTEGER DEFAULT 1500,
  standard_max_agents INTEGER DEFAULT 5,
  standard_max_campaigns INTEGER DEFAULT 10,
  
  premium_monthly_minutes INTEGER DEFAULT 5000,
  premium_max_agents INTEGER DEFAULT 15,
  premium_max_campaigns INTEGER DEFAULT 25,
  
  -- System settings
  allow_user_registration BOOLEAN DEFAULT false,
  require_admin_approval BOOLEAN DEFAULT true,
  default_subscription_tier TEXT DEFAULT 'basic',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create usage_tracking table for monitoring
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Usage metrics
  call_minutes_used INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  agents_created INTEGER DEFAULT 0,
  campaigns_created INTEGER DEFAULT 0,
  leads_processed INTEGER DEFAULT 0,
  
  -- Time tracking
  tracking_month INTEGER DEFAULT EXTRACT(MONTH FROM NOW()),
  tracking_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(profile_id, tracking_month, tracking_year)
);

-- =====================================================
-- PART 3: ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all critical tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 4: CREATE RLS POLICIES WITH ADMIN CONTROL
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_own_agents" ON ai_agents;
DROP POLICY IF EXISTS "users_own_campaigns" ON outbound_campaigns;
DROP POLICY IF EXISTS "users_own_leads" ON campaign_leads;
DROP POLICY IF EXISTS "users_own_appointments" ON appointments;
DROP POLICY IF EXISTS "users_own_call_logs" ON call_logs;
DROP POLICY IF EXISTS "users_own_permissions" ON user_permissions;
DROP POLICY IF EXISTS "users_own_usage" ON usage_tracking;

-- Profiles: Users see only their own profile, admins see all
CREATE POLICY "users_own_profile" ON profiles
FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE profile_id = auth.uid() 
    AND subscription_tier = 'admin'
    AND is_active = true
  )
);

-- AI Agents: Users see only their agents (with permission and limit checks)
CREATE POLICY "users_own_agents" ON ai_agents
FOR ALL USING (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE profile_id = auth.uid() 
    AND can_create_agents = true
    AND is_active = true
  )
);

-- Additional policy for agent creation limits
CREATE POLICY "agent_creation_limits" ON ai_agents
FOR INSERT WITH CHECK (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.profile_id = auth.uid() 
    AND up.can_create_agents = true
    AND up.is_active = true
    AND (
      SELECT COUNT(*) FROM ai_agents 
      WHERE profile_id = auth.uid()
    ) < up.max_agents
  )
);

-- Campaigns: Users see only their campaigns (with permission checks)
CREATE POLICY "users_own_campaigns" ON outbound_campaigns
FOR ALL USING (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE profile_id = auth.uid() 
    AND can_create_campaigns = true
    AND is_active = true
  )
);

-- Campaign creation limits
CREATE POLICY "campaign_creation_limits" ON outbound_campaigns
FOR INSERT WITH CHECK (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.profile_id = auth.uid() 
    AND up.can_create_campaigns = true
    AND up.is_active = true
    AND (
      SELECT COUNT(*) FROM outbound_campaigns 
      WHERE profile_id = auth.uid()
    ) < up.max_campaigns
  )
);

-- Leads: Users see only their campaign leads
CREATE POLICY "users_own_leads" ON campaign_leads
FOR ALL USING (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE profile_id = auth.uid() 
    AND can_manage_leads = true
    AND is_active = true
  )
);

-- Appointments: Users see only their appointments
CREATE POLICY "users_own_appointments" ON appointments
FOR ALL USING (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE profile_id = auth.uid() 
    AND can_view_appointments = true
    AND is_active = true
  )
);

-- Call Logs: Users see only their call logs (with permission check)
CREATE POLICY "users_own_call_logs" ON call_logs
FOR ALL USING (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE profile_id = auth.uid() 
    AND can_view_call_logs = true
    AND is_active = true
  )
);

-- User Permissions: Users see only their own permissions, admins see all
CREATE POLICY "users_own_permissions" ON user_permissions
FOR ALL USING (
  profile_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE profile_id = auth.uid() 
    AND subscription_tier = 'admin'
    AND is_active = true
  )
);

-- Usage Tracking: Users see only their own usage
CREATE POLICY "users_own_usage" ON usage_tracking
FOR ALL USING (
  profile_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE profile_id = auth.uid() 
    AND subscription_tier = 'admin'
    AND is_active = true
  )
);

-- =====================================================
-- PART 5: CREATE ADMIN FUNCTIONS
-- =====================================================

-- Function for admin to create users with specific permissions (Fiverr integration)
CREATE OR REPLACE FUNCTION create_fiverr_user(
  user_email TEXT,
  user_full_name TEXT,
  package_type TEXT DEFAULT 'basic',
  fiverr_order_id TEXT DEFAULT NULL,
  fiverr_buyer_username TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  new_profile_id UUID;
  result JSONB;
  minutes_limit INTEGER;
  max_agents_limit INTEGER;
  max_campaigns_limit INTEGER;
  expires_at TIMESTAMP;
BEGIN
  -- Set limits based on package type
  CASE package_type
    WHEN 'basic' THEN
      minutes_limit := 500;
      max_agents_limit := 2;
      max_campaigns_limit := 3;
      expires_at := NOW() + INTERVAL '1 month';
    WHEN 'standard' THEN
      minutes_limit := 1500;
      max_agents_limit := 5;
      max_campaigns_limit := 10;
      expires_at := NOW() + INTERVAL '2 months';
    WHEN 'premium' THEN
      minutes_limit := 5000;
      max_agents_limit := 15;
      max_campaigns_limit := 25;
      expires_at := NOW() + INTERVAL '3 months';
    ELSE
      minutes_limit := 500;
      max_agents_limit := 2;
      max_campaigns_limit := 3;
      expires_at := NOW() + INTERVAL '1 month';
  END CASE;
  
  -- Create profile
  INSERT INTO profiles (email, full_name)
  VALUES (user_email, user_full_name)
  RETURNING id INTO new_profile_id;
  
  -- Create user permissions based on package
  INSERT INTO user_permissions (
    profile_id,
    created_by,
    can_access_dashboard,
    can_view_analytics,
    can_view_call_logs,
    can_view_appointments,
    can_manage_leads,
    can_create_agents,
    max_agents,
    can_create_campaigns,
    max_campaigns,
    max_concurrent_calls,
    monthly_minutes_limit,
    can_use_live_calls,
    can_record_calls,
    can_export_data,
    can_use_webhooks,
    can_use_analytics,
    can_use_integrations,
    subscription_tier,
    subscription_expires_at,
    package_type,
    fiverr_order_id,
    fiverr_buyer_username,
    is_active
  ) VALUES (
    new_profile_id,
    auth.uid(), -- Admin creating the user
    true,
    CASE WHEN package_type IN ('standard', 'premium') THEN true ELSE false END,
    true,
    true,
    true,
    true,
    max_agents_limit,
    true,
    max_campaigns_limit,
    CASE WHEN package_type = 'premium' THEN 5 ELSE 3 END,
    minutes_limit,
    true,
    CASE WHEN package_type IN ('standard', 'premium') THEN true ELSE false END,
    CASE WHEN package_type = 'premium' THEN true ELSE false END,
    CASE WHEN package_type = 'premium' THEN true ELSE false END,
    CASE WHEN package_type IN ('standard', 'premium') THEN true ELSE false END,
    CASE WHEN package_type = 'premium' THEN true ELSE false END,
    package_type,
    expires_at,
    package_type,
    fiverr_order_id,
    fiverr_buyer_username,
    true
  );
  
  -- Initialize usage tracking
  INSERT INTO usage_tracking (profile_id) VALUES (new_profile_id);
  
  result := jsonb_build_object(
    'success', true,
    'profile_id', new_profile_id,
    'package_type', package_type,
    'minutes_limit', minutes_limit,
    'max_agents', max_agents_limit,
    'max_campaigns', max_campaigns_limit,
    'expires_at', expires_at,
    'message', 'Fiverr user created successfully'
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user limits before actions
CREATE OR REPLACE FUNCTION check_user_limits(
  action_type TEXT, -- 'create_agent', 'create_campaign', 'use_minutes'
  minutes_to_use INTEGER DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  user_perms user_permissions%ROWTYPE;
  current_count INTEGER;
  result JSONB;
BEGIN
  -- Get user permissions
  SELECT * INTO user_perms 
  FROM user_permissions 
  WHERE profile_id = auth.uid() AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'No permissions found');
  END IF;
  
  -- Check subscription expiry
  IF user_perms.subscription_expires_at < NOW() THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Subscription expired');
  END IF;
  
  CASE action_type
    WHEN 'create_agent' THEN
      IF NOT user_perms.can_create_agents THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Agent creation not allowed');
      END IF;
      
      SELECT COUNT(*) INTO current_count FROM ai_agents WHERE profile_id = auth.uid();
      IF current_count >= user_perms.max_agents THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Agent limit reached',
          'current', current_count,
          'limit', user_perms.max_agents
        );
      END IF;
      
    WHEN 'create_campaign' THEN
      IF NOT user_perms.can_create_campaigns THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Campaign creation not allowed');
      END IF;
      
      SELECT COUNT(*) INTO current_count FROM outbound_campaigns WHERE profile_id = auth.uid();
      IF current_count >= user_perms.max_campaigns THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Campaign limit reached',
          'current', current_count,
          'limit', user_perms.max_campaigns
        );
      END IF;
      
    WHEN 'use_minutes' THEN
      IF user_perms.minutes_used + minutes_to_use > user_perms.monthly_minutes_limit THEN
        RETURN jsonb_build_object(
          'allowed', false, 
          'reason', 'Monthly minutes limit would be exceeded',
          'current', user_perms.minutes_used,
          'limit', user_perms.monthly_minutes_limit,
          'requested', minutes_to_use
        );
      END IF;
  END CASE;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update usage tracking
CREATE OR REPLACE FUNCTION update_usage(
  minutes_used INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  agents_created INTEGER DEFAULT 0,
  campaigns_created INTEGER DEFAULT 0,
  leads_processed INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (
    profile_id, 
    call_minutes_used, 
    calls_made, 
    agents_created, 
    campaigns_created, 
    leads_processed
  ) VALUES (
    auth.uid(), 
    minutes_used, 
    calls_made, 
    agents_created, 
    campaigns_created, 
    leads_processed
  )
  ON CONFLICT (profile_id, tracking_month, tracking_year) 
  DO UPDATE SET
    call_minutes_used = usage_tracking.call_minutes_used + minutes_used,
    calls_made = usage_tracking.calls_made + calls_made,
    agents_created = usage_tracking.agents_created + agents_created,
    campaigns_created = usage_tracking.campaigns_created + campaigns_created,
    leads_processed = usage_tracking.leads_processed + leads_processed,
    updated_at = NOW();
    
  -- Also update user_permissions minutes_used
  UPDATE user_permissions 
  SET minutes_used = minutes_used + minutes_used
  WHERE profile_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: CREATE ADMIN VIEWS FOR EASY MANAGEMENT
-- =====================================================

-- View for admin to see all users and their limits
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT 
  p.id as profile_id,
  p.email,
  p.full_name,
  up.package_type,
  up.subscription_tier,
  up.subscription_expires_at,
  up.monthly_minutes_limit,
  up.minutes_used,
  up.max_agents,
  up.max_campaigns,
  up.is_active,
  up.fiverr_order_id,
  up.fiverr_buyer_username,
  up.created_at as user_created_at,
  (SELECT COUNT(*) FROM ai_agents WHERE profile_id = p.id) as agents_count,
  (SELECT COUNT(*) FROM outbound_campaigns WHERE profile_id = p.id) as campaigns_count,
  ut.calls_made,
  ut.leads_processed
FROM profiles p
LEFT JOIN user_permissions up ON p.id = up.profile_id
LEFT JOIN usage_tracking ut ON p.id = ut.profile_id 
  AND ut.tracking_month = EXTRACT(MONTH FROM NOW())
  AND ut.tracking_year = EXTRACT(YEAR FROM NOW());

-- =====================================================
-- PART 7: INSERT DEFAULT ADMIN USER PERMISSIONS
-- =====================================================

-- Create admin permissions for the first user (you)
-- Replace 'your-email@example.com' with your actual email
INSERT INTO user_permissions (
  profile_id,
  subscription_tier,
  can_access_dashboard,
  can_view_analytics,
  can_view_call_logs,
  can_view_appointments,
  can_manage_leads,
  can_create_agents,
  max_agents,
  can_create_campaigns,
  max_campaigns,
  monthly_minutes_limit,
  can_use_live_calls,
  can_record_calls,
  can_export_data,
  can_use_webhooks,
  can_use_analytics,
  can_use_integrations,
  is_active
) 
SELECT 
  id,
  'admin',
  true,
  true,
  true,
  true,
  true,
  true,
  999,
  true,
  999,
  999999,
  true,
  true,
  true,
  true,
  true,
  true,
  true
FROM profiles 
WHERE email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
ON CONFLICT (profile_id) DO NOTHING;

-- =====================================================
-- EXECUTION COMPLETE
-- =====================================================

-- After executing all above SQL:
-- 1. RLS is enabled with admin control
-- 2. Gemini Live API integration is fixed
-- 3. Complete admin control system for Fiverr
-- 4. Usage tracking and limits
-- 5. Tiered permissions (basic, standard, premium)
-- 6. Admin functions for user management

-- Your system is now ready for Fiverr launch with full admin control!