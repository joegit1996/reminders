-- Add columns for due date nudge feature and message tracking
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS last_sent_message_ts TEXT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS nudge_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS nudge_sent_at TIMESTAMP;
