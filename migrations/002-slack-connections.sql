-- Migration: Slack Connections for OAuth-based Slack Integration
-- Run this SQL in your Supabase SQL Editor

-- =====================================================
-- STEP 1: Create slack_connections table
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    team_id VARCHAR(50) NOT NULL,
    team_name VARCHAR(255),
    access_token TEXT NOT NULL,
    bot_user_id VARCHAR(50),
    default_channel_id VARCHAR(50),
    default_channel_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Add slack_channel_id to reminders table
-- =====================================================

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS slack_channel_id VARCHAR(50);

-- =====================================================
-- STEP 3: Enable Row Level Security
-- =====================================================

ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create RLS Policies for slack_connections
-- =====================================================

-- Users can only view their own Slack connections
CREATE POLICY "Users can view own Slack connections"
ON slack_connections FOR SELECT
USING (auth.uid() = user_id);

-- Users can only create Slack connections for themselves
CREATE POLICY "Users can create own Slack connections"
ON slack_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own Slack connections
CREATE POLICY "Users can update own Slack connections"
ON slack_connections FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own Slack connections
CREATE POLICY "Users can delete own Slack connections"
ON slack_connections FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- STEP 5: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_slack_connections_user_id ON slack_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_connections_team_id ON slack_connections(team_id);

-- =====================================================
-- STEP 6: Service role access policy
-- The service role key bypasses RLS automatically,
-- which is needed for cron jobs to access all connections
-- =====================================================

-- No additional policy needed - service role bypasses RLS
