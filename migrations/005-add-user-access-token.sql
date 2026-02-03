-- Migration: Add user_access_token column to slack_connections
-- This allows storing the user token separately from the bot token
-- User tokens can see all conversations the user is part of (DMs, MPIMs, private channels)

ALTER TABLE slack_connections 
ADD COLUMN IF NOT EXISTS user_access_token TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN slack_connections.user_access_token IS 'User OAuth token for reading user conversations (DMs, MPIMs, private channels)';
