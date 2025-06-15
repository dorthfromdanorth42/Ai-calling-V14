-- QUICK FIXES FOR CRITICAL ISSUES

-- 1. Add missing profile_id column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Temporarily disable RLS for testing (ONLY FOR TESTING)
ALTER TABLE ai_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- 3. Create a test profile if it doesn't exist
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'test@example.com', 
  'Test User',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;