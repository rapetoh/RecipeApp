-- Migration: Fix "Generated" collection to only contain AI-generated recipes
-- This removes manually created recipes (creator_type != 'ai') from the Generated collection

BEGIN;

-- Remove recipes from "Generated" collection where creator_type is NOT 'ai'
DELETE FROM collection_recipes
WHERE collection_id IN (
  SELECT id FROM recipe_collections WHERE system_type = 'generated'
)
AND recipe_id IN (
  SELECT id FROM recipes WHERE creator_type IS NULL OR creator_type != 'ai'
);

-- Update recipe_count for all "Generated" collections
UPDATE recipe_collections
SET recipe_count = (
  SELECT COUNT(*) 
  FROM collection_recipes cr 
  WHERE cr.collection_id = recipe_collections.id
)
WHERE system_type = 'generated';

COMMIT;





