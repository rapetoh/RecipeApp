-- Migration: Remove UNIQUE constraint to allow multiple recipes per meal type per date
-- This migration allows users to add multiple recipes for the same meal type on the same date
-- (e.g., multiple dishes for lunch: main course + salad + soup)

-- Drop the existing UNIQUE constraint if it exists
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_user_id_date_meal_type_key;

-- Note: The constraint name may vary depending on your PostgreSQL version
-- If the above doesn't work, you can find the constraint name with:
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'meal_plans' AND constraint_type = 'UNIQUE';

-- Alternative: If you know the exact constraint name, use:
-- ALTER TABLE meal_plans DROP CONSTRAINT <constraint_name>;

