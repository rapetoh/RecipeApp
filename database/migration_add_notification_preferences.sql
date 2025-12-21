-- Migration: Add notification_preferences column to users table
-- Run this after the main schema.sql

-- Add notification_preferences column as JSONB
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.notification_preferences IS 'User notification preferences stored as JSON';

