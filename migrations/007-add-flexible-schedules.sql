-- Add flexible schedule types to reminders
-- schedule_type: 'period_days' (default), 'days_of_week', 'days_of_month'
-- schedule_config: JSONB with type-specific config

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'period_days';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS schedule_config JSONB NOT NULL DEFAULT '{}';

-- Backfill existing rows with their period_days value
UPDATE reminders
SET schedule_type = 'period_days',
    schedule_config = jsonb_build_object('period_days', period_days)
WHERE schedule_config = '{}';
