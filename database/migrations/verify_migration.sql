-- Verification queries to run after migration

-- Check new tables exist
SELECT 'recipe_ownership' as table_name, COUNT(*) as count FROM recipe_ownership
UNION ALL
SELECT 'recipe_favorites', COUNT(*) FROM recipe_favorites
UNION ALL
SELECT 'recipe_collections', COUNT(*) FROM recipe_collections
UNION ALL
SELECT 'collection_recipes', COUNT(*) FROM collection_recipes;

-- Check data was migrated
SELECT 
  'Favorites migrated' as check_name,
  (SELECT COUNT(*) FROM saved_recipes) as saved_recipes_count,
  (SELECT COUNT(*) FROM recipe_favorites) as favorites_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM saved_recipes) = (SELECT COUNT(*) FROM recipe_favorites) 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END as status;

-- Check collections created
SELECT 
  user_id,
  system_type,
  recipe_count
FROM recipe_collections
WHERE collection_type = 'system'
ORDER BY user_id;

-- Check ownership migrated
SELECT 
  ownership_type,
  COUNT(*) as count
FROM recipe_ownership
GROUP BY ownership_type;