import sql from "@/app/api/utils/sql";
import { generateImageWithDALLE } from "@/app/api/utils/openai";
import OpenAI from "openai";

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
          goals, preferred_cooking_time, people_count
        FROM users 
        WHERE id = ${userId}::uuid
      `,
      sql`
        SELECT 
          r.name, r.tags, r.cuisine, r.category
        FROM saved_recipes sr
        JOIN recipes r ON sr.recipe_id = r.id
        WHERE sr.user_id = ${userId}::uuid
        ORDER BY sr.created_at DESC
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

    // Generate recipes based on voice input + preferences
    const generatedRecipes = await generateVoiceBasedSuggestions(
      transcription,
      preferences,
      saved,
      recent,
      created,
      dislikedRecipesList
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
        // Generate image
        let imageUrl = null;
        try {
          imageUrl = await generateImageWithDALLE(recipeData.name);
        } catch (imgError) {
          console.warn("Failed to generate image:", imgError);
        }

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
      recipes: recipesWithScores.slice(0, 5), // Return top 5
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
  dislikedRecipes
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

  // Build context
  const context = [];
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

  const prompt = `You are an expert nutritionist and chef AI assistant. The user just said: "${vibe}"

Generate 3-5 personalized recipe suggestions that match their current mood and request.

CRITICAL REQUIREMENTS (MUST FOLLOW):
${hardConstraints.length > 0 ? hardConstraints.join("\n") : "None"}

USER PREFERENCES:
${context.length > 0 ? context.join("\n") : "No specific preferences"}

Based on their request "${vibe}", create recipes that:
1. Match their current mood/needs (e.g., if they said "tired and want something quick", give quick, energizing recipes)
2. Respect their dietary restrictions
3. Are varied and appealing

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
      "ingredients": [{"name": "ingredient", "amount": "1", "unit": "cup"}],
      "instructions": [{"step": 1, "instruction": "Step details"}],
      "nutrition": {"calories": 350, "protein": 20, "carbs": 25, "fat": 15, "fiber": 5},
      "tags": ["quick", "healthy"],
      "estimated_cost": 8.50
    }
  ]
}`;

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
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);
  return parsed.recipes || [];
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

