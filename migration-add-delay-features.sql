-- Migration: Add delay message and saved webhooks features
-- Run this SQL in your Supabase SQL Editor to update existing database

-- Add delay_message and delay_webhooks columns to reminders table
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS delay_message TEXT,
ADD COLUMN IF NOT EXISTS delay_webhooks JSONB DEFAULT '[]'::jsonb;

-- Create saved_webhooks table (for reusable webhook storage)
CREATE TABLE IF NOT EXISTS saved_webhooks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security on saved_webhooks
ALTER TABLE saved_webhooks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations on saved_webhooks
CREATE POLICY IF NOT EXISTS "Allow all operations on saved_webhooks" ON saved_webhooks
  FOR ALL USING (true) WITH CHECK (true);
