-- =====================================================
-- MISSING SCHEMA FOR ENHANCED DASHBOARD FEATURES
-- Add these to your Supabase database for full functionality
-- =====================================================

-- 1. Add missing columns to existing tables for revenue tracking
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS revenue_generated DECIMAL(10,2) DEFAULT 0;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS cost_per_call DECIMAL(10,2) DEFAULT 0.85;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS cost_per_minute DECIMAL(10,2) DEFAULT 0.12;

-- 2. Add missing columns to appointments table for show rate tracking
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS show_status VARCHAR(20) DEFAULT 'scheduled';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS actual_show_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS no_show_reason TEXT;

-- 3. Create revenue tracking table
CREATE TABLE IF NOT EXISTS revenue_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    revenue_type VARCHAR(50) NOT NULL, -- 'call_commission', 'appointment_booking', 'sale_completed'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_period_start DATE,
    billing_period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create cost tracking table
CREATE TABLE IF NOT EXISTS cost_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    cost_type VARCHAR(50) NOT NULL, -- 'twilio_call', 'gemini_api', 'system_overhead'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_period_start DATE,
    billing_period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enhanced analytics view for monthly data
CREATE OR REPLACE VIEW monthly_analytics AS
SELECT 
    profile_id,
    DATE_TRUNC('month', started_at) as month,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_calls,
    SUM(duration_seconds) as total_duration_seconds,
    AVG(duration_seconds) as avg_duration_seconds,
    SUM(revenue_generated) as total_revenue,
    SUM(cost_per_call) as total_costs,
    COUNT(*) FILTER (WHERE outcome = 'appointment_scheduled') as appointments_scheduled,
    COUNT(*) FILTER (WHERE outcome = 'sale_completed') as sales_completed
FROM call_logs
WHERE started_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY profile_id, DATE_TRUNC('month', started_at);

-- 6. Update the get_user_analytics function to include missing fields
CREATE OR REPLACE FUNCTION get_user_analytics(user_id uuid, days_back integer default 30)
RETURNS json AS $$
DECLARE
  result json;
  current_month_start date := DATE_TRUNC('month', CURRENT_DATE);
  last_month_start date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
  last_month_end date := current_month_start - INTERVAL '1 day';
BEGIN
  SELECT json_build_object(
    -- Existing fields
    'totalCalls', COALESCE(SUM(total_calls), 0),
    'totalMinutes', COALESCE(SUM(total_duration_seconds) / 60, 0),
    'successfulCalls', COALESCE(SUM(answered_calls), 0),
    'averageCallDuration', COALESCE(AVG(average_duration_seconds), 0),
    'customerSatisfactionAvg', COALESCE(AVG(customer_satisfaction_avg), 0),
    'sentimentScoreAvg', COALESCE(AVG(sentiment_score_avg), 0),
    'appointmentsScheduled', COALESCE(SUM(appointments_scheduled), 0),
    'salesCompleted', COALESCE(SUM(sales_completed), 0),
    'escalations', COALESCE(SUM(escalations), 0),
    
    -- NEW ENHANCED DASHBOARD FIELDS
    'totalRevenue', (
      SELECT COALESCE(SUM(revenue_generated), 0)
      FROM call_logs 
      WHERE profile_id = user_id 
        AND started_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    'revenueThisMonth', (
      SELECT COALESCE(SUM(revenue_generated), 0)
      FROM call_logs 
      WHERE profile_id = user_id 
        AND started_at >= current_month_start
    ),
    'revenueLastMonth', (
      SELECT COALESCE(SUM(revenue_generated), 0)
      FROM call_logs 
      WHERE profile_id = user_id 
        AND started_at >= last_month_start 
        AND started_at <= last_month_end
    ),
    'costsThisMonth', (
      SELECT COALESCE(SUM(cost_per_call), 0)
      FROM call_logs 
      WHERE profile_id = user_id 
        AND started_at >= current_month_start
    ),
    'costsLastMonth', (
      SELECT COALESCE(SUM(cost_per_call), 0)
      FROM call_logs 
      WHERE profile_id = user_id 
        AND started_at >= last_month_start 
        AND started_at <= last_month_end
    ),
    'costPerCall', 0.85,
    'costPerMinute', 0.12,
    'callsThisMonth', (
      SELECT COUNT(*)
      FROM call_logs 
      WHERE profile_id = user_id 
        AND started_at >= current_month_start
    ),
    'answeredCalls', (
      SELECT COUNT(*)
      FROM call_logs 
      WHERE profile_id = user_id 
        AND status = 'completed'
        AND started_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    'answerRate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(*) FILTER (WHERE status = 'completed')::float / COUNT(*)) * 100
        ELSE 0 
      END
      FROM call_logs 
      WHERE profile_id = user_id 
        AND started_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    'avgCallDuration', (
      SELECT COALESCE(AVG(duration_seconds), 0)
      FROM call_logs 
      WHERE profile_id = user_id 
        AND status = 'completed'
        AND started_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    'totalAppointments', (
      SELECT COUNT(*)
      FROM appointments 
      WHERE profile_id = user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    'appointmentsThisMonth', (
      SELECT COUNT(*)
      FROM appointments 
      WHERE profile_id = user_id 
        AND created_at >= current_month_start
    ),
    'appointmentConversionRate', (
      SELECT CASE 
        WHEN (SELECT COUNT(*) FROM call_logs WHERE profile_id = user_id AND started_at >= CURRENT_DATE - INTERVAL '1 day' * days_back) > 0 THEN 
          (COUNT(*)::float / (SELECT COUNT(*) FROM call_logs WHERE profile_id = user_id AND started_at >= CURRENT_DATE - INTERVAL '1 day' * days_back)) * 100
        ELSE 0 
      END
      FROM appointments 
      WHERE profile_id = user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    'appointmentShowRate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(*) FILTER (WHERE show_status = 'showed')::float / COUNT(*)) * 100
        ELSE 0 
      END
      FROM appointments 
      WHERE profile_id = user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    'activeCampaigns', (
      SELECT COUNT(*)
      FROM campaigns 
      WHERE profile_id = user_id 
        AND status = 'active'
    ),
    'totalLeads', (
      SELECT COUNT(*)
      FROM campaign_leads 
      WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE profile_id = user_id
      )
    ),
    'contactedLeads', (
      SELECT COUNT(*)
      FROM campaign_leads 
      WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE profile_id = user_id
      )
      AND status IN ('contacted', 'converted', 'qualified')
    ),
    'convertedLeads', (
      SELECT COUNT(*)
      FROM campaign_leads 
      WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE profile_id = user_id
      )
      AND status = 'converted'
    ),
    'leadConversionRate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(*) FILTER (WHERE status = 'converted')::float / COUNT(*)) * 100
        ELSE 0 
      END
      FROM campaign_leads 
      WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE profile_id = user_id
      )
    ),
    'totalAgents', (
      SELECT COUNT(*)
      FROM ai_agents 
      WHERE profile_id = user_id
    ),
    'activeAgents', (
      SELECT COUNT(*)
      FROM ai_agents 
      WHERE profile_id = user_id 
        AND is_active = true
    ),
    'agentUtilization', (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(*) FILTER (WHERE status = 'busy')::float / COUNT(*)) * 100
        ELSE 0 
      END
      FROM ai_agents 
      WHERE profile_id = user_id 
        AND is_active = true
    ),
    'avgSatisfactionScore', COALESCE(AVG(customer_satisfaction_avg), 0),
    
    -- Existing aggregated data
    'callsByDay', (
      SELECT json_agg(
        json_build_object(
          'date', date,
          'count', total_calls,
          'duration', total_duration_seconds
        ) ORDER BY date
      )
      FROM call_analytics
      WHERE profile_id = user_id
        AND date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    ),
    'callsByStatus', (
      SELECT json_agg(
        json_build_object(
          'status', status,
          'count', count(*)
        )
      )
      FROM call_logs
      WHERE profile_id = user_id
        AND started_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
      GROUP BY status
    ),
    'topOutcomes', (
      SELECT json_agg(
        json_build_object(
          'outcome', outcome,
          'count', count(*)
        ) ORDER BY count(*) DESC
      )
      FROM call_logs
      WHERE profile_id = user_id
        AND outcome IS NOT NULL
        AND started_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
      GROUP BY outcome
      LIMIT 10
    )
  ) INTO result
  FROM call_analytics
  WHERE profile_id = user_id
    AND date >= CURRENT_DATE - INTERVAL '1 day' * days_back;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_revenue ON call_logs(profile_id, started_at, revenue_generated);
CREATE INDEX IF NOT EXISTS idx_call_logs_costs ON call_logs(profile_id, started_at, cost_per_call);
CREATE INDEX IF NOT EXISTS idx_appointments_show_status ON appointments(profile_id, show_status, created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_records_profile_period ON revenue_records(profile_id, billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_cost_records_profile_period ON cost_records(profile_id, billing_period_start, billing_period_end);

-- 8. Create triggers to automatically calculate costs and revenue
CREATE OR REPLACE FUNCTION calculate_call_costs()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate cost based on duration and type
  NEW.cost_per_call := 0.85; -- Base cost per call
  NEW.cost_per_minute := 0.12; -- Cost per minute
  
  -- Estimate revenue based on outcome
  CASE NEW.outcome
    WHEN 'sale_completed' THEN NEW.revenue_generated := 100.00;
    WHEN 'appointment_scheduled' THEN NEW.revenue_generated := 50.00;
    WHEN 'lead_qualified' THEN NEW.revenue_generated := 25.00;
    ELSE NEW.revenue_generated := 0.00;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_calculate_call_costs ON call_logs;
CREATE TRIGGER trigger_calculate_call_costs
  BEFORE INSERT OR UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_call_costs();

-- 9. Insert sample data for testing (optional - remove for production)
-- This will help test the enhanced dashboard with some data
/*
INSERT INTO call_logs (profile_id, phone_number, status, outcome, duration_seconds, started_at, revenue_generated, cost_per_call)
SELECT 
  (SELECT id FROM profiles LIMIT 1),
  '+1234567890',
  'completed',
  CASE (random() * 4)::int
    WHEN 0 THEN 'sale_completed'
    WHEN 1 THEN 'appointment_scheduled'
    WHEN 2 THEN 'lead_qualified'
    ELSE 'no_answer'
  END,
  (random() * 300 + 60)::int,
  NOW() - (random() * INTERVAL '30 days'),
  0, -- Will be calculated by trigger
  0  -- Will be calculated by trigger
FROM generate_series(1, 50);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify the schema is working correctly
-- =====================================================

-- Test the enhanced analytics function
-- SELECT get_user_analytics((SELECT id FROM profiles LIMIT 1), 30);

-- Check if all required tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('revenue_records', 'cost_records');

-- Verify new columns exist
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'call_logs' 
-- AND column_name IN ('revenue_generated', 'cost_per_call', 'cost_per_minute');