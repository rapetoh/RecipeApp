-- Meal plan suggestions table (stores metadata for 3 suggestions per meal)
-- This table stores recipe metadata without full instructions for faster generation
-- Full recipes are generated on-demand when user clicks on a suggestion

CREATE TABLE IF NOT EXISTS meal_plan_suggestions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  suggestion_order INTEGER NOT NULL CHECK (suggestion_order IN (1, 2, 3)),
  
  -- Metadata (generated in Phase 1 - no instructions)
  recipe_name VARCHAR(255) NOT NULL,
  recipe_description TEXT,
  ingredients JSONB,
  nutrition JSONB,
  cooking_time INTEGER,
  prep_time INTEGER,
  cuisine VARCHAR(100),
  category VARCHAR(50),
  difficulty VARCHAR(20),
  servings INTEGER DEFAULT 4,
  estimated_cost DECIMAL(10,2),
  
  -- Status
  is_full_recipe_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, date, meal_type, suggestion_order)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_suggestions_user_date 
  ON meal_plan_suggestions(user_id, date);

CREATE INDEX IF NOT EXISTS idx_meal_plan_suggestions_recipe 
  ON meal_plan_suggestions(recipe_id) WHERE recipe_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plan_suggestions_user_date_meal 
  ON meal_plan_suggestions(user_id, date, meal_type);





