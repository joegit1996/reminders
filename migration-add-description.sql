-- Migration: Add description column to reminders table
-- Run this SQL in your Supabase SQL Editor

-- Add description column to reminders table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reminders' AND column_name='description') THEN
    ALTER TABLE reminders ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column';
  ELSE
    RAISE NOTICE 'description column already exists';
  END IF;
END $$;
