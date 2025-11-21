-- Recipe App Database Schema
-- Run this after starting the Docker PostgreSQL container

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  cuisine VARCHAR(100),
  cooking_time INTEGER,
  prep_time INTEGER,
  difficulty VARCHAR(20),
  servings INTEGER DEFAULT 1,
  ingredients JSONB,
  instructions JSONB,
  image_url TEXT,
  video_url TEXT,
  nutrition JSONB,
  allergens TEXT[],
  tags TEXT[],
  estimated_cost DECIMAL(10,2),
  average_rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  creator_type VARCHAR(50),
  creator_user_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auth users (if not already created by auth system)
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  "emailVerified" TIMESTAMP,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auth sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
  id SERIAL PRIMARY KEY,
  "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
  "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auth accounts (for credentials)
CREATE TABLE IF NOT EXISTS auth_accounts (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  access_token TEXT,
  expires_at BIGINT,
  refresh_token TEXT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type VARCHAR(50),
  password TEXT, -- For credentials provider (hashed)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auth verification tokens
CREATE TABLE IF NOT EXISTS auth_verification_token (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Users profile (extends auth_users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  diet_type TEXT[],
  allergies TEXT[],
  dislikes TEXT[],
  preferred_cuisines TEXT[],
  calorie_goal INTEGER,
  experience_level VARCHAR(50),
  cooking_schedule TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Saved recipes
CREATE TABLE IF NOT EXISTS saved_recipes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- Meal plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date, meal_type)
);

-- Grocery lists
CREATE TABLE IF NOT EXISTS grocery_lists (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  items JSONB NOT NULL,
  created_from_meal_plan BOOLEAN DEFAULT false,
  meal_plan_week DATE,
  estimated_cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Daily recommendations
CREATE TABLE IF NOT EXISTS daily_recommendations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  recommended_recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  alternative_recipe_ids INTEGER[],
  reason TEXT,
  presented BOOLEAN DEFAULT false,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Food recognition results
CREATE TABLE IF NOT EXISTS food_recognition_results (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  detected_dish_name VARCHAR(255),
  detected_ingredients TEXT[],
  confidence_score DECIMAL(3,2),
  generated_recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Meal tracking (for recommendations)
CREATE TABLE IF NOT EXISTS meal_tracking (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  cooked_date DATE NOT NULL,
  liked BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_featured ON recipes(is_featured);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user ON grocery_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_recommendations_user_date ON daily_recommendations(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_tracking_user_date ON meal_tracking(user_id, cooked_date);

