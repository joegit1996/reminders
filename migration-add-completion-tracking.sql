-- Add completion tracking columns to reminders table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE reminders 
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS days_remaining_at_completion INTEGER;

-- Add a comment explaining the columns
COMMENT ON COLUMN reminders.completed_at IS 'Timestamp when the reminder was marked as complete';
COMMENT ON COLUMN reminders.days_remaining_at_completion IS 'Days remaining (or overdue as negative) at the time of completion';
