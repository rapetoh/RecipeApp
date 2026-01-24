-- Migration: Add subscription system tables
-- Run this migration to add subscription and usage tracking tables
-- This supports RevenueCat integration for premium features

BEGIN;

-- ============================================
-- STEP 1: Add subscription_status column to users table
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'trial', 'expired')),
ADD COLUMN IF NOT EXISTS revenuecat_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN users.subscription_status IS 'User subscription status: free, premium, trial, expired';
COMMENT ON COLUMN users.revenuecat_customer_id IS 'RevenueCat customer ID for this user';
COMMENT ON COLUMN users.subscription_expires_at IS 'When the subscription expires (NULL for free users)';

-- ============================================
-- STEP 2: Create subscriptions table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  revenuecat_customer_id VARCHAR(255) NOT NULL,
  revenuecat_subscription_id VARCHAR(255),
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, revenuecat_subscription_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_customer_id ON subscriptions(revenuecat_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Add comments
COMMENT ON TABLE subscriptions IS 'Stores user subscription information from RevenueCat';
COMMENT ON COLUMN subscriptions.revenuecat_customer_id IS 'RevenueCat customer ID';
COMMENT ON COLUMN subscriptions.revenuecat_subscription_id IS 'RevenueCat subscription ID';
COMMENT ON COLUMN subscriptions.plan IS 'Subscription plan: monthly or yearly';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, canceled, expired, trial';
COMMENT ON COLUMN subscriptions.platform IS 'Platform where subscription was purchased: ios, android, web';

-- ============================================
-- STEP 3: Create subscription_usage table
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL CHECK (feature IN ('voice_suggestions', 'food_recognition', 'ingredients_to_recipes', 'recipe_generation', 'today_suggestions', 'meal_plan_ai')),
  usage_count INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, feature, period_start)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_feature ON subscription_usage(feature);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON subscription_usage(period_start, period_end);

-- Add comments
COMMENT ON TABLE subscription_usage IS 'Tracks feature usage for free tier limits';
COMMENT ON COLUMN subscription_usage.feature IS 'Feature name: voice_suggestions, food_recognition, etc.';
COMMENT ON COLUMN subscription_usage.usage_count IS 'Number of times feature was used in this period';
COMMENT ON COLUMN subscription_usage.period_start IS 'Start of the usage period (monthly reset)';
COMMENT ON COLUMN subscription_usage.period_end IS 'End of the usage period';

-- ============================================
-- STEP 4: Create subscription_history table (optional, for audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('purchased', 'renewed', 'canceled', 'expired', 'reactivated', 'trial_started', 'trial_ended')),
  plan VARCHAR(50),
  revenuecat_subscription_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);

-- Add comments
COMMENT ON TABLE subscription_history IS 'Audit trail of subscription events';
COMMENT ON COLUMN subscription_history.event_type IS 'Type of subscription event';
COMMENT ON COLUMN subscription_history.metadata IS 'Additional event data (JSON)';

COMMIT;

