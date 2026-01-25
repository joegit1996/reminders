-- Migration: Add automated_messages column to reminders table
-- Run this SQL in your Supabase SQL Editor

-- Add automated_messages column to reminders table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reminders' AND column_name='automated_messages') THEN
    ALTER TABLE reminders ADD COLUMN automated_messages JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added automated_messages column';
  ELSE
    RAISE NOTICE 'automated_messages column already exists';
  END IF;
END $$;
