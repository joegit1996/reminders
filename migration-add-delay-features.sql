-- Migration: Add delay message and saved webhooks features
-- Run this SQL in your Supabase SQL Editor to update existing database

-- Add delay_message and delay_webhooks columns to reminders table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reminders' AND column_name='delay_message') THEN
    ALTER TABLE reminders ADD COLUMN delay_message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reminders' AND column_name='delay_webhooks') THEN
    ALTER TABLE reminders ADD COLUMN delay_webhooks JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create saved_webhooks table (for reusable webhook storage)
CREATE TABLE IF NOT EXISTS saved_webhooks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security on saved_webhooks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'saved_webhooks') THEN
    ALTER TABLE saved_webhooks ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policy to allow all operations on saved_webhooks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'saved_webhooks' 
    AND policyname = 'Allow all operations on saved_webhooks'
  ) THEN
    CREATE POLICY "Allow all operations on saved_webhooks" ON saved_webhooks
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
