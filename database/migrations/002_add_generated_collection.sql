-- Migration: Add "Generated" system collection
-- This collection automatically contains all recipes from saved_recipes (AI-generated kept recipes)

BEGIN;

-- ============================================
-- STEP 1: Update system_type CHECK constraint to include 'generated'
-- ============================================

-- Drop the existing check constraint
ALTER TABLE recipe_collections 
DROP CONSTRAINT IF EXISTS recipe_collections_system_type_check;

-- Add new check constraint with 'generated' included
ALTER TABLE recipe_collections 
ADD CONSTRAINT recipe_collections_system_type_check 
CHECK (system_type IN ('favorites', 'my_creations', 'generated'));

-- ============================================
-- STEP 2: Create "Generated" system collection for all users
-- ============================================

INSERT INTO recipe_collections (user_id, name, collection_type, system_type, created_at)
SELECT DISTINCT au.id, 'Generated', 'system', 'generated', NOW()
FROM auth_users au
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_collections rc 
  WHERE rc.user_id = au.id AND rc.system_type = 'generated'
)
ON CONFLICT (user_id, system_type) DO NOTHING;

-- ============================================
-- STEP 3: Populate "Generated" collection from saved_recipes
-- ============================================

INSERT INTO collection_recipes (collection_id, recipe_id, added_at)
SELECT rc.id, sr.recipe_id, sr.created_at
FROM saved_recipes sr
JOIN recipe_collections rc ON rc.user_id = sr.user_id AND rc.system_type = 'generated'
ON CONFLICT (collection_id, recipe_id) DO NOTHING;

-- ============================================
-- STEP 4: Update recipe_count for "Generated" collections
-- ============================================

UPDATE recipe_collections
SET recipe_count = (
  SELECT COUNT(*) 
  FROM collection_recipes cr 
  WHERE cr.collection_id = recipe_collections.id
)
WHERE system_type = 'generated';

COMMIT;



