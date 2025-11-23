-- Migration: Add missing preference columns to users table
-- Run this migration to add all the preference fields needed for the preferences system

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS goals TEXT[],
ADD COLUMN IF NOT EXISTS cooking_skill VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_cooking_time VARCHAR(50),
ADD COLUMN IF NOT EXISTS people_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS daily_suggestion_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_suggestion_time VARCHAR(10) DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS weekly_plan_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_plan_days TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri'],
ADD COLUMN IF NOT EXISTS measurement_system VARCHAR(20) DEFAULT 'metric',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN users.goals IS 'Array of user goals (save_time, eat_healthier, etc.)';
COMMENT ON COLUMN users.cooking_skill IS 'User cooking skill level (beginner, intermediate, advanced)';
COMMENT ON COLUMN users.preferred_cooking_time IS 'Preferred cooking time range (under_15, 15_30, 30_45, no_limit)';
COMMENT ON COLUMN users.people_count IS 'Number of people usually cooked for';
COMMENT ON COLUMN users.daily_suggestion_enabled IS 'Whether daily meal suggestions are enabled';
COMMENT ON COLUMN users.daily_suggestion_time IS 'Preferred time for daily suggestions (HH:MM format)';
COMMENT ON COLUMN users.weekly_plan_enabled IS 'Whether weekly meal planning is enabled';
COMMENT ON COLUMN users.weekly_plan_days IS 'Days of week for meal planning (mon, tue, wed, etc.)';
COMMENT ON COLUMN users.measurement_system IS 'Preferred measurement system (metric or imperial)';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed the onboarding flow';

