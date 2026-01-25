-- Run this SQL in your Supabase SQL Editor to create the tables
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Create saved_webhooks table (for reusable webhook storage)
CREATE TABLE IF NOT EXISTS saved_webhooks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  due_date DATE NOT NULL,
  period_days INTEGER NOT NULL,
  slack_webhook TEXT NOT NULL,
  delay_message TEXT,
  delay_webhooks JSONB DEFAULT '[]'::jsonb,
  is_complete BOOLEAN DEFAULT FALSE,
  last_sent TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create due_date_update_logs table
CREATE TABLE IF NOT EXISTS due_date_update_logs (
  id SERIAL PRIMARY KEY,
  reminder_id INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  old_due_date DATE NOT NULL,
  new_due_date DATE NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_date_update_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_webhooks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on reminders" ON reminders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on logs" ON due_date_update_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on saved_webhooks" ON saved_webhooks
  FOR ALL USING (true) WITH CHECK (true);
