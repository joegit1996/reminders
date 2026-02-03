-- Migration: Add per-message Slack channel support
-- This allows different channels for different message types within a reminder

-- Add delay message channel
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS delay_slack_channel_id TEXT,
ADD COLUMN IF NOT EXISTS delay_slack_channel_name TEXT;

-- Add completion message channel
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS completion_slack_channel_id TEXT,
ADD COLUMN IF NOT EXISTS completion_slack_channel_name TEXT;

-- Note: automated_messages is a JSONB array
-- Each automated message object can now include:
-- { id, days_before, title, description, webhook_url, slack_channel_id, slack_channel_name, sent, sent_at }
-- No schema change needed for JSONB - we just start storing the new fields

COMMENT ON COLUMN reminders.delay_slack_channel_id IS 'Slack channel ID for delay notification messages';
COMMENT ON COLUMN reminders.delay_slack_channel_name IS 'Slack channel name for delay notification messages';
COMMENT ON COLUMN reminders.completion_slack_channel_id IS 'Slack channel ID for completion messages';
COMMENT ON COLUMN reminders.completion_slack_channel_name IS 'Slack channel name for completion messages';
