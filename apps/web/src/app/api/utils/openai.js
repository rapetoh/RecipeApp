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

