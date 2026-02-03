-- Migration: Multi-User Authentication
-- Run this SQL in your Supabase SQL Editor
-- This adds user_id columns and Row Level Security policies

-- =====================================================
-- STEP 1: Add user_id columns to existing tables
-- =====================================================

-- Add user_id to reminders table
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to saved_webhooks table  
ALTER TABLE saved_webhooks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- =====================================================
-- STEP 2: Drop existing policies (if any) to recreate
-- =====================================================

DROP POLICY IF EXISTS "Allow all operations on reminders" ON reminders;
DROP POLICY IF EXISTS "Allow all operations on logs" ON due_date_update_logs;
DROP POLICY IF EXISTS "Allow all operations on saved_webhooks" ON saved_webhooks;

-- =====================================================
-- STEP 3: Enable Row Level Security
-- =====================================================

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_date_update_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create RLS Policies for reminders
-- =====================================================

-- Users can only view their own reminders
CREATE POLICY "Users can view own reminders"
ON reminders FOR SELECT
USING (auth.uid() = user_id);

-- Users can only create reminders for themselves
CREATE POLICY "Users can create own reminders"
ON reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own reminders
CREATE POLICY "Users can update own reminders"
ON reminders FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own reminders
CREATE POLICY "Users can delete own reminders"
ON reminders FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- STEP 5: Create RLS Policies for saved_webhooks
-- =====================================================

CREATE POLICY "Users can view own webhooks"
ON saved_webhooks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks"
ON saved_webhooks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
ON saved_webhooks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
ON saved_webhooks FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: Create RLS Policies for due_date_update_logs
-- =====================================================

-- Users can view logs for their own reminders
CREATE POLICY "Users can view logs for own reminders"
ON due_date_update_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reminders 
    WHERE reminders.id = due_date_update_logs.reminder_id 
    AND reminders.user_id = auth.uid()
  )
);

-- Users can create logs for their own reminders
CREATE POLICY "Users can create logs for own reminders"
ON due_date_update_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reminders 
    WHERE reminders.id = due_date_update_logs.reminder_id 
    AND reminders.user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 7: Service role bypass for cron jobs
-- Note: The service role key bypasses RLS automatically
-- =====================================================

-- Create index for faster user_id lookups
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_webhooks_user_id ON saved_webhooks(user_id);
