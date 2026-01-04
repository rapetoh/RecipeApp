-- ============================================
-- MIGRATION: Restructure Schema (Safe Migration)
-- ============================================
-- This migration safely restructures the schema without losing data
-- It keeps old columns/tables for backward compatibility
-- Run this AFTER backing up your database

BEGIN;

-- ============================================
-- STEP 1: Add new columns to recipes table (backward compatible)
-- ============================================
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS import_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS import_url TEXT,
ADD COLUMN IF NOT EXISTS import_metadata JSONB;

-- Migrate existing data: creator_type/creator_user_id -> source_type/source_user_id
UPDATE recipes 
SET source_type = COALESCE(creator_type, 'user'),
    source_user_id = creator_user_id
WHERE source_type IS NULL AND (creator_type IS NOT NULL OR creator_user_id IS NOT NULL);

-- Set default for recipes without source info
UPDATE recipes 
SET source_type = 'user'
WHERE source_type IS NULL;

-- ============================================
-- STEP 2: Add missing column to users table
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS apply_preferences_in_assistant BOOLEAN DEFAULT true;

UPDATE users 
SET apply_preferences_in_assistant = true 
WHERE apply_preferences_in_assistant IS NULL;

-- ============================================
-- STEP 3: Create new tables
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_ownership (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  ownership_type VARCHAR(50) CHECK (ownership_type IN ('creator', 'kept', 'imported')) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

CREATE TABLE IF NOT EXISTS recipe_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS recipe_collections (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  collection_type VARCHAR(50) CHECK (collection_type IN ('system', 'custom')) NOT NULL DEFAULT 'custom',
  system_type VARCHAR(50) CHECK (system_type IN ('favorites', 'my_creations')),
  cover_image_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  recipe_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, system_type)
);

CREATE TABLE IF NOT EXISTS collection_recipes (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  UNIQUE(collection_id, recipe_id)
);

-- ============================================
-- STEP 4: Migrate existing data
-- ============================================

-- Migrate saved_recipes to recipe_favorites (favorites = heart button)
INSERT INTO recipe_favorites (user_id, recipe_id, created_at)
SELECT user_id, recipe_id, created_at
FROM saved_recipes
ON CONFLICT (user_id, recipe_id) DO NOTHING;

-- Migrate ownership data:
-- Recipes where creator_user_id is set AND creator_type = 'user' -> ownership_type = 'creator'
INSERT INTO recipe_ownership (recipe_id, user_id, ownership_type, created_at)
SELECT id, creator_user_id, 'creator', created_at
FROM recipes
WHERE creator_user_id IS NOT NULL 
  AND creator_type = 'user'
ON CONFLICT (recipe_id, user_id) DO NOTHING;

-- Recipes where creator_user_id is set AND creator_type = 'ai' -> ownership_type = 'kept'
INSERT INTO recipe_ownership (recipe_id, user_id, ownership_type, created_at)
SELECT id, creator_user_id, 'kept', created_at
FROM recipes
WHERE creator_user_id IS NOT NULL 
  AND (creator_type = 'ai' OR creator_type IS NULL)
ON CONFLICT (recipe_id, user_id) DO NOTHING;

-- ============================================
-- STEP 5: Create system collections for all existing users
-- ============================================

-- Create "Favorites" system collection for all users
INSERT INTO recipe_collections (user_id, name, collection_type, system_type, created_at)
SELECT DISTINCT au.id, 'Favorites', 'system', 'favorites', NOW()
FROM auth_users au
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_collections rc 
  WHERE rc.user_id = au.id AND rc.system_type = 'favorites'
)
ON CONFLICT (user_id, system_type) DO NOTHING;

-- Create "My Creations" system collection for all users
INSERT INTO recipe_collections (user_id, name, collection_type, system_type, created_at)
SELECT DISTINCT au.id, 'My Creations', 'system', 'my_creations', NOW()
FROM auth_users au
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_collections rc 
  WHERE rc.user_id = au.id AND rc.system_type = 'my_creations'
)
ON CONFLICT (user_id, system_type) DO NOTHING;

-- ============================================
-- STEP 6: Populate system collections
-- ============================================

-- Populate "Favorites" collection from recipe_favorites
INSERT INTO collection_recipes (collection_id, recipe_id, added_at)
SELECT rc.id, rf.recipe_id, rf.created_at
FROM recipe_favorites rf
JOIN recipe_collections rc ON rc.user_id = rf.user_id AND rc.system_type = 'favorites'
ON CONFLICT (collection_id, recipe_id) DO NOTHING;

-- Populate "My Creations" collection from recipe_ownership where ownership_type = 'creator'
INSERT INTO collection_recipes (collection_id, recipe_id, added_at)
SELECT rc.id, ro.recipe_id, NOW()
FROM recipe_ownership ro
JOIN recipe_collections rc ON rc.user_id = ro.user_id AND rc.system_type = 'my_creations'
WHERE ro.ownership_type = 'creator'
ON CONFLICT (collection_id, recipe_id) DO NOTHING;

-- Update recipe_count for system collections
UPDATE recipe_collections
SET recipe_count = (
  SELECT COUNT(*) 
  FROM collection_recipes cr 
  WHERE cr.collection_id = recipe_collections.id
);

-- ============================================
-- STEP 7: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_recipes_source_type ON recipes(source_type);
CREATE INDEX IF NOT EXISTS idx_recipes_source_user_id ON recipes(source_user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_import_source ON recipes(import_source);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_recipe_ownership_user ON recipe_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ownership_recipe ON recipe_ownership(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_favorites_user ON recipe_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_favorites_recipe ON recipe_favorites(recipe_id);
CREATE INDEX IF NOT EXISTS idx_collections_user ON recipe_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_type ON recipe_collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_collection ON collection_recipes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_recipe ON collection_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_order ON collection_recipes(collection_id, display_order);

COMMIT;

-- ============================================
-- NOTES:
-- ============================================
-- 1. Old columns (creator_type, creator_user_id) are KEPT for backward compatibility
-- 2. Old table (saved_recipes) is KEPT for backward compatibility
-- 3. Code will continue to work with old structure
-- 4. After updating all code to use new tables, run cleanup migration