-- Migration: Move all existing reminders to a specific user
-- Target user: 13a21c2e-1fd8-4a5d-8bab-481be98a2271
-- This allows the user to then edit the channel for each reminder

-- First, ensure the user exists (they should have been created via Supabase Auth)
-- Check what reminders exist without this user_id

-- Update all reminders that don't have this user_id to belong to this user
UPDATE reminders 
SET user_id = '13a21c2e-1fd8-4a5d-8bab-481be98a2271'
WHERE user_id IS NULL OR user_id != '13a21c2e-1fd8-4a5d-8bab-481be98a2271';

-- Update all saved_webhooks to belong to this user
UPDATE saved_webhooks 
SET user_id = '13a21c2e-1fd8-4a5d-8bab-481be98a2271'
WHERE user_id IS NULL OR user_id != '13a21c2e-1fd8-4a5d-8bab-481be98a2271';

-- Update all due_date_update_logs - these reference reminder_id which now belongs to this user
-- No direct user_id field needed as they're linked via reminder_id

-- Verify the migration
SELECT 
  'reminders' as table_name, 
  COUNT(*) as total,
  COUNT(CASE WHEN user_id = '13a21c2e-1fd8-4a5d-8bab-481be98a2271' THEN 1 END) as migrated
FROM reminders
UNION ALL
SELECT 
  'saved_webhooks' as table_name, 
  COUNT(*) as total,
  COUNT(CASE WHEN user_id = '13a21c2e-1fd8-4a5d-8bab-481be98a2271' THEN 1 END) as migrated
FROM saved_webhooks;
