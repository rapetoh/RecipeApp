import sql from "../utils/sql.js";
import OpenAI from "openai";
import { validateVoiceInput, safeParseJSON, withRetry } from "../utils/openai.js";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// POST /api/voice-suggestions - Process voice input and generate recipes
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, audio, mimeType, text } = body;

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    let transcription = text;

    // If audio is provided, transcribe it using Whisper
    if (audio && !text && openai) {
      try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audio, "base64");
        
        // Use OpenAI SDK with File-like object
        // In Node.js, we need to create a File object compatible with the SDK
        let audioFile;
        
        // Try to create File object (available in Node.js 18+)
        if (typeof File !== 'undefined') {
          const audioBlob = new Blob([audioBuffer], {
            type: mimeType || "audio/m4a",
          });
          audioFile = new File([audioBlob], "audio.m4a", {
            type: mimeType || "audio/m4a",
          });
        } else {
          // Fallback: Create a file-like object
          audioFile = {
            name: "audio.m4a",
            type: mimeType || "audio/m4a",
            stream: () => {
              const { Readable } = require('stream');
              return Readable.from([audioBuffer]);
            },
            arrayBuffer: async () => audioBuffer.buffer,
            text: async () => audioBuffer.toString(),
            size: audioBuffer.length,
          };
        }

        const transcriptionResponse = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: "en",
        });

        transcription = transcriptionResponse.text;
      } catch (transcribeError) {
        console.error("Error transcribing audio:", transcribeError);
        // Fallback: Use direct API call with FormData
        try {
          const audioBuffer = Buffer.from(audio, "base64");
          
          // Use native FormData (available in Node.js 18+)
          const formData = new FormData();
          const blob = new Blob([audioBuffer], { type: mimeType || "audio/m4a" });
          formData.append('file', blob, 'audio.m4a');
          formData.append('model', 'whisper-1');
          formData.append('language', 'en');

          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
          }

          const data = await response.json();
          transcription = data.text;
        } catch (altError) {
          console.error("Alternative transcription method also failed:", altError);
          return Response.json(
            { success: false, error: "Failed to transcribe audio. Please try typing your request instead." },
            { status: 500 }
          );
        }
      }
    }

    if (!transcription) {
      return Response.json(
        { success: false, error: "No transcription available" },
        { status: 400 }
      );
    }

    // Validate that the transcription is food/recipe-related (accepts natural language)
    try {
      const validation = await validateVoiceInput(transcription.trim());
      if (!validation.isValid) {
        return Response.json(
          {
            success: false,
            type: "invalid",
            error: validation.reason || "This doesn't seem to be a food-related request. Please try asking about recipes or meals.",
            transcription: transcription, // Include transcription in response for UI display
          },
          { status: 400 }
        );
      }
    } catch (validationError) {
      console.error("Error validating voice input:", validationError);
      // Continue processing if validation fails (don't block user)
    }

    // Get user preferences and context
    const [
      userPrefs,
      savedRecipes,
      recentMeals,
      createdRecipes,
      dislikedRecipes,
    ] = await Promise.all([
      sql`
        SELECT 
          diet_type, allergies, dislikes, preferred_cuisines, 
          calorie_goal, experience_level, cooking_skill, cooking_schedule,
          goals, preferred_cooking_time, people_count,
          apply_preferences_in_assistant, measurement_system
        FROM users 
        WHERE id = ${userId}::uuid
      `,
      sql`
        SELECT 
          r.name, r.tags, r.cuisine, r.category
        FROM recipe_favorites rf
        JOIN recipes r ON rf.recipe_id = r.id
        WHERE rf.user_id = ${userId}::uuid
        ORDER BY rf.created_at DESC
        LIMIT 20
      `,
      sql`
        SELECT 
          r.name, r.cuisine, r.category, mt.liked, mt.cooked_date,
          (CURRENT_DATE - mt.cooked_date) as days_ago
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid 
          AND mt.cooked_date >= CURRENT_DATE - interval '14 days'
        ORDER BY mt.cooked_date DESC
        LIMIT 20
      `,
      sql`
        SELECT 
          name, tags, cuisine, category
        FROM recipes
        WHERE creator_user_id = ${userId}::uuid
        ORDER BY created_at DESC
        LIMIT 10
      `,
      sql`
        SELECT DISTINCT r.id, r.name, r.cuisine, r.category, r.ingredients, r.tags
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid
          AND mt.liked = false
        LIMIT 20
      `,
    ]);

    if (userPrefs.length === 0) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const preferences = userPrefs[0];
    const saved = savedRecipes.map((r) => ({
      name: r.name,
      tags: r.tags || [],
      cuisine: r.cuisine,
      category: r.category,
      title: r.name,
    }));
    const recent = recentMeals.map((m) => ({
      name: m.name,
      cuisine: m.cuisine,
      category: m.category,
      liked: m.liked,
      days_ago: parseInt(m.days_ago) || 0,
      recipe_name: m.name,
    }));
    const created = createdRecipes.map((r) => ({
      name: r.name,
      tags: r.tags || [],
      cuisine: r.cuisine,
      category: r.category,
      title: r.name,
    }));
    const dislikedRecipesList = dislikedRecipes.map((r) => ({
      name: r.name,
      cuisine: r.cuisine,
      category: r.category,
      ingredients: r.ingredients,
      tags: r.tags,
    }));

    // Check if preferences should be applied
    const applyPreferences = preferences?.apply_preferences_in_assistant !== false; // Default to true
    const measurementSystem = preferences?.measurement_system || 'metric';

    // Generate recipes based on voice input + preferences
    const generatedRecipes = await generateVoiceBasedSuggestions(
      transcription,
      preferences,
      saved,
      recent,
      created,
      dislikedRecipesList,
      applyPreferences,
      measurementSystem
    );

    if (!generatedRecipes || generatedRecipes.length === 0) {
      return Response.json(
        { success: false, error: "No recipes generated" },
        { status: 500 }
      );
    }

    // Save recipes and calculate match scores
    const recipesWithScores = [];
    for (const recipeData of generatedRecipes) {
      try {
        // No image generation - will use placeholder in frontend
        const imageUrl = null;

        // Save recipe
        const savedRecipe = await sql`
          INSERT INTO recipes (
            name, description, category, cuisine, cooking_time, prep_time,
            difficulty, servings, ingredients, instructions, image_url,
            nutrition, tags, estimated_cost, creator_type, creator_user_id,
            average_rating, rating_count
          ) VALUES (
            ${recipeData.name},
            ${recipeData.description || ""},
            ${recipeData.category || "lunch"},
            ${recipeData.cuisine || "International"},
            ${recipeData.cooking_time || 30},
            ${recipeData.prep_time || 15},
            ${recipeData.difficulty || "medium"},
            ${recipeData.servings || 4},
            ${JSON.stringify(recipeData.ingredients || [])},
            ${JSON.stringify(recipeData.instructions || [])},
            ${imageUrl},
            ${JSON.stringify(recipeData.nutrition || {})},
            ${recipeData.tags || []},
            ${recipeData.estimated_cost || 10.0},
            ${"ai"},
            ${userId}::uuid,
            ${4.0},
            ${0}
          ) RETURNING id, name, description, category, cuisine, cooking_time, 
                      prep_time, difficulty, servings, image_url, nutrition, 
                      tags, average_rating, estimated_cost, ingredients, instructions
        `;

        const recipe = savedRecipe[0];

        // Calculate match percentage
        const matchPercentage = calculateMatchScore(
          transcription,
          recipeData,
          preferences
        );

        recipesWithScores.push({
          ...recipe,
          matchPercentage,
          dietary_info: getDietaryInfo(recipeData, preferences),
        });
      } catch (dbError) {
        console.error("Error saving recipe:", dbError);
      }
    }

    // Sort by match percentage
    recipesWithScores.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return Response.json({
      success: true,
      transcription,
      recipes: recipesWithScores.slice(0, 10), // Return top 10
    });
  } catch (error) {
    console.error("Error in voice-suggestions endpoint:", error);
    return Response.json(
      { success: false, error: "Failed to process voice suggestions" },
      { status: 500 }
    );
  }
}

// Helper function to generate voice-based suggestions
async function generateVoiceBasedSuggestions(
  vibe,
  userPreferences,
  savedRecipes,
  recentMeals,
  createdRecipes,
  dislikedRecipes,
  applyPreferences = true,
  measurementSystem = 'metric'
) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  // Build constraints and context
  const hardConstraints = [];
  if (userPreferences?.allergies && userPreferences.allergies.length > 0) {
    hardConstraints.push(
      `ALLERGIES/INTOLERANCES TO AVOID: ${Array.isArray(userPreferences.allergies) ? userPreferences.allergies.join(", ") : userPreferences.allergies}`
    );
  }

  const strictDiets = ["vegan", "vegetarian", "halal", "kosher"];
  if (userPreferences?.diet_type) {
    const dietTypes = Array.isArray(userPreferences.diet_type)
      ? userPreferences.diet_type
      : [userPreferences.diet_type];
    const strictDiet = dietTypes.find((d) =>
      strictDiets.includes(d?.toLowerCase())
    );
    if (strictDiet) {
      hardConstraints.push(`STRICT DIET TYPE: ${strictDiet}`);
    }
  }

  if (userPreferences?.dislikes && userPreferences.dislikes.length > 0) {
    hardConstraints.push(
      `NEVER USE THESE INGREDIENTS: ${Array.isArray(userPreferences.dislikes) ? userPreferences.dislikes.join(", ") : userPreferences.dislikes}`
    );
  }

  // Analyze user's favorite recipes patterns
  const analyzeFavoritePatterns = (recipes) => {
    if (!recipes || recipes.length === 0) return null;

    const cuisines = recipes
      .map(r => r.cuisine)
      .filter(Boolean)
      .filter(c => c.trim() !== "");
    
    const categories = recipes
      .map(r => r.category)
      .filter(Boolean)
      .filter(c => c.trim() !== "");

    // Extract all tags from recipes
    const allTags = recipes
      .flatMap(r => (Array.isArray(r.tags) ? r.tags : []))
      .filter(Boolean)
      .map(t => typeof t === 'string' ? t.toLowerCase() : t);

    // Count tag frequency
    const tagCounts = {};
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    // Get most common tags (appearing in at least 2 recipes or 20% of recipes)
    const minOccurrences = Math.max(2, Math.ceil(recipes.length * 0.2));
    const commonTags = Object.entries(tagCounts)
      .filter(([_, count]) => count >= minOccurrences)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([tag, _]) => tag);

    // Count cuisine frequency
    const cuisineCounts = {};
    cuisines.forEach(cuisine => {
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    });
    const topCuisines = Object.entries(cuisineCounts)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([cuisine, _]) => cuisine);

    // Count category frequency
    const categoryCounts = {};
    categories.forEach(category => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([category, _]) => category);

    return {
      topCuisines,
      topCategories,
      commonTags,
    };
  };

  // Analyze user's created recipes patterns
  const analyzeCreatedPatterns = (recipes) => {
    if (!recipes || recipes.length === 0) return null;

    const cuisines = recipes
      .map(r => r.cuisine)
      .filter(Boolean)
      .filter(c => c.trim() !== "");
    
    const categories = recipes
      .map(r => r.category)
      .filter(Boolean)
      .filter(c => c.trim() !== "");

    // Count cuisine frequency
    const cuisineCounts = {};
    cuisines.forEach(cuisine => {
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    });
    const topCuisines = Object.entries(cuisineCounts)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([cuisine, _]) => cuisine);

    // Count category frequency
    const categoryCounts = {};
    categories.forEach(category => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([category, _]) => category);

    return {
      topCuisines,
      topCategories,
    };
  };

  // Analyze patterns from user's actual behavior
  const favoritePatterns = analyzeFavoritePatterns(savedRecipes);
  const createdPatterns = analyzeCreatedPatterns(createdRecipes);

  // Build context (only when applyPreferences is true)
  const context = [];
  if (applyPreferences) {
    if (userPreferences?.preferred_cuisines) {
      const cuisines = Array.isArray(userPreferences.preferred_cuisines)
        ? userPreferences.preferred_cuisines.join(", ")
        : userPreferences.preferred_cuisines;
      context.push(`Preferred cuisines: ${cuisines}`);
    }

    if (userPreferences?.cooking_skill || userPreferences?.experience_level) {
      context.push(
        `Cooking skill: ${userPreferences.cooking_skill || userPreferences.experience_level || "beginner"}`
      );
    }

    if (userPreferences?.preferred_cooking_time) {
      context.push(`Preferred cooking time: ${userPreferences.preferred_cooking_time}`);
    }

    if (userPreferences?.goals && Array.isArray(userPreferences.goals) && userPreferences.goals.length > 0) {
      context.push(`Health goals: ${userPreferences.goals.join(", ")}`);
    }

    // Add insights from user's favorite recipes
    if (favoritePatterns) {
      const insights = [];
      if (favoritePatterns.topCuisines.length > 0) {
        insights.push(`User's favorite recipes are primarily ${favoritePatterns.topCuisines.join(", ")} cuisine(s)`);
      }
      if (favoritePatterns.topCategories.length > 0) {
        insights.push(`User tends to save ${favoritePatterns.topCategories.join(", ")} recipes`);
      }
      if (favoritePatterns.commonTags.length > 0) {
        insights.push(`User's favorites often include: ${favoritePatterns.commonTags.join(", ")}`);
      }
      if (insights.length > 0) {
        context.push(`Based on user's saved favorites: ${insights.join("; ")}`);
      }
    }

    // Add insights from user's created recipes
    if (createdPatterns) {
      const insights = [];
      if (createdPatterns.topCuisines.length > 0) {
        insights.push(`User typically creates ${createdPatterns.topCuisines.join(", ")} style recipes`);
      }
      if (createdPatterns.topCategories.length > 0) {
        insights.push(`User often creates ${createdPatterns.topCategories.join(", ")} recipes`);
      }
      if (insights.length > 0) {
        context.push(`Based on user's created recipes: ${insights.join("; ")}`);
      }
    }
  }

  // Determine unit examples based on measurement system
  const unitExamples = measurementSystem === 'imperial' 
    ? '{"name": "ingredient", "amount": "1", "unit": "cup"}, {"name": "salt", "amount": "1", "unit": "tsp"}'
    : '{"name": "ingredient", "amount": "250", "unit": "g"}, {"name": "salt", "amount": "5", "unit": "ml"}';

  const prompt = `You are an expert nutritionist and chef AI assistant. The user just said: "${vibe}"

Generate EXACTLY 10 personalized recipe suggestions that match their current mood and request. You MUST return exactly 10 recipes, no more, no less.

CRITICAL RECIPE REQUIREMENTS:
- Generate ONLY real, traditional, or well-known recipes that actually exist
- Do NOT invent new recipe combinations or make up recipes
- Use standard, tested cooking methods and realistic cooking times
- Ensure all ingredient combinations are authentic and commonly used together
- Cooking times must be realistic (e.g., quick meals: 15-30 min, standard: 30-60 min, complex: 60+ min)
- Use proper cooking temperatures and techniques that are standard for each dish type

CRITICAL SAFETY REQUIREMENTS (MUST FOLLOW):
${hardConstraints.length > 0 ? hardConstraints.join("\n") : "None"}

${applyPreferences && context.length > 0 ? `USER PREFERENCES:\n${context.join("\n")}\n\n` : ''}IMPORTANT: Use ${measurementSystem === 'imperial' ? 'US Imperial units (cups, ounces, pounds, tsp, tbsp)' : 'Metric units (grams, kilograms, milliliters, liters)'} for all ingredient measurements.

Based on their request "${vibe}", create recipes that:
1. Match their current mood/needs (e.g., if they said "tired and want something quick", give quick, energizing recipes)
2. Respect their dietary restrictions
3. Are varied and appealing
4. Use ${measurementSystem === 'imperial' ? 'US Imperial' : 'Metric'} measurement units
5. Are real, authentic recipes that people actually cook

Respond with ONLY a JSON object:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Why this matches their vibe",
      "category": "breakfast",
      "cuisine": "Italian",
      "cooking_time": 20,
      "prep_time": 10,
      "difficulty": "easy",
      "servings": 4,
      "ingredients": [${unitExamples}],
      "instructions": [{"step": 1, "instruction": "Step details"}],
      "nutrition": {"calories": 350, "protein": 20, "carbs": 25, "fat": 15, "fiber": 5, "sugar": 8, "sodium": 450, "saturated_fat": 5, "cholesterol": 45, "vitamin_a": 15, "vitamin_c": 20, "calcium": 8, "iron": 12, "potassium": 10},
      "tags": ["quick", "healthy"],
      "estimated_cost": 8.50
    }
  ]
}`;

  // Wrap OpenAI call AND parsing in retry logic - if JSON is truncated, retry the whole request
  const parsed = await withRetry(
    async () => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an expert nutritionist and chef AI assistant. Generate personalized recipes based on user's voice input and preferences.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse inside retry - truncated JSON will trigger a retry
      return safeParseJSON(content, 'voice suggestions');
    },
    { maxRetries: 2, context: 'Voice suggestions generation' }
  );

  let recipes = parsed.recipes || [];
  
  // Ensure we have exactly 10 recipes (pad or trim if needed)
  if (recipes.length < 10) {
    console.warn(`AI only generated ${recipes.length} recipes, expected 10`);
    // If we have fewer than 10, we'll return what we have (better than padding with duplicates)
  } else if (recipes.length > 10) {
    recipes = recipes.slice(0, 10);
  }
  
  return recipes;
}

// Calculate match score based on vibe and recipe
function calculateMatchScore(vibe, recipe, preferences) {
  let score = 85; // Base score

  const vibeLower = vibe.toLowerCase();
  const recipeNameLower = recipe.name.toLowerCase();
  const recipeDescLower = (recipe.description || "").toLowerCase();
  const recipeTags = (recipe.tags || []).map((t) => t.toLowerCase());

  // Check for keyword matches
  const keywords = {
    quick: ["quick", "fast", "fast", "minutes", "min", "15", "10", "5"],
    sweet: ["sweet", "dessert", "sugar", "chocolate", "cake"],
    spicy: ["spicy", "hot", "chili", "pepper", "heat"],
    healthy: ["healthy", "nutritious", "fresh", "light"],
    comfort: ["comfort", "warm", "cozy", "hearty"],
    tired: ["energizing", "quick", "protein", "coffee"],
  };

  for (const [key, terms] of Object.entries(keywords)) {
    if (terms.some((term) => vibeLower.includes(term))) {
      if (
        recipeNameLower.includes(key) ||
        recipeDescLower.includes(key) ||
        recipeTags.includes(key)
      ) {
        score += 10;
      }
    }
  }

  // Time matching
  const timeMatch = vibeLower.match(/(\d+)\s*(min|minutes|mins)/);
  if (timeMatch) {
    const requestedTime = parseInt(timeMatch[1]);
    const recipeTime = recipe.cooking_time || 30;
    const timeDiff = Math.abs(requestedTime - recipeTime);
    if (timeDiff <= 5) score += 10;
    else if (timeDiff <= 10) score += 5;
  }

  return Math.min(99, Math.max(75, score));
}

function getDietaryInfo(recipe, preferences) {
  const tags = recipe.tags || [];
  if (tags.some((t) => t.toLowerCase().includes("vegan"))) return "Vegan";
  if (tags.some((t) => t.toLowerCase().includes("vegetarian"))) return "Vegetarian";
  if (tags.some((t) => t.toLowerCase().includes("gluten"))) return "Gluten-Free";
  return null;
}

