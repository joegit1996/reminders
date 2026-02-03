-- Complete migration script for completion message feature
-- Run this SQL in your Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Step 1: Add completion_webhook column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'completion_webhook'
  ) THEN
    ALTER TABLE reminders ADD COLUMN completion_webhook TEXT;
    RAISE NOTICE 'Added completion_webhook column';
  ELSE
    RAISE NOTICE 'completion_webhook column already exists';
  END IF;
END $$;

-- Step 2: Handle completion_message column
DO $$ 
DECLARE
  rec RECORD;
  col_exists BOOLEAN;
  col_type TEXT;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'completion_message'
  ) INTO col_exists;
  
  IF col_exists THEN
    -- Get column data type
    SELECT data_type INTO col_type
    FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'completion_message';
    
    IF col_type = 'text' THEN
      -- Convert existing TEXT to JSONB
      RAISE NOTICE 'Converting completion_message from TEXT to JSONB...';
      
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
    ELSIF col_type = 'jsonb' THEN
      RAISE NOTICE 'completion_message column already exists as JSONB';
    ELSE
      RAISE NOTICE 'completion_message column exists but has unexpected type: %', col_type;
    END IF;
  ELSE
    -- Add column as JSONB
    ALTER TABLE reminders ADD COLUMN completion_message JSONB;
    RAISE NOTICE 'Added completion_message column as JSONB';
  END IF;
END $$;

-- Step 3: Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reminders' 
  AND column_name IN ('completion_message', 'completion_webhook')
ORDER BY column_name;
