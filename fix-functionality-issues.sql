-- Fix RLS policies to allow data creation
-- AI Agents policies
DROP POLICY IF EXISTS "ai_agents_select_policy" ON ai_agents;
DROP POLICY IF EXISTS "ai_agents_insert_policy" ON ai_agents;
DROP POLICY IF EXISTS "ai_agents_update_policy" ON ai_agents;
DROP POLICY IF EXISTS "ai_agents_delete_policy" ON ai_agents;

CREATE POLICY "ai_agents_select_policy" ON ai_agents
    FOR SELECT USING (true);

CREATE POLICY "ai_agents_insert_policy" ON ai_agents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "ai_agents_update_policy" ON ai_agents
    FOR UPDATE USING (true);

CREATE POLICY "ai_agents_delete_policy" ON ai_agents
    FOR DELETE USING (true);

-- Outbound campaigns policies
DROP POLICY IF EXISTS "outbound_campaigns_select_policy" ON outbound_campaigns;
DROP POLICY IF EXISTS "outbound_campaigns_insert_policy" ON outbound_campaigns;
DROP POLICY IF EXISTS "outbound_campaigns_update_policy" ON outbound_campaigns;
DROP POLICY IF EXISTS "outbound_campaigns_delete_policy" ON outbound_campaigns;

CREATE POLICY "outbound_campaigns_select_policy" ON outbound_campaigns
    FOR SELECT USING (true);

CREATE POLICY "outbound_campaigns_insert_policy" ON outbound_campaigns
    FOR INSERT WITH CHECK (true);

CREATE POLICY "outbound_campaigns_update_policy" ON outbound_campaigns
    FOR UPDATE USING (true);

CREATE POLICY "outbound_campaigns_delete_policy" ON outbound_campaigns
    FOR DELETE USING (true);

-- Fix the profile creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, client_name, is_active, plan_name, permissions)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    true,
    'free',
    jsonb_build_object(
      'dashboard', true,
      'agents', true,
      'calls', true,
      'campaigns', true,
      'analytics', true,
      'appointments', true,
      'billing', false,
      'settings', true,
      'webhooks', false,
      'dnc', false,
      'status', true
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a function to check if trigger exists
CREATE OR REPLACE FUNCTION check_trigger_exists(trigger_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.triggers 
    WHERE trigger_name = $1
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if function exists
CREATE OR REPLACE FUNCTION check_function_exists(function_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.routines 
    WHERE routine_name = $1
  );
END;
$$ LANGUAGE plpgsql;