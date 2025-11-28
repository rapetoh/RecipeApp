import OpenAI from 'openai';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Call OpenAI GPT-4 Vision API for image analysis
 */
export async function analyzeImageWithVision(imageBase64, contentType = 'image/jpeg') {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this food image and identify the dish. Respond with ONLY a JSON object with these exact fields:
{
  "dish_name": "Name of the main dish",
  "detected_ingredients": ["ingredient1", "ingredient2", "ingredient3"],
  "confidence": 0.95,
  "cuisine": "Type of cuisine (e.g. Italian, American, Asian)",
  "difficulty": "easy",
  "estimated_time": 25,
  "category": "breakfast"
}

Rules:
- confidence should be between 0.3-1.0 for recognizable food (use 0.3+ for common foods like pizza)
- category should be one of: breakfast, lunch, dinner, dessert, snack
- difficulty should be one of: easy, medium, hard
- estimated_time should be cooking time in minutes (15-60)
- detected_ingredients should list 3-8 main ingredients you can see
- If this is clearly food, be confident (0.5+ confidence for clear dishes)
- Only respond with the JSON object, no other text`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : content;
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('OpenAI Vision API error:', error);
    throw error;
  }
}

/**
 * Generate recipe using OpenAI
 * @param {string} dishName - Name of the dish to generate recipe for
 * @param {object} analysis - Analysis object from image recognition (optional)
 * @param {object} preferences - User preferences object (optional)
 * @param {boolean} applyPreferences - Whether to apply soft preferences (default: true)
 */
export async function generateRecipeWithGPT(dishName, analysis = null, preferences = null, applyPreferences = true) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Build hard constraints (ALWAYS enforced for safety)
    const hardConstraints = [];
    if (preferences?.allergies && preferences.allergies.length > 0) {
      hardConstraints.push(`ALLERGIES/INTOLERANCES TO AVOID: ${preferences.allergies.join(', ')}`);
    }
    
    // Check for strict diet types (vegan, vegetarian, halal, kosher)
    const strictDiets = ['vegan', 'vegetarian', 'halal', 'kosher'];
    if (preferences?.dietType && strictDiets.includes(preferences.dietType.toLowerCase())) {
      hardConstraints.push(`STRICT DIET TYPE: ${preferences.dietType}`);
    }
    
    if (preferences?.dislikedIngredients && preferences.dislikedIngredients.length > 0) {
      hardConstraints.push(`NEVER USE THESE INGREDIENTS: ${preferences.dislikedIngredients.join(', ')}`);
    }

    // Build soft preferences (only when applyPreferences=true and relevant)
    const softPreferences = [];
    if (applyPreferences && preferences) {
      if (preferences.favoriteCuisines && preferences.favoriteCuisines.length > 0) {
        softPreferences.push(`Preferred cuisines: ${preferences.favoriteCuisines.join(', ')}`);
      }
      if (preferences.goals && preferences.goals.length > 0) {
        softPreferences.push(`Goals: ${preferences.goals.join(', ')}`);
      }
      if (preferences.preferredCookingTime) {
        softPreferences.push(`Preferred cooking time: ${preferences.preferredCookingTime}`);
      }
      if (preferences.cookingSkill) {
        softPreferences.push(`Cooking skill level: ${preferences.cookingSkill}`);
      }
      if (preferences.peopleCount) {
        softPreferences.push(`Serves: ${preferences.peopleCount} people`);
      }
    }

    // Build the prompt
    let prompt = `Create a detailed recipe for "${dishName}".`;
    
    if (hardConstraints.length > 0) {
      prompt += `\n\nCRITICAL REQUIREMENTS (MUST FOLLOW - These are safety and dietary restrictions):\n${hardConstraints.join('\n')}`;
    }
    
    if (softPreferences.length > 0) {
      prompt += `\n\nPREFERENCES (apply when relevant, but prioritize the dish "${dishName}" if they conflict):\n${softPreferences.join('\n')}`;
      prompt += `\n\nIMPORTANT: If these preferences don't make sense for "${dishName}" (e.g., asking for "chocolate cake" but preferring "African food"), ignore the irrelevant preferences and create an authentic version of the dish. Only apply preferences that enhance the dish without changing its core identity.`;
    }
    
    prompt += `\n\nRespond with ONLY a JSON object:

{
  "name": "Recipe Name",
  "description": "Appetizing 2-sentence description",
  "ingredients": [
    {"name": "ingredient name", "amount": "1", "unit": "cup"},
    {"name": "salt", "amount": "1", "unit": "tsp"}
  ],
  "instructions": [
    {"step": 1, "instruction": "Detailed first step"},
    {"step": 2, "instruction": "Detailed second step"}
  ],
  "nutrition": {
    "calories": 350,
    "protein": 20,
    "carbs": 25,
    "fat": 15,
    "fiber": 5
  },
  "prep_time": 15,
  "cooking_time": 25,
  "servings": 4
}

Make it realistic and delicious. Include 6-10 ingredients and 4-8 clear steps.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI GPT API error:', error);
    throw error;
  }
}

/**
 * Generate image using DALL-E
 */
export async function generateImageWithDALLE(dishName) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `A professional food photography image of ${dishName}, appetizing, well-lit, high quality, restaurant style, on a white plate, top-down view`,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    if (!response.data || !response.data[0]?.url) {
      throw new Error('No image URL returned from DALL-E');
    }

    return response.data[0].url;
  } catch (error) {
    console.error('DALL-E image generation error:', error);
    throw error;
  }
}

/**
 * Generate multiple personalized recipes for today's suggestions
 * Returns 6-9 recipes covering all meal types (breakfast, lunch, dinner, snack)
 * @param {object} userPreferences - User preferences from users table
 * @param {array} savedRecipes - User's saved recipes (light summary: titles + tags)
 * @param {array} recentMeals - Recent meal tracking history
 * @param {array} createdRecipes - Recipes user has created
 * @param {array} dislikedRecipes - Array of disliked recipe objects (with name, cuisine, category, etc.)
 */
export async function generateTodaySuggestions(userPreferences, savedRecipes = [], recentMeals = [], createdRecipes = [], dislikedRecipes = []) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Build hard constraints (ALWAYS enforced)
    const hardConstraints = [];
    if (userPreferences?.allergies && userPreferences.allergies.length > 0) {
      hardConstraints.push(`ALLERGIES/INTOLERANCES TO AVOID: ${Array.isArray(userPreferences.allergies) ? userPreferences.allergies.join(', ') : userPreferences.allergies}`);
    }
    
    const strictDiets = ['vegan', 'vegetarian', 'halal', 'kosher'];
    if (userPreferences?.diet_type) {
      const dietTypes = Array.isArray(userPreferences.diet_type) ? userPreferences.diet_type : [userPreferences.diet_type];
      const strictDiet = dietTypes.find(d => strictDiets.includes(d?.toLowerCase()));
      if (strictDiet) {
        hardConstraints.push(`STRICT DIET TYPE: ${strictDiet}`);
      }
    }
    
    if (userPreferences?.dislikes && userPreferences.dislikes.length > 0) {
      hardConstraints.push(`NEVER USE THESE INGREDIENTS: ${Array.isArray(userPreferences.dislikes) ? userPreferences.dislikes.join(', ') : userPreferences.dislikes}`);
    }

    // Build context from user data
    const context = [];
    
    // Preferred cuisines
    if (userPreferences?.preferred_cuisines && userPreferences.preferred_cuisines.length > 0) {
      const cuisines = Array.isArray(userPreferences.preferred_cuisines) ? userPreferences.preferred_cuisines.join(', ') : userPreferences.preferred_cuisines;
      context.push(`Preferred cuisines: ${cuisines}`);
    }

    // Cooking skill level
    if (userPreferences?.experience_level || userPreferences?.cooking_skill) {
      context.push(`Cooking skill: ${userPreferences.cooking_skill || userPreferences.experience_level || 'beginner'}`);
    }

    // Preferred cooking time
    if (userPreferences?.preferred_cooking_time) {
      context.push(`Preferred cooking time: ${userPreferences.preferred_cooking_time}`);
    }

    // Goals
    if (userPreferences?.goals && Array.isArray(userPreferences.goals) && userPreferences.goals.length > 0) {
      context.push(`Health goals: ${userPreferences.goals.join(', ')}`);
    }

    // Calorie goal
    if (userPreferences?.calorie_goal) {
      context.push(`Daily calorie goal: ${userPreferences.calorie_goal} calories`);
    }

    // People count
    if (userPreferences?.people_count) {
      context.push(`Cooking for: ${userPreferences.people_count} ${userPreferences.people_count === 1 ? 'person' : 'people'}`);
    }

    // Saved recipes summary (to understand taste preferences)
    let savedRecipesSummary = '';
    if (savedRecipes && savedRecipes.length > 0) {
      const recipeTitles = savedRecipes.slice(0, 10).map(r => r.name || r.title).filter(Boolean);
      const tags = savedRecipes.slice(0, 10).flatMap(r => r.tags || []).filter(Boolean);
      const uniqueTags = [...new Set(tags)];
      
      if (recipeTitles.length > 0) {
        savedRecipesSummary += `\nSaved recipes they like: ${recipeTitles.join(', ')}`;
      }
      if (uniqueTags.length > 0) {
        savedRecipesSummary += `\nCommon tags from saved recipes: ${uniqueTags.slice(0, 10).join(', ')}`;
      }
    }

    // Created recipes summary
    let createdRecipesSummary = '';
    if (createdRecipes && createdRecipes.length > 0) {
      const createdTitles = createdRecipes.slice(0, 5).map(r => r.name || r.title).filter(Boolean);
      if (createdTitles.length > 0) {
        createdRecipesSummary += `\nRecipes they've created: ${createdTitles.join(', ')}`;
      }
    }

    // Recent meal history
    let recentHistorySummary = '';
    if (recentMeals && recentMeals.length > 0) {
      const recentRecipes = recentMeals.slice(0, 15).map(meal => {
        const name = meal.name || meal.recipe_name;
        const cuisine = meal.cuisine || '';
        const category = meal.category || '';
        const daysAgo = meal.days_ago || 0;
        const liked = meal.liked;
        const likedEmoji = liked === true ? ' (liked)' : liked === false ? ' (disliked)' : '';
        return `${name} (${cuisine}, ${category}) - ${daysAgo} days ago${likedEmoji}`;
      }).join('\n');
      
      if (recentRecipes) {
        recentHistorySummary += `\n\nRecent meal history (last 2 weeks):\n${recentRecipes}`;
      }
    }

    // Build the comprehensive prompt
    let prompt = `You are an expert nutritionist and chef AI assistant. Generate 6-9 personalized recipe suggestions for today that cover different meal types and are tailored to this user's preferences and history.

CRITICAL REQUIREMENTS (MUST FOLLOW):
${hardConstraints.length > 0 ? hardConstraints.join('\n') : 'None (user has no strict dietary restrictions)'}

USER PREFERENCES & CONTEXT:
${context.length > 0 ? context.join('\n') : 'No specific preferences set'}

USER'S RECIPE HISTORY:${savedRecipesSummary}${createdRecipesSummary}${recentHistorySummary || '\nNo recent meal history'}

REQUIREMENTS:
1. Generate 6-9 complete recipes covering different meal types:
   - At least 2 breakfast recipes
   - At least 2 lunch recipes
   - At least 2 dinner recipes
   - At least 1-2 snack/dessert recipes
   
2. Each recipe must be:
   - Unique and different from recipes in their history
   - Tailored to their preferences (cuisines, skill level, cooking time, goals)
   - Respectful of their dietary restrictions and allergies
   - Varied (don't repeat similar dishes)
   
3. Avoid recipes similar to what they've recently cooked (especially if they didn't like them)
${dislikedRecipes && dislikedRecipes.length > 0 ? `\n4. CRITICAL - DISLIKED RECIPES TO AVOID:\nThe user has explicitly disliked these recipes. DO NOT create recipes similar to these:\n${dislikedRecipes.map(r => `- ${r.name}${r.cuisine ? ` (${r.cuisine} cuisine)` : ''}${r.category ? ` - ${r.category}` : ''}${r.ingredients ? ` - contains: ${Array.isArray(r.ingredients) ? r.ingredients.slice(0, 3).map(i => typeof i === 'object' ? (i.name || i) : i).filter(Boolean).join(', ') : ''}` : ''}`).join('\n')}\nAvoid creating recipes with similar flavors, ingredients, cuisines, or cooking styles to the disliked ones.` : ''}

5. Consider their cooking skill level - if beginner, keep recipes simple

6. If they have calorie goals, try to include a mix of lighter and more substantial options

7. Make recipes diverse in cuisine types if they have multiple preferred cuisines

Respond with ONLY a JSON object in this exact format:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Appetizing 2-sentence description explaining why this is perfect for them",
      "category": "breakfast",
      "cuisine": "Italian",
      "cooking_time": 20,
      "prep_time": 10,
      "difficulty": "easy",
      "servings": 4,
      "ingredients": [
        {"name": "ingredient name", "amount": "1", "unit": "cup"},
        {"name": "salt", "amount": "1", "unit": "tsp"}
      ],
      "instructions": [
        {"step": 1, "instruction": "Detailed first step"},
        {"step": 2, "instruction": "Detailed second step"}
      ],
      "nutrition": {
        "calories": 350,
        "protein": 20,
        "carbs": 25,
        "fat": 15,
        "fiber": 5
      },
      "tags": ["healthy", "quick", "vegetarian"],
      "estimated_cost": 8.50
    }
  ]
}

Make sure:
- Each recipe has 6-10 ingredients
- Each recipe has 4-8 clear, detailed steps
- Categories are: breakfast, lunch, dinner, dessert, or snack
- Difficulties are: easy, medium, or hard
- Include varied cuisines based on their preferences
- Recipes are realistic, delicious, and match their skill level`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert nutritionist and chef AI assistant specializing in personalized recipe generation. Always respect dietary restrictions and create diverse, appealing recipes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    // Validate that we have recipes
    if (!parsed.recipes || !Array.isArray(parsed.recipes) || parsed.recipes.length === 0) {
      throw new Error('AI did not return any recipes');
    }

    // Ensure we have recipes for different meal types
    const categories = parsed.recipes.map(r => r.category).filter(Boolean);
    const hasBreakfast = categories.some(c => c === 'breakfast');
    const hasLunch = categories.some(c => c === 'lunch');
    const hasDinner = categories.some(c => c === 'dinner');
    const hasSnack = categories.some(c => ['snack', 'dessert'].includes(c));

    // If missing key meal types, that's okay - AI might have varied it, but log it
    if (!hasBreakfast || !hasLunch || !hasDinner) {
      console.warn('AI generated recipes but missing some meal types:', {
        hasBreakfast,
        hasLunch,
        hasDinner,
        hasSnack,
        categories
      });
    }

    return parsed.recipes;
  } catch (error) {
    console.error('OpenAI Today Suggestions API error:', error);
    throw error;
  }
}

/**
 * Get personalized recipe recommendation
 */
export async function getRecipeRecommendation(userProfile, recentMeals, candidateRecipes, mealType) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert nutritionist and chef AI assistant. Your job is to recommend the perfect recipe for a user based on their preferences, dietary restrictions, cooking history, and the time of day.`,
        },
        {
          role: 'user',
          content: `Please recommend a recipe for ${userProfile.name || 'the user'} for their ${mealType} today.

User Profile:
- Diet type: ${userProfile.diet_type?.join(', ') || 'No specific diet'}
- Allergies: ${userProfile.allergies?.join(', ') || 'None'}
- Dislikes: ${userProfile.dislikes?.join(', ') || 'None'}
- Preferred cuisines: ${userProfile.preferred_cuisines?.join(', ') || 'Any'}
- Cooking experience: ${userProfile.experience_level || 'beginner'}
- Daily calorie goal: ${userProfile.calorie_goal || 'not specified'}

Recent meal history (last 2 weeks):
${
  recentMeals
    .map(
      (meal) =>
        `- ${meal.name} (${meal.cuisine}, ${meal.category}) - ${meal.days_ago} days ago ${meal.liked ? '👍 Liked' : meal.liked === false ? '👎 Disliked' : ''}`
    )
    .join('\n') || 'No recent meal history'
}

Available recipes to choose from:
${candidateRecipes
  .map(
    (recipe, index) =>
      `${index + 1}. ID: ${recipe.id} | ${recipe.name} | ${recipe.cuisine} ${recipe.category} | ${recipe.difficulty} | ${recipe.cooking_time}min | ⭐${recipe.average_rating} | $${recipe.estimated_cost}`
  )
  .join('\n')}

Choose the BEST recipe ID from the list above and provide:
1. The recipe ID number
2. A personalized reason why this recipe is perfect for the user today
3. 2-3 alternative recipe IDs as backup options
4. A confidence score (0-1) for your recommendation

Consider avoiding recipes similar to what they've eaten recently, match their skill level, respect dietary restrictions, and ensure nutritional balance.

Respond with ONLY a JSON object:
{
  "recommended_recipe_id": 123,
  "reason": "Personalized reason here",
  "alternative_recipe_ids": [124, 125],
  "confidence": 0.85,
  "meal_type": "${mealType}"
}`,
        },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI Recommendation API error:', error);
    throw error;
  }
}

