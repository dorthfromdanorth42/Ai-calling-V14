-- Additional schema for the 5 new features
-- Run this after the main schema.sql

-- 1. Add missing columns to existing tables

-- Add status column to call_queues table for live call monitoring
ALTER TABLE call_queues ADD COLUMN IF NOT EXISTS status text DEFAULT 'waiting';
ALTER TABLE call_queues ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE call_queues ADD COLUMN IF NOT EXISTS agent_type_requested text;
ALTER TABLE call_queues ADD COLUMN IF NOT EXISTS wait_time_seconds integer DEFAULT 0;

-- Add customer_name to call_logs for better call tracking
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS customer_name text;

-- 2. Create new tables for enhanced features

-- Live calls monitoring table for real-time call tracking
CREATE TABLE IF NOT EXISTS live_calls (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE CASCADE NOT NULL,
  call_log_id uuid REFERENCES call_logs(id) ON DELETE CASCADE,
  phone_number_from text NOT NULL,
  phone_number_to text NOT NULL,
  direction call_direction NOT NULL,
  status text NOT NULL, -- 'dialing', 'ringing', 'connected', 'on_hold', 'transferring'
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  call_quality text DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor'
  customer_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Webhook events table for comprehensive event logging
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'call.started', 'call.completed', 'call.failed', 'function.called'
  call_id text,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  event_data jsonb NOT NULL,
  processed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  webhook_sent boolean DEFAULT false,
  webhook_response text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auto-dialer queue table for campaign management
CREATE TABLE IF NOT EXISTS dialer_queue (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES outbound_campaigns(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES campaign_leads(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  status text DEFAULT 'queued', -- 'queued', 'dialing', 'connected', 'completed', 'failed', 'skipped'
  priority priority_level DEFAULT 'normal',
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  retry_count integer DEFAULT 0,
  last_error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Campaign metrics table for enhanced analytics
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES outbound_campaigns(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  leads_queued integer DEFAULT 0,
  leads_dialed integer DEFAULT 0,
  leads_connected integer DEFAULT 0,
  leads_completed integer DEFAULT 0,
  leads_failed integer DEFAULT 0,
  total_talk_time_seconds integer DEFAULT 0,
  average_call_duration_seconds real DEFAULT 0,
  conversion_rate real DEFAULT 0,
  cost_per_call decimal(10,4) DEFAULT 0,
  revenue_generated decimal(10,2) DEFAULT 0,
  roi_percentage real DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(profile_id, campaign_id, date)
);

-- System metrics table for platform monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  metric_name text NOT NULL, -- 'active_calls', 'total_agents', 'system_load', 'api_response_time'
  metric_value real NOT NULL,
  metric_unit text, -- 'count', 'percentage', 'milliseconds', 'bytes'
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE CASCADE,
  recorded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata jsonb DEFAULT '{}'
);

-- Function call logs table for webhook integration
CREATE TABLE IF NOT EXISTS function_call_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  call_id text NOT NULL,
  function_name text NOT NULL,
  parameters jsonb NOT NULL,
  result jsonb,
  execution_time_ms integer,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS on new tables
ALTER TABLE live_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_call_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for new tables
CREATE POLICY "Users can manage own live calls" ON live_calls FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users can view own webhook events" ON webhook_events FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own dialer queue" ON dialer_queue FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users can view own campaign metrics" ON campaign_metrics FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Users can view own system metrics" ON system_metrics FOR SELECT USING (auth.uid() = profile_id OR profile_id IS NULL);
CREATE POLICY "Users can view own function call logs" ON function_call_logs FOR SELECT USING (auth.uid() = profile_id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_calls_profile_id ON live_calls(profile_id);
CREATE INDEX IF NOT EXISTS idx_live_calls_agent_id ON live_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_live_calls_status ON live_calls(status);
CREATE INDEX IF NOT EXISTS idx_live_calls_started_at ON live_calls(started_at);

CREATE INDEX IF NOT EXISTS idx_webhook_events_profile_id ON webhook_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_call_id ON webhook_events(call_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at);

CREATE INDEX IF NOT EXISTS idx_dialer_queue_profile_id ON dialer_queue(profile_id);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_campaign_id ON dialer_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_status ON dialer_queue(status);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_scheduled_at ON dialer_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_dialer_queue_priority ON dialer_queue(priority);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_profile_id ON campaign_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON campaign_metrics(date);

CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_profile_id ON system_metrics(profile_id);

CREATE INDEX IF NOT EXISTS idx_function_call_logs_profile_id ON function_call_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_function_call_logs_call_id ON function_call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_function_call_logs_function_name ON function_call_logs(function_name);

-- 6. Create functions for enhanced features

-- Function to get live call statistics
CREATE OR REPLACE FUNCTION get_live_call_stats(user_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_active_calls', (
      SELECT COUNT(*) FROM live_calls 
      WHERE profile_id = user_id AND status IN ('connected', 'ringing', 'dialing')
    ),
    'calls_by_agent', (
      SELECT json_agg(
        json_build_object(
          'agent_id', agent_id,
          'agent_name', (SELECT name FROM ai_agents WHERE id = agent_id),
          'call_count', COUNT(*)
        )
      )
      FROM live_calls 
      WHERE profile_id = user_id AND status IN ('connected', 'ringing', 'dialing')
      GROUP BY agent_id
    ),
    'calls_by_status', (
      SELECT json_agg(
        json_build_object(
          'status', status,
          'count', COUNT(*)
        )
      )
      FROM live_calls 
      WHERE profile_id = user_id
      GROUP BY status
    ),
    'average_call_duration', (
      SELECT AVG(EXTRACT(EPOCH FROM (now() - started_at)))
      FROM live_calls 
      WHERE profile_id = user_id AND status = 'connected'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get campaign performance metrics
CREATE OR REPLACE FUNCTION get_campaign_performance(user_id uuid, campaign_id_param uuid DEFAULT NULL)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_campaigns', (
      SELECT COUNT(*) FROM outbound_campaigns 
      WHERE profile_id = user_id 
      AND (campaign_id_param IS NULL OR id = campaign_id_param)
    ),
    'active_campaigns', (
      SELECT COUNT(*) FROM outbound_campaigns 
      WHERE profile_id = user_id AND status = 'active'
      AND (campaign_id_param IS NULL OR id = campaign_id_param)
    ),
    'total_leads', (
      SELECT SUM(total_leads) FROM outbound_campaigns 
      WHERE profile_id = user_id
      AND (campaign_id_param IS NULL OR id = campaign_id_param)
    ),
    'leads_called', (
      SELECT SUM(leads_called) FROM outbound_campaigns 
      WHERE profile_id = user_id
      AND (campaign_id_param IS NULL OR id = campaign_id_param)
    ),
    'leads_answered', (
      SELECT SUM(leads_answered) FROM outbound_campaigns 
      WHERE profile_id = user_id
      AND (campaign_id_param IS NULL OR id = campaign_id_param)
    ),
    'conversion_rate', (
      SELECT CASE 
        WHEN SUM(leads_called) > 0 
        THEN (SUM(leads_completed)::real / SUM(leads_called)::real) * 100 
        ELSE 0 
      END
      FROM outbound_campaigns 
      WHERE profile_id = user_id
      AND (campaign_id_param IS NULL OR id = campaign_id_param)
    ),
    'daily_metrics', (
      SELECT json_agg(
        json_build_object(
          'date', date,
          'leads_dialed', leads_dialed,
          'leads_connected', leads_connected,
          'conversion_rate', conversion_rate,
          'revenue_generated', revenue_generated
        ) ORDER BY date DESC
      )
      FROM campaign_metrics 
      WHERE profile_id = user_id
      AND (campaign_id_param IS NULL OR campaign_id = campaign_id_param)
      AND date >= CURRENT_DATE - INTERVAL '30 days'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update live call status
CREATE OR REPLACE FUNCTION update_live_call_status()
RETURNS trigger AS $$
BEGIN
  -- Update or insert live call record
  INSERT INTO live_calls (
    profile_id,
    agent_id,
    call_log_id,
    phone_number_from,
    phone_number_to,
    direction,
    status,
    started_at,
    customer_name
  )
  VALUES (
    NEW.profile_id,
    NEW.agent_id,
    NEW.id,
    NEW.phone_number_from,
    NEW.phone_number_to,
    NEW.direction,
    NEW.status,
    NEW.started_at,
    NEW.customer_name
  )
  ON CONFLICT (call_log_id) 
  DO UPDATE SET
    status = NEW.status,
    last_updated = now();
  
  -- Remove from live calls when call ends
  IF NEW.status IN ('completed', 'failed', 'abandoned') THEN
    DELETE FROM live_calls WHERE call_log_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for live call tracking
DROP TRIGGER IF EXISTS track_live_calls ON call_logs;
CREATE TRIGGER track_live_calls
  AFTER INSERT OR UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_live_call_status();

-- Function to clean up old records
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void AS $$
BEGIN
  -- Clean up old webhook events (older than 30 days)
  DELETE FROM webhook_events 
  WHERE created_at < now() - interval '30 days';
  
  -- Clean up old system metrics (older than 90 days)
  DELETE FROM system_metrics 
  WHERE recorded_at < now() - interval '90 days';
  
  -- Clean up old function call logs (older than 30 days)
  DELETE FROM function_call_logs 
  WHERE created_at < now() - interval '30 days';
  
  -- Clean up completed dialer queue entries (older than 7 days)
  DELETE FROM dialer_queue 
  WHERE status IN ('completed', 'failed', 'skipped') 
  AND updated_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- 7. Insert demo data for new features

-- Demo live calls
INSERT INTO live_calls (
  profile_id,
  agent_id,
  phone_number_from,
  phone_number_to,
  direction,
  status,
  started_at,
  customer_name,
  call_quality
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  (SELECT id FROM ai_agents WHERE profile_id = '00000000-0000-0000-0000-000000000000' LIMIT 1),
  '+1-555-123-4567',
  '+1-555-987-6543',
  'inbound',
  'connected',
  now() - interval '2 minutes',
  'John Smith',
  'excellent'
),
(
  '00000000-0000-0000-0000-000000000000',
  (SELECT id FROM ai_agents WHERE profile_id = '00000000-0000-0000-0000-000000000000' OFFSET 1 LIMIT 1),
  '+1-555-234-5678',
  '+1-555-876-5432',
  'outbound',
  'ringing',
  now() - interval '30 seconds',
  'Sarah Johnson',
  'good'
) ON CONFLICT DO NOTHING;

-- Demo webhook events
INSERT INTO webhook_events (
  profile_id,
  event_type,
  call_id,
  event_data,
  webhook_sent
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  'call.started',
  'demo-call-1',
  '{"phone_number": "+1-555-123-4567", "direction": "inbound", "agent_id": "demo-agent-1"}',
  true
),
(
  '00000000-0000-0000-0000-000000000000',
  'call.completed',
  'demo-call-2',
  '{"phone_number": "+1-555-234-5678", "direction": "outbound", "duration": 180, "outcome": "appointment_scheduled"}',
  true
) ON CONFLICT DO NOTHING;

-- Demo campaign metrics
INSERT INTO campaign_metrics (
  profile_id,
  campaign_id,
  date,
  leads_queued,
  leads_dialed,
  leads_connected,
  leads_completed,
  total_talk_time_seconds,
  conversion_rate,
  revenue_generated
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  (SELECT id FROM outbound_campaigns WHERE profile_id = '00000000-0000-0000-0000-000000000000' LIMIT 1),
  CURRENT_DATE,
  100,
  85,
  42,
  15,
  7200,
  17.6,
  2500.00
),
(
  '00000000-0000-0000-0000-000000000000',
  (SELECT id FROM outbound_campaigns WHERE profile_id = '00000000-0000-0000-0000-000000000000' LIMIT 1),
  CURRENT_DATE - 1,
  120,
  95,
  48,
  18,
  8640,
  18.9,
  3200.00
) ON CONFLICT (profile_id, campaign_id, date) DO NOTHING;

-- Demo system metrics
INSERT INTO system_metrics (
  metric_name,
  metric_value,
  metric_unit,
  profile_id
) VALUES 
('active_calls', 3, 'count', '00000000-0000-0000-0000-000000000000'),
('api_response_time', 145.5, 'milliseconds', NULL),
('system_load', 65.2, 'percentage', NULL),
('total_agents', 4, 'count', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;