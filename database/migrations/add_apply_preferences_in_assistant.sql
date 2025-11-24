-- Migration: Add apply_preferences_in_assistant column to users table
-- This column controls whether user preferences are applied when generating recipes via Recipe Assistant

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS apply_preferences_in_assistant BOOLEAN DEFAULT true;

-- Update existing users to have this enabled by default (if any exist)
UPDATE users 
SET apply_preferences_in_assistant = true 
WHERE apply_preferences_in_assistant IS NULL;

