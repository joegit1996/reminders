-- Migration script to add completion_message and completion_webhook columns
-- Run this SQL in your Supabase SQL Editor if you already have the reminders table
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Add completion_message column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'completion_message'
  ) THEN
    ALTER TABLE reminders ADD COLUMN completion_message JSONB;
  END IF;
END $$;

-- Add completion_webhook column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'completion_webhook'
  ) THEN
    ALTER TABLE reminders ADD COLUMN completion_webhook TEXT;
  END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reminders' 
  AND column_name IN ('completion_message', 'completion_webhook');
