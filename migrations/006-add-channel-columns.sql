-- Migration: Add granular Slack channel columns to reminders table
-- This allows each reminder to have its own channel for the main reminder,
-- delay message, and completion message (separate from webhooks)

ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,
ADD COLUMN IF NOT EXISTS slack_channel_name TEXT,
ADD COLUMN IF NOT EXISTS delay_slack_channel_id TEXT,
ADD COLUMN IF NOT EXISTS delay_slack_channel_name TEXT,
ADD COLUMN IF NOT EXISTS completion_slack_channel_id TEXT,
ADD COLUMN IF NOT EXISTS completion_slack_channel_name TEXT;

-- Add comments
COMMENT ON COLUMN reminders.slack_channel_id IS 'Slack channel/DM ID for the main reminder';
COMMENT ON COLUMN reminders.slack_channel_name IS 'Display name of the Slack channel/DM for the main reminder';
COMMENT ON COLUMN reminders.delay_slack_channel_id IS 'Slack channel/DM ID for delay messages';
COMMENT ON COLUMN reminders.delay_slack_channel_name IS 'Display name of the Slack channel/DM for delay messages';
COMMENT ON COLUMN reminders.completion_slack_channel_id IS 'Slack channel/DM ID for completion messages';
COMMENT ON COLUMN reminders.completion_slack_channel_name IS 'Display name of the Slack channel/DM for completion messages';
