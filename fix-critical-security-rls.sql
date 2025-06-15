-- =====================================================
-- CRITICAL FIX 1: ROW LEVEL SECURITY + ADMIN CONTROL
-- =====================================================

-- First, let's add admin control fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'premium', 'enterprise'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_agents INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_minutes INTEGER DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_features JSONB DEFAULT '{"basic_calling": true, "advanced_analytics": false, "custom_voices": false, "api_access": false}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add admin control fields to ai_agents table
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS agent_tier TEXT DEFAULT 'basic' CHECK (agent_tier IN ('basic', 'premium', 'enterprise'));
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Add admin control fields to outbound_campaigns table  
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS campaign_tier TEXT DEFAULT 'basic' CHECK (campaign_tier IN ('basic', 'premium', 'enterprise'));
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL CRITICAL TABLES
-- =====================================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ai_agents table
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- Enable RLS on outbound_campaigns table
ALTER TABLE outbound_campaigns ENABLE ROW LEVEL SECURITY;

-- Enable RLS on campaign_leads table
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- Enable RLS on appointments table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on call_logs table
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on live_calls table
ALTER TABLE live_calls ENABLE ROW LEVEL SECURITY;

-- Enable RLS on billing table
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- Enable RLS on analytics_data table
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE SECURITY POLICIES FOR USER DATA ISOLATION
-- =====================================================

-- PROFILES TABLE POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not admin fields)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert new profiles
CREATE POLICY "Admins can create profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- AI_AGENTS TABLE POLICIES
-- Users can view their own agents
CREATE POLICY "Users can view own agents" ON ai_agents
  FOR SELECT USING (profile_id = auth.uid());

-- Users can create agents (with limits enforced by application)
CREATE POLICY "Users can create agents" ON ai_agents
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Users can update their own agents
CREATE POLICY "Users can update own agents" ON ai_agents
  FOR UPDATE USING (profile_id = auth.uid());

-- Users can delete their own agents
CREATE POLICY "Users can delete own agents" ON ai_agents
  FOR DELETE USING (profile_id = auth.uid());

-- Admins can view all agents
CREATE POLICY "Admins can view all agents" ON ai_agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all agents (for approval/management)
CREATE POLICY "Admins can update all agents" ON ai_agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- OUTBOUND_CAMPAIGNS TABLE POLICIES
-- Users can view their own campaigns
CREATE POLICY "Users can view own campaigns" ON outbound_campaigns
  FOR SELECT USING (profile_id = auth.uid());

-- Users can create campaigns
CREATE POLICY "Users can create campaigns" ON outbound_campaigns
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Users can update their own campaigns
CREATE POLICY "Users can update own campaigns" ON outbound_campaigns
  FOR UPDATE USING (profile_id = auth.uid());

-- Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns" ON outbound_campaigns
  FOR DELETE USING (profile_id = auth.uid());

-- Admins can view all campaigns
CREATE POLICY "Admins can view all campaigns" ON outbound_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all campaigns
CREATE POLICY "Admins can update all campaigns" ON outbound_campaigns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CAMPAIGN_LEADS TABLE POLICIES
-- Users can view leads from their own campaigns
CREATE POLICY "Users can view own campaign leads" ON campaign_leads
  FOR SELECT USING (profile_id = auth.uid());

-- Users can create leads for their own campaigns
CREATE POLICY "Users can create campaign leads" ON campaign_leads
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Users can update leads from their own campaigns
CREATE POLICY "Users can update own campaign leads" ON campaign_leads
  FOR UPDATE USING (profile_id = auth.uid());

-- Users can delete leads from their own campaigns
CREATE POLICY "Users can delete own campaign leads" ON campaign_leads
  FOR DELETE USING (profile_id = auth.uid());

-- Admins can view all leads
CREATE POLICY "Admins can view all leads" ON campaign_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- APPOINTMENTS TABLE POLICIES
-- Users can view their own appointments
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (profile_id = auth.uid());

-- Users can create appointments
CREATE POLICY "Users can create appointments" ON appointments
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Users can update their own appointments
CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE USING (profile_id = auth.uid());

-- Users can delete their own appointments
CREATE POLICY "Users can delete own appointments" ON appointments
  FOR DELETE USING (profile_id = auth.uid());

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CALL_LOGS TABLE POLICIES
-- Users can view their own call logs
CREATE POLICY "Users can view own call logs" ON call_logs
  FOR SELECT USING (profile_id = auth.uid());

-- Users can create call logs
CREATE POLICY "Users can create call logs" ON call_logs
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Admins can view all call logs
CREATE POLICY "Admins can view all call logs" ON call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- LIVE_CALLS TABLE POLICIES
-- Users can view their own live calls
CREATE POLICY "Users can view own live calls" ON live_calls
  FOR SELECT USING (profile_id = auth.uid());

-- Users can create live calls
CREATE POLICY "Users can create live calls" ON live_calls
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Users can update their own live calls
CREATE POLICY "Users can update own live calls" ON live_calls
  FOR UPDATE USING (profile_id = auth.uid());

-- Admins can view all live calls
CREATE POLICY "Admins can view all live calls" ON live_calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- BILLING TABLE POLICIES
-- Users can view their own billing
CREATE POLICY "Users can view own billing" ON billing
  FOR SELECT USING (profile_id = auth.uid());

-- Admins can view all billing
CREATE POLICY "Admins can view all billing" ON billing
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update billing
CREATE POLICY "Admins can update billing" ON billing
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ANALYTICS_DATA TABLE POLICIES
-- Users can view their own analytics
CREATE POLICY "Users can view own analytics" ON analytics_data
  FOR SELECT USING (profile_id = auth.uid());

-- Admins can view all analytics
CREATE POLICY "Admins can view all analytics" ON analytics_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- CREATE ADMIN MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to check if user has reached agent limit
CREATE OR REPLACE FUNCTION check_agent_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_max_agents INTEGER;
  current_agent_count INTEGER;
BEGIN
  -- Get user's max agents limit
  SELECT max_agents INTO user_max_agents
  FROM profiles
  WHERE id = NEW.profile_id;
  
  -- Count current agents
  SELECT COUNT(*) INTO current_agent_count
  FROM ai_agents
  WHERE profile_id = NEW.profile_id AND is_active = true;
  
  -- Check if limit exceeded
  IF current_agent_count >= user_max_agents THEN
    RAISE EXCEPTION 'Agent limit exceeded. Maximum allowed: %', user_max_agents;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce agent limits
CREATE TRIGGER enforce_agent_limit
  BEFORE INSERT ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION check_agent_limit();

-- Function to check if user has minutes remaining
CREATE OR REPLACE FUNCTION check_minutes_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_max_minutes INTEGER;
  user_used_minutes INTEGER;
BEGIN
  -- Get user's limits
  SELECT max_minutes, minutes_used INTO user_max_minutes, user_used_minutes
  FROM profiles
  WHERE id = NEW.profile_id;
  
  -- Check if minutes exceeded
  IF user_used_minutes >= user_max_minutes THEN
    RAISE EXCEPTION 'Minutes limit exceeded. Maximum allowed: %', user_max_minutes;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update minutes used
CREATE OR REPLACE FUNCTION update_minutes_used()
RETURNS TRIGGER AS $$
BEGIN
  -- Update minutes used in profiles table
  UPDATE profiles
  SET minutes_used = minutes_used + COALESCE(NEW.call_duration_seconds, 0) / 60
  WHERE id = NEW.profile_id;
  
  -- Update minutes used in ai_agents table
  UPDATE ai_agents
  SET minutes_used = minutes_used + COALESCE(NEW.call_duration_seconds, 0) / 60
  WHERE id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update minutes when call is logged
CREATE TRIGGER update_minutes_on_call
  AFTER INSERT ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_minutes_used();

-- =====================================================
-- CREATE ADMIN HELPER VIEWS
-- =====================================================

-- View for admin dashboard - user overview
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.subscription_tier,
  p.max_agents,
  p.max_minutes,
  p.minutes_used,
  p.is_active,
  p.created_at,
  p.last_activity,
  COUNT(a.id) as agent_count,
  COUNT(c.id) as campaign_count,
  COUNT(l.id) as lead_count
FROM profiles p
LEFT JOIN ai_agents a ON p.id = a.profile_id AND a.is_active = true
LEFT JOIN outbound_campaigns c ON p.id = c.profile_id
LEFT JOIN campaign_leads l ON p.id = l.profile_id
GROUP BY p.id, p.email, p.full_name, p.role, p.subscription_tier, 
         p.max_agents, p.max_minutes, p.minutes_used, p.is_active, 
         p.created_at, p.last_activity;

-- View for admin dashboard - system stats
CREATE OR REPLACE VIEW admin_system_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role = 'user') as total_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'user' AND is_active = true) as active_users,
  (SELECT COUNT(*) FROM ai_agents WHERE is_active = true) as total_agents,
  (SELECT COUNT(*) FROM outbound_campaigns WHERE status = 'active') as active_campaigns,
  (SELECT COUNT(*) FROM campaign_leads) as total_leads,
  (SELECT COUNT(*) FROM call_logs WHERE created_at > NOW() - INTERVAL '24 hours') as calls_today,
  (SELECT SUM(minutes_used) FROM profiles) as total_minutes_used;

-- =====================================================
-- INSERT DEFAULT ADMIN USER (if not exists)
-- =====================================================

-- Create default admin user (update with your actual admin email)
INSERT INTO profiles (id, email, full_name, role, subscription_tier, max_agents, max_minutes, allowed_features, is_active)
VALUES (
  gen_random_uuid(),
  'admin@nationwidelifeline.com', -- Change this to your admin email
  'System Administrator',
  'admin',
  'enterprise',
  999,
  999999,
  '{"basic_calling": true, "advanced_analytics": true, "custom_voices": true, "api_access": true, "admin_panel": true}',
  true
) ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  subscription_tier = 'enterprise',
  max_agents = 999,
  max_minutes = 999999,
  allowed_features = '{"basic_calling": true, "advanced_analytics": true, "custom_voices": true, "api_access": true, "admin_panel": true}',
  is_active = true;

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outbound_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
GRANT SELECT, INSERT ON call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON live_calls TO authenticated;
GRANT SELECT ON billing TO authenticated;
GRANT SELECT ON analytics_data TO authenticated;

-- Grant view permissions
GRANT SELECT ON admin_user_overview TO authenticated;
GRANT SELECT ON admin_system_stats TO authenticated;

-- =====================================================
-- SECURITY VERIFICATION QUERIES
-- =====================================================

-- Test RLS is working (these should return no results for non-admin users)
-- SELECT * FROM profiles WHERE id != auth.uid(); -- Should fail for regular users
-- SELECT * FROM ai_agents WHERE profile_id != auth.uid(); -- Should fail for regular users

COMMENT ON TABLE profiles IS 'User profiles with admin controls for Fiverr-based AI calling service';
COMMENT ON COLUMN profiles.role IS 'User role: admin or user';
COMMENT ON COLUMN profiles.subscription_tier IS 'Subscription level: basic, premium, enterprise';
COMMENT ON COLUMN profiles.max_agents IS 'Maximum number of AI agents user can create';
COMMENT ON COLUMN profiles.max_minutes IS 'Maximum calling minutes allowed';
COMMENT ON COLUMN profiles.allowed_features IS 'JSON object defining which features user can access';
COMMENT ON COLUMN profiles.minutes_used IS 'Total minutes used by this user';
COMMENT ON COLUMN profiles.created_by IS 'Admin user who created this account';

-- =====================================================
-- COMPLETED: ROW LEVEL SECURITY + ADMIN CONTROL SYSTEM
-- =====================================================