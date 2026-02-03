-- Migration script to convert completion_message from TEXT to JSONB
-- Run this SQL in your Supabase SQL Editor if you already have completion_message as TEXT
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Convert existing TEXT completion_message to JSONB format
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  -- Check if column exists and is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' 
      AND column_name = 'completion_message' 
      AND data_type = 'text'
  ) THEN
    -- Update existing records: convert string to JSONB object
    FOR rec IN SELECT id, completion_message FROM reminders WHERE completion_message IS NOT NULL AND completion_message::text != '' LOOP
      UPDATE reminders
      SET completion_message = jsonb_build_object(
        'title', 'Reminder Completed',
        'description', rec.completion_message
      )
      WHERE id = rec.id;
    END LOOP;
    
    -- Alter column type from TEXT to JSONB
    ALTER TABLE reminders ALTER COLUMN completion_message TYPE JSONB USING completion_message::jsonb;
    
    RAISE NOTICE 'Migration completed: completion_message converted from TEXT to JSONB';
  ELSE
    RAISE NOTICE 'Column completion_message does not exist or is already JSONB';
  END IF;
END $$;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reminders' 
  AND column_name = 'completion_message';
