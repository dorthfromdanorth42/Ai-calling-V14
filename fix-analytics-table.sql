-- Create missing analytics_data table
CREATE TABLE IF NOT EXISTS analytics_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(10,2),
    metric_type VARCHAR(50) DEFAULT 'counter',
    dimensions JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_data_profile_id ON analytics_data(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_data_metric_name ON analytics_data(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_data_timestamp ON analytics_data(timestamp);