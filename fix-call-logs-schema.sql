-- =====================================================
-- CRITICAL FIX 2: CALL LOGS SCHEMA FOR GEMINI LIVE API
-- =====================================================

-- Drop existing call_logs table to recreate with proper schema
DROP TABLE IF EXISTS call_logs CASCADE;

-- Create call_logs table with Gemini Live API compatible fields
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES outbound_campaigns(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
  
  -- Phone call details
  phone_number_from TEXT NOT NULL,
  phone_number_to TEXT NOT NULL,
  call_sid TEXT, -- Twilio call SID
  
  -- Call status and timing
  call_status TEXT NOT NULL DEFAULT 'pending' CHECK (call_status IN ('pending', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'cancelled')),
  call_direction TEXT DEFAULT 'outbound' CHECK (call_direction IN ('inbound', 'outbound')),
  call_duration_seconds INTEGER DEFAULT 0,
  call_started_at TIMESTAMP WITH TIME ZONE,
  call_ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Gemini Live API specific fields
  session_id TEXT, -- Gemini Live session identifier
  conversation_id TEXT, -- Conversation tracking
  model_used TEXT DEFAULT 'gemini-pro', -- AI model used
  
  -- Call content and analysis
  call_transcript JSONB, -- Full conversation transcript
  call_summary TEXT, -- AI-generated summary
  call_outcome TEXT CHECK (call_outcome IN ('interested', 'not_interested', 'callback', 'appointment_scheduled', 'voicemail', 'wrong_number', 'do_not_call')),
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  
  -- AI agent performance
  response_time_ms INTEGER, -- Average AI response time
  interruptions_count INTEGER DEFAULT 0,
  silence_duration_seconds INTEGER DEFAULT 0,
  
  -- Call quality metrics
  audio_quality_score DECIMAL(3,2), -- 0.0 to 1.0
  connection_quality TEXT CHECK (connection_quality IN ('excellent', 'good', 'fair', 'poor')),
  
  -- Business outcomes
  appointment_scheduled BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  lead_qualified BOOLEAN DEFAULT false,
  
  -- Recording and compliance
  recording_url TEXT,
  recording_duration_seconds INTEGER,
  consent_given BOOLEAN DEFAULT false,
  
  -- Cost tracking
  cost_cents INTEGER DEFAULT 0, -- Cost in cents
  tokens_used INTEGER DEFAULT 0, -- AI tokens consumed
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_call_logs_profile_id ON call_logs(profile_id);
CREATE INDEX idx_call_logs_campaign_id ON call_logs(campaign_id);
CREATE INDEX idx_call_logs_agent_id ON call_logs(agent_id);
CREATE INDEX idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX idx_call_logs_call_status ON call_logs(call_status);
CREATE INDEX idx_call_logs_call_started_at ON call_logs(call_started_at);
CREATE INDEX idx_call_logs_phone_number_to ON call_logs(phone_number_to);
CREATE INDEX idx_call_logs_session_id ON call_logs(session_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_call_logs_updated_at();

-- =====================================================
-- UPDATE LIVE_CALLS TABLE FOR REAL-TIME MONITORING
-- =====================================================

-- Drop and recreate live_calls table for real-time call monitoring
DROP TABLE IF EXISTS live_calls CASCADE;

CREATE TABLE live_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES outbound_campaigns(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
  
  -- Call identification
  call_sid TEXT NOT NULL, -- Twilio call SID
  session_id TEXT, -- Gemini Live session ID
  phone_number_from TEXT NOT NULL,
  phone_number_to TEXT NOT NULL,
  
  -- Real-time status
  status TEXT NOT NULL DEFAULT 'initiating' CHECK (status IN ('initiating', 'ringing', 'connected', 'speaking', 'listening', 'transferring', 'ending', 'completed')),
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  connected_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  
  -- Real-time metrics
  current_speaker TEXT CHECK (current_speaker IN ('ai', 'human', 'silence')),
  conversation_turns INTEGER DEFAULT 0,
  ai_response_time_ms INTEGER,
  
  -- Live transcript
  live_transcript JSONB DEFAULT '[]', -- Array of conversation turns
  current_ai_message TEXT,
  current_human_message TEXT,
  
  -- Quality monitoring
  audio_quality TEXT DEFAULT 'good' CHECK (audio_quality IN ('excellent', 'good', 'fair', 'poor')),
  connection_stable BOOLEAN DEFAULT true,
  
  -- Agent performance
  agent_confidence DECIMAL(3,2) DEFAULT 0.8,
  conversation_flow TEXT DEFAULT 'normal' CHECK (conversation_flow IN ('normal', 'struggling', 'excellent')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for live_calls
CREATE INDEX idx_live_calls_profile_id ON live_calls(profile_id);
CREATE INDEX idx_live_calls_agent_id ON live_calls(agent_id);
CREATE INDEX idx_live_calls_status ON live_calls(status);
CREATE INDEX idx_live_calls_call_sid ON live_calls(call_sid);
CREATE INDEX idx_live_calls_session_id ON live_calls(session_id);
CREATE INDEX idx_live_calls_started_at ON live_calls(started_at);

-- Create updated_at trigger for live_calls
CREATE TRIGGER trigger_live_calls_updated_at
  BEFORE UPDATE ON live_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_call_logs_updated_at();

-- =====================================================
-- CREATE CALL RECORDINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  -- Recording details
  recording_sid TEXT, -- Twilio recording SID
  recording_url TEXT NOT NULL,
  recording_duration_seconds INTEGER,
  file_size_bytes BIGINT,
  file_format TEXT DEFAULT 'mp3',
  
  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Transcription
  transcription_text TEXT,
  transcription_confidence DECIMAL(3,2),
  
  -- Compliance
  consent_recorded BOOLEAN DEFAULT false,
  retention_until DATE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for call_recordings
CREATE INDEX idx_call_recordings_profile_id ON call_recordings(profile_id);
CREATE INDEX idx_call_recordings_call_log_id ON call_recordings(call_log_id);
CREATE INDEX idx_call_recordings_processing_status ON call_recordings(processing_status);
CREATE INDEX idx_call_recordings_created_at ON call_recordings(created_at);

-- =====================================================
-- UPDATE EXISTING TABLES FOR BETTER INTEGRATION
-- =====================================================

-- Add call tracking fields to campaign_leads
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS last_call_id UUID REFERENCES call_logs(id);
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS last_call_outcome TEXT;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS next_call_scheduled TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS call_notes TEXT;

-- Add performance tracking to ai_agents
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS successful_calls INTEGER DEFAULT 0;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS average_call_duration INTEGER DEFAULT 0;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS average_response_time INTEGER DEFAULT 0;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMP WITH TIME ZONE;

-- Add campaign performance tracking
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0;
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS successful_calls INTEGER DEFAULT 0;
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0;
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2) DEFAULT 0.0;
ALTER TABLE outbound_campaigns ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- CREATE FUNCTIONS FOR CALL WORKFLOW
-- =====================================================

-- Function to start a new call
CREATE OR REPLACE FUNCTION start_call(
  p_profile_id UUID,
  p_agent_id UUID,
  p_campaign_id UUID,
  p_lead_id UUID,
  p_phone_from TEXT,
  p_phone_to TEXT,
  p_call_sid TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  live_call_id UUID;
BEGIN
  -- Insert into live_calls
  INSERT INTO live_calls (
    profile_id, agent_id, campaign_id, lead_id,
    phone_number_from, phone_number_to, call_sid,
    status
  ) VALUES (
    p_profile_id, p_agent_id, p_campaign_id, p_lead_id,
    p_phone_from, p_phone_to, p_call_sid,
    'initiating'
  ) RETURNING id INTO live_call_id;
  
  RETURN live_call_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end a call and create call log
CREATE OR REPLACE FUNCTION end_call(
  p_live_call_id UUID,
  p_call_outcome TEXT DEFAULT NULL,
  p_call_summary TEXT DEFAULT NULL,
  p_transcript JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  call_log_id UUID;
  live_call_record RECORD;
BEGIN
  -- Get live call data
  SELECT * INTO live_call_record
  FROM live_calls
  WHERE id = p_live_call_id;
  
  -- Create call log
  INSERT INTO call_logs (
    profile_id, campaign_id, agent_id, lead_id,
    phone_number_from, phone_number_to, call_sid, session_id,
    call_status, call_duration_seconds,
    call_started_at, call_ended_at,
    call_transcript, call_summary, call_outcome
  ) VALUES (
    live_call_record.profile_id,
    live_call_record.campaign_id,
    live_call_record.agent_id,
    live_call_record.lead_id,
    live_call_record.phone_number_from,
    live_call_record.phone_number_to,
    live_call_record.call_sid,
    live_call_record.session_id,
    'completed',
    live_call_record.duration_seconds,
    live_call_record.started_at,
    NOW(),
    p_transcript,
    p_call_summary,
    p_call_outcome
  ) RETURNING id INTO call_log_id;
  
  -- Update lead with call outcome
  IF live_call_record.lead_id IS NOT NULL THEN
    UPDATE campaign_leads
    SET 
      last_call_id = call_log_id,
      last_call_outcome = p_call_outcome,
      last_call_at = NOW(),
      call_attempts = call_attempts + 1,
      status = CASE 
        WHEN p_call_outcome = 'interested' THEN 'interested'
        WHEN p_call_outcome = 'callback' THEN 'callback'
        WHEN p_call_outcome = 'not_interested' THEN 'not_interested'
        ELSE status
      END
    WHERE id = live_call_record.lead_id;
  END IF;
  
  -- Update agent stats
  UPDATE ai_agents
  SET 
    total_calls = total_calls + 1,
    successful_calls = CASE WHEN p_call_outcome IN ('interested', 'appointment_scheduled') THEN successful_calls + 1 ELSE successful_calls END,
    minutes_used = minutes_used + (live_call_record.duration_seconds / 60),
    last_call_at = NOW()
  WHERE id = live_call_record.agent_id;
  
  -- Update campaign stats
  UPDATE outbound_campaigns
  SET 
    total_calls = total_calls + 1,
    successful_calls = CASE WHEN p_call_outcome IN ('interested', 'appointment_scheduled') THEN successful_calls + 1 ELSE successful_calls END,
    total_minutes = total_minutes + (live_call_record.duration_seconds / 60),
    last_call_at = NOW()
  WHERE id = live_call_record.campaign_id;
  
  -- Remove from live_calls
  DELETE FROM live_calls WHERE id = p_live_call_id;
  
  RETURN call_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update live call status
CREATE OR REPLACE FUNCTION update_live_call(
  p_live_call_id UUID,
  p_status TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT NULL,
  p_transcript JSONB DEFAULT NULL,
  p_current_speaker TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE live_calls
  SET 
    status = COALESCE(p_status, status),
    duration_seconds = COALESCE(p_duration, duration_seconds),
    live_transcript = COALESCE(p_transcript, live_transcript),
    current_speaker = COALESCE(p_current_speaker, current_speaker),
    conversation_turns = CASE WHEN p_transcript IS NOT NULL THEN jsonb_array_length(p_transcript) ELSE conversation_turns END,
    updated_at = NOW()
  WHERE id = p_live_call_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================

-- Enable RLS on call_logs
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on live_calls
ALTER TABLE live_calls ENABLE ROW LEVEL SECURITY;

-- Enable RLS on call_recordings
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES FOR NEW TABLES
-- =====================================================

-- CALL_LOGS POLICIES (already created above, but ensuring they exist)
DROP POLICY IF EXISTS "Users can view own call logs" ON call_logs;
CREATE POLICY "Users can view own call logs" ON call_logs
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can create call logs" ON call_logs;
CREATE POLICY "Users can create call logs" ON call_logs
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all call logs" ON call_logs;
CREATE POLICY "Admins can view all call logs" ON call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- LIVE_CALLS POLICIES
CREATE POLICY "Users can view own live calls" ON live_calls
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can create live calls" ON live_calls
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own live calls" ON live_calls
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own live calls" ON live_calls
  FOR DELETE USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all live calls" ON live_calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CALL_RECORDINGS POLICIES
CREATE POLICY "Users can view own call recordings" ON call_recordings
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can create call recordings" ON call_recordings
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can view all call recordings" ON call_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- GRANT PERMISSIONS FOR NEW TABLES
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON live_calls TO authenticated;
GRANT SELECT, INSERT ON call_recordings TO authenticated;

-- =====================================================
-- CREATE VIEWS FOR DASHBOARD
-- =====================================================

-- View for call analytics
CREATE OR REPLACE VIEW call_analytics AS
SELECT 
  profile_id,
  DATE(call_started_at) as call_date,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN call_outcome IN ('interested', 'appointment_scheduled') THEN 1 END) as successful_calls,
  AVG(call_duration_seconds) as avg_duration,
  SUM(call_duration_seconds) as total_duration,
  AVG(confidence_score) as avg_confidence,
  COUNT(CASE WHEN call_outcome = 'appointment_scheduled' THEN 1 END) as appointments_scheduled
FROM call_logs
WHERE call_started_at IS NOT NULL
GROUP BY profile_id, DATE(call_started_at);

-- View for agent performance
CREATE OR REPLACE VIEW agent_performance_view AS
SELECT 
  a.id as agent_id,
  a.name as agent_name,
  a.profile_id,
  COUNT(cl.id) as total_calls,
  COUNT(CASE WHEN cl.call_outcome IN ('interested', 'appointment_scheduled') THEN 1 END) as successful_calls,
  ROUND(
    COUNT(CASE WHEN cl.call_outcome IN ('interested', 'appointment_scheduled') THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(cl.id), 0) * 100, 2
  ) as success_rate,
  AVG(cl.call_duration_seconds) as avg_call_duration,
  AVG(cl.response_time_ms) as avg_response_time,
  SUM(cl.call_duration_seconds) / 60 as total_minutes
FROM ai_agents a
LEFT JOIN call_logs cl ON a.id = cl.agent_id
GROUP BY a.id, a.name, a.profile_id;

-- Grant permissions on views
GRANT SELECT ON call_analytics TO authenticated;
GRANT SELECT ON agent_performance_view TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE call_logs IS 'Complete call logs with Gemini Live API integration';
COMMENT ON TABLE live_calls IS 'Real-time call monitoring and status tracking';
COMMENT ON TABLE call_recordings IS 'Call recording storage and transcription management';

COMMENT ON COLUMN call_logs.session_id IS 'Gemini Live API session identifier';
COMMENT ON COLUMN call_logs.conversation_id IS 'Conversation tracking for multi-turn calls';
COMMENT ON COLUMN call_logs.call_transcript IS 'Full conversation transcript in JSON format';
COMMENT ON COLUMN call_logs.tokens_used IS 'AI tokens consumed during the call';

-- =====================================================
-- COMPLETED: CALL LOGS SCHEMA FOR GEMINI LIVE API
-- =====================================================