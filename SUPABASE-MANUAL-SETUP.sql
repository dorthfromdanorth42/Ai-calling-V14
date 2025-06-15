-- =====================================================
-- CRITICAL FIXES - MANUAL SUPABASE SETUP
-- Run these commands in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: ADD ADMIN CONTROL COLUMNS TO PROFILES TABLE
-- =====================================================

-- Add admin control columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_agents INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_minutes INTEGER DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_features JSONB DEFAULT '{"basic_calling": true}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add constraints for data integrity
ALTER TABLE profiles ADD CONSTRAINT check_role CHECK (role IN ('admin', 'user'));
ALTER TABLE profiles ADD CONSTRAINT check_subscription_tier CHECK (subscription_tier IN ('basic', 'premium', 'enterprise'));
ALTER TABLE profiles ADD CONSTRAINT check_max_agents CHECK (max_agents >= 0);
ALTER TABLE profiles ADD CONSTRAINT check_max_minutes CHECK (max_minutes >= 0);
ALTER TABLE profiles ADD CONSTRAINT check_minutes_used CHECK (minutes_used >= 0);

-- Update existing profiles with default values
UPDATE profiles SET 
  role = 'user',
  subscription_tier = 'basic',
  max_agents = 1,
  max_minutes = 100,
  allowed_features = '{"basic_calling": true}',
  is_active = true,
  minutes_used = 0
WHERE role IS NULL;

-- Create your admin user (replace with your actual email)
UPDATE profiles SET 
  role = 'admin',
  subscription_tier = 'enterprise',
  max_agents = 999,
  max_minutes = 999999,
  allowed_features = '{"basic_calling": true, "advanced_analytics": true, "custom_voices": true, "api_access": true, "admin_panel": true}',
  is_active = true
WHERE email = 'admin@nationwidelifeline.com'; -- CHANGE THIS TO YOUR EMAIL

-- =====================================================
-- STEP 2: FIX CALL_LOGS TABLE FOR GEMINI LIVE API
-- =====================================================

-- Add missing columns to call_logs table
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS call_duration_seconds INTEGER DEFAULT 0;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS call_transcript JSONB;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS call_summary TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS call_outcome TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS cost_cents INTEGER DEFAULT 0;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add constraints for call_logs
ALTER TABLE call_logs ADD CONSTRAINT check_call_outcome CHECK (call_outcome IN ('interested', 'not_interested', 'callback', 'appointment_scheduled', 'voicemail', 'wrong_number', 'do_not_call'));
ALTER TABLE call_logs ADD CONSTRAINT check_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 1);
ALTER TABLE call_logs ADD CONSTRAINT check_call_duration CHECK (call_duration_seconds >= 0);
ALTER TABLE call_logs ADD CONSTRAINT check_tokens_used CHECK (tokens_used >= 0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_session_id ON call_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_duration ON call_logs(call_duration_seconds);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_outcome ON call_logs(call_outcome);

-- =====================================================
-- STEP 3: ADD ADMIN CONTROL FIELDS TO OTHER TABLES
-- =====================================================

-- Add admin control fields to ai_agents table
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS agent_tier TEXT DEFAULT 'basic';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS successful_calls INTEGER DEFAULT 0;

-- Add constraints for ai_agents
ALTER TABLE ai_agents ADD CONSTRAINT check_agent_tier CHECK (agent_tier IN ('basic', 'premium', 'enterprise'));
ALTER TABLE ai_agents ADD CONSTRAINT check_agent_minutes_used CHECK (minutes_used >= 0);
ALTER TABLE ai_agents ADD CONSTRAINT check_total_calls CHECK (total_calls >= 0);
ALTER TABLE ai_agents ADD CONSTRAINT check_successful_calls CHECK (successful_calls >= 0);

-- Add admin control fields to outbound_campaigns table
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS campaign_tier TEXT DEFAULT 'basic';
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0;
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS successful_calls INTEGER DEFAULT 0;
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0;

-- Add constraints for outbound_campaigns
ALTER TABLE outbound_campaigns ADD CONSTRAINT check_campaign_tier CHECK (campaign_tier IN ('basic', 'premium', 'enterprise'));
ALTER TABLE outbound_campaigns ADD CONSTRAINT check_campaign_total_calls CHECK (total_calls >= 0);
ALTER TABLE outbound_campaigns ADD CONSTRAINT check_campaign_successful_calls CHECK (successful_calls >= 0);
ALTER TABLE outbound_campaigns ADD CONSTRAINT check_campaign_total_minutes CHECK (total_minutes >= 0);

-- =====================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all critical tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES
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

-- Users can create agents
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

-- Admins can update all agents
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
-- STEP 6: CREATE ADMIN MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to check if user has reached agent limit
CREATE OR REPLACE FUNCTION check_agent_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_max_agents INTEGER;
  current_agent_count INTEGER;
  user_active BOOLEAN;
BEGIN
  -- Get user's max agents limit and active status
  SELECT max_agents, is_active INTO user_max_agents, user_active
  FROM profiles
  WHERE id = NEW.profile_id;
  
  -- Check if user is active
  IF NOT user_active THEN
    RAISE EXCEPTION 'User account is not active';
  END IF;
  
  -- Count current active agents
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
DROP TRIGGER IF EXISTS enforce_agent_limit ON ai_agents;
CREATE TRIGGER enforce_agent_limit
  BEFORE INSERT ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION check_agent_limit();

-- Function to update minutes used when call is completed
CREATE OR REPLACE FUNCTION update_minutes_used()
RETURNS TRIGGER AS $$
DECLARE
  call_minutes INTEGER;
BEGIN
  -- Calculate minutes from seconds (round up)
  call_minutes := CEIL(COALESCE(NEW.call_duration_seconds, 0)::DECIMAL / 60);
  
  -- Update minutes used in profiles table
  UPDATE profiles
  SET minutes_used = minutes_used + call_minutes
  WHERE id = NEW.profile_id;
  
  -- Update minutes used in ai_agents table if agent_id is provided
  IF NEW.agent_id IS NOT NULL THEN
    UPDATE ai_agents
    SET 
      minutes_used = minutes_used + call_minutes,
      total_calls = total_calls + 1,
      successful_calls = CASE 
        WHEN NEW.call_outcome IN ('interested', 'appointment_scheduled') 
        THEN successful_calls + 1 
        ELSE successful_calls 
      END
    WHERE id = NEW.agent_id;
  END IF;
  
  -- Update campaign stats if campaign_id is provided
  IF NEW.campaign_id IS NOT NULL THEN
    UPDATE outbound_campaigns
    SET 
      total_calls = total_calls + 1,
      successful_calls = CASE 
        WHEN NEW.call_outcome IN ('interested', 'appointment_scheduled') 
        THEN successful_calls + 1 
        ELSE successful_calls 
      END,
      total_minutes = total_minutes + call_minutes
    WHERE id = NEW.campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update minutes when call is logged
DROP TRIGGER IF EXISTS update_minutes_on_call ON call_logs;
CREATE TRIGGER update_minutes_on_call
  AFTER INSERT ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_minutes_used();

-- =====================================================
-- STEP 7: CREATE ADMIN DASHBOARD VIEWS
-- =====================================================

-- View for admin user overview
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
  COUNT(DISTINCT a.id) as agent_count,
  COUNT(DISTINCT c.id) as campaign_count,
  COUNT(DISTINCT l.id) as lead_count,
  COUNT(DISTINCT cl.id) as call_count,
  (p.max_minutes - p.minutes_used) as minutes_remaining
FROM profiles p
LEFT JOIN ai_agents a ON p.id = a.profile_id AND a.is_active = true
LEFT JOIN outbound_campaigns c ON p.id = c.profile_id
LEFT JOIN campaign_leads l ON p.id = l.profile_id
LEFT JOIN call_logs cl ON p.id = cl.profile_id
GROUP BY p.id, p.email, p.full_name, p.role, p.subscription_tier, 
         p.max_agents, p.max_minutes, p.minutes_used, p.is_active, 
         p.created_at;

-- View for system statistics
CREATE OR REPLACE VIEW admin_system_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role = 'user') as total_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'user' AND is_active = true) as active_users,
  (SELECT COUNT(*) FROM ai_agents WHERE is_active = true) as total_agents,
  (SELECT COUNT(*) FROM outbound_campaigns WHERE status = 'active') as active_campaigns,
  (SELECT COUNT(*) FROM campaign_leads) as total_leads,
  (SELECT COUNT(*) FROM call_logs WHERE created_at > NOW() - INTERVAL '24 hours') as calls_today,
  (SELECT SUM(minutes_used) FROM profiles) as total_minutes_used,
  (SELECT SUM(max_minutes) FROM profiles) as total_minutes_allowed;

-- View for call analytics
CREATE OR REPLACE VIEW call_analytics AS
SELECT 
  profile_id,
  DATE(created_at) as call_date,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN call_outcome IN ('interested', 'appointment_scheduled') THEN 1 END) as successful_calls,
  AVG(call_duration_seconds) as avg_duration,
  SUM(call_duration_seconds) as total_duration,
  AVG(confidence_score) as avg_confidence,
  COUNT(CASE WHEN call_outcome = 'appointment_scheduled' THEN 1 END) as appointments_scheduled
FROM call_logs
WHERE created_at IS NOT NULL
GROUP BY profile_id, DATE(created_at);

-- =====================================================
-- STEP 8: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outbound_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
GRANT SELECT, INSERT ON call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON live_calls TO authenticated;
GRANT SELECT ON billing TO authenticated;
GRANT SELECT ON analytics_data TO authenticated;

-- Grant view permissions
GRANT SELECT ON admin_user_overview TO authenticated;
GRANT SELECT ON admin_system_stats TO authenticated;
GRANT SELECT ON call_analytics TO authenticated;

-- =====================================================
-- STEP 9: CREATE SUBSCRIPTION TIER TEMPLATES
-- =====================================================

-- Function to get default limits for subscription tier
CREATE OR REPLACE FUNCTION get_tier_limits(tier_name TEXT)
RETURNS TABLE(max_agents INTEGER, max_minutes INTEGER, features JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE tier_name
      WHEN 'basic' THEN 1
      WHEN 'premium' THEN 5
      WHEN 'enterprise' THEN 20
      ELSE 1
    END as max_agents,
    CASE tier_name
      WHEN 'basic' THEN 100
      WHEN 'premium' THEN 500
      WHEN 'enterprise' THEN 2000
      ELSE 100
    END as max_minutes,
    CASE tier_name
      WHEN 'basic' THEN '{"basic_calling": true, "advanced_analytics": false, "custom_voices": false, "api_access": false}'::JSONB
      WHEN 'premium' THEN '{"basic_calling": true, "advanced_analytics": true, "custom_voices": true, "api_access": false, "priority_support": true}'::JSONB
      WHEN 'enterprise' THEN '{"basic_calling": true, "advanced_analytics": true, "custom_voices": true, "api_access": true, "priority_support": true, "white_label": true}'::JSONB
      ELSE '{"basic_calling": true}'::JSONB
    END as features;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES (Run these to test)
-- =====================================================

-- Test 1: Check if admin columns were added
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name IN ('role', 'max_agents', 'max_minutes');

-- Test 2: Check if call_logs has Gemini fields
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'call_logs' AND column_name IN ('session_id', 'call_duration_seconds', 'tokens_used');

-- Test 3: Check if RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('profiles', 'ai_agents', 'call_logs') AND schemaname = 'public';

-- Test 4: Check admin user overview
-- SELECT * FROM admin_user_overview LIMIT 5;

-- Test 5: Check system stats
-- SELECT * FROM admin_system_stats;

-- =====================================================
-- COMPLETED: FULL ADMIN CONTROL SYSTEM FOR FIVERR
-- =====================================================

COMMENT ON TABLE profiles IS 'User profiles with complete admin controls for Fiverr AI calling service';
COMMENT ON COLUMN profiles.role IS 'User role: admin (full access) or user (limited access)';
COMMENT ON COLUMN profiles.subscription_tier IS 'Subscription level: basic (1 agent, 100 min), premium (5 agents, 500 min), enterprise (20 agents, 2000 min)';
COMMENT ON COLUMN profiles.max_agents IS 'Maximum number of AI agents user can create';
COMMENT ON COLUMN profiles.max_minutes IS 'Maximum calling minutes allowed per month';
COMMENT ON COLUMN profiles.allowed_features IS 'JSON object defining which features user can access';
COMMENT ON COLUMN profiles.minutes_used IS 'Total minutes used by this user (auto-updated on calls)';
COMMENT ON COLUMN profiles.is_active IS 'Whether user account is active (admin can deactivate)';

-- SUCCESS! Your AI Call Center is now ready for Fiverr with complete admin controls!