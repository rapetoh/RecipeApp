-- Migration: Add budget fields to users table
-- This migration adds budget_amount and budget_period columns to support food budget tracking

-- Add budget_amount column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(10,2);

-- Add budget_period column with check constraint
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS budget_period VARCHAR(20) CHECK (budget_period IN ('weekly', 'biweekly', 'monthly'));

-- Note: If the CHECK constraint fails because existing data violates it, you may need to:
-- 1. First update any invalid data
-- 2. Then add the constraint

