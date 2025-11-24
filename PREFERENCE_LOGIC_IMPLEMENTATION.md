# Preference Logic Implementation

## Overview
This document describes the implementation of preference-based recipe generation logic for the Recipe Assistant feature.

## Changes Made

### 1. Database Schema
- **File**: `database/migrations/add_apply_preferences_in_assistant.sql`
- **Change**: Added `apply_preferences_in_assistant` BOOLEAN column to `users` table
- **Default**: `true` (preferences are applied by default)

### 2. Preferences API
- **File**: `apps/web/src/app/api/preferences/route.js`
- **Changes**:
  - GET endpoint now returns `applyPreferencesInAssistant` field
  - POST endpoint now accepts and saves `applyPreferencesInAssistant` field
  - Default value is `true` if not provided

### 3. Recipe Generation Logic
- **File**: `apps/web/src/app/api/utils/openai.js`
- **Function**: `generateRecipeWithGPT()`
- **Changes**:
  - Added `preferences` parameter (optional)
  - Added `applyPreferences` parameter (default: true)
  - Implements hard constraints (always enforced):
    - Allergies/Intolerances
    - Strict diet types (vegan, vegetarian, halal, kosher)
    - Disliked ingredients
  - Implements soft preferences (only when `applyPreferences=true`):
    - Favorite cuisines
    - Goals
    - Preferred cooking time
    - Cooking skill level
    - People count
  - Soft preferences are only applied when relevant (e.g., won't force "African food" preference on "chocolate cake")

### 4. Food Recognition API
- **File**: `apps/web/src/app/api/food-recognition/route.js`
- **Changes**:
  - Fetches user preferences when `userId` is provided
  - Passes preferences to `generateRecipeWithGPT()`
  - Respects `applyPreferencesInAssistant` setting

### 5. Generate Recipe from Name API
- **File**: `apps/web/src/app/api/generate-recipe-from-name/route.js`
- **Changes**:
  - Fetches user preferences when `userId` is provided
  - Passes preferences to `generateRecipeWithGPT()`
  - Respects `applyPreferencesInAssistant` setting

### 6. Preferences UI
- **File**: `apps/mobile/src/app/preferences.jsx`
- **Changes**:
  - Added `applyPreferencesInAssistant` state variable
  - Added new "Recipe Assistant" section with toggle switch
  - Toggle allows users to enable/disable preference application
  - Includes helpful description explaining that allergies are always enforced

## How It Works

### Hard Constraints (Always Enforced)
These are **always** enforced for safety, regardless of the `applyPreferencesInAssistant` setting:
- **Allergies/Intolerances**: Never included in recipes
- **Strict Diet Types**: Vegan, Vegetarian, Halal, Kosher - always respected
- **Disliked Ingredients**: Never included in recipes

### Soft Preferences (Conditional)
These are only applied when:
1. `applyPreferencesInAssistant` is `true` (default)
2. The preference is relevant to the requested dish

**Example**: If a user asks for "chocolate cake" but has "African food" as a favorite cuisine, the cuisine preference is ignored because it's not relevant to chocolate cake.

**Soft Preferences Include**:
- Favorite cuisines
- Goals (eat healthier, save time, etc.)
- Preferred cooking time
- Cooking skill level
- People count

## Migration Instructions

To apply the database changes:

1. **If using PostgreSQL directly**:
   ```sql
   ALTER TABLE users 
   ADD COLUMN IF NOT EXISTS apply_preferences_in_assistant BOOLEAN DEFAULT true;
   
   UPDATE users 
   SET apply_preferences_in_assistant = true 
   WHERE apply_preferences_in_assistant IS NULL;
   ```

2. **Or run the migration file**:
   ```bash
   psql -U your_user -d your_database -f database/migrations/add_apply_preferences_in_assistant.sql
   ```

## Testing

### Test Cases

1. **Hard Constraints Always Enforced**:
   - User with "Gluten" allergy asks for "pasta"
   - Result: Recipe should be gluten-free, even if `applyPreferencesInAssistant` is `false`

2. **Soft Preferences Applied**:
   - User with "Italian" favorite cuisine and `applyPreferencesInAssistant=true` asks for "pasta"
   - Result: Recipe should favor Italian style

3. **Soft Preferences Ignored When Irrelevant**:
   - User with "African" favorite cuisine asks for "chocolate cake"
   - Result: Recipe should be standard chocolate cake, not African-style

4. **Preferences Disabled**:
   - User with `applyPreferencesInAssistant=false` asks for "pasta"
   - Result: Standard pasta recipe, but still respects allergies/diet

## Backward Compatibility

- All changes are backward compatible
- Default value is `true`, so existing behavior is preserved
- If `userId` is not provided, preferences are not applied (existing behavior)
- If preferences don't exist, recipe generation works as before

## API Usage

### Example: Generate Recipe with Preferences

```javascript
// User preferences are automatically fetched if userId is provided
const response = await fetch('/api/generate-recipe-from-name', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dishName: 'Pasta Carbonara',
    userId: 'user-uuid-here'
  })
});
```

The API will:
1. Fetch user preferences
2. Check `applyPreferencesInAssistant` setting
3. Apply hard constraints (always)
4. Apply soft preferences (if enabled and relevant)
5. Generate recipe accordingly

