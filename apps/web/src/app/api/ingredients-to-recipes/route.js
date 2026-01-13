import sql from "../utils/sql.js";
import { analyzeIngredientsFromImage, generateRecipesFromIngredients } from "../utils/openai.js";

// Helper function to fetch user preferences
async function getUserPreferences(userId) {
  if (!userId) return null;
  
  try {
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'apply_preferences_in_assistant'
    `;
    
    const hasApplyPreferencesColumn = columnExists.length > 0;
    
    const userPrefs = hasApplyPreferencesColumn
      ? await sql`
          SELECT 
            diet_type,
            allergies,
            dislikes,
            preferred_cuisines,
            goals,
            cooking_skill,
            preferred_cooking_time,
            people_count,
            apply_preferences_in_assistant,
            measurement_system
          FROM users
          WHERE id = ${userId}::uuid
        `
      : await sql`
          SELECT 
            diet_type,
            allergies,
            dislikes,
            preferred_cuisines,
            goals,
            cooking_skill,
            preferred_cooking_time,
            people_count,
            measurement_system
          FROM users
          WHERE id = ${userId}::uuid
        `;
    
    if (userPrefs.length === 0) return null;
    
    const prefs = userPrefs[0];
    return {
      dietType: (prefs.diet_type && Array.isArray(prefs.diet_type) && prefs.diet_type.length > 0) 
        ? prefs.diet_type[0] 
        : (prefs.diet_type || null),
      allergies: prefs.allergies || [],
      dislikedIngredients: prefs.dislikes || [],
      favoriteCuisines: prefs.preferred_cuisines || [],
      goals: prefs.goals || [],
      cookingSkill: prefs.cooking_skill || "beginner",
      preferredCookingTime: prefs.preferred_cooking_time || "15_30",
      peopleCount: prefs.people_count || 1,
      applyPreferencesInAssistant: hasApplyPreferencesColumn 
        ? (prefs.apply_preferences_in_assistant !== false) 
        : true,
      measurementSystem: prefs.measurement_system || "metric",
    };
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return null;
  }
}

// Helper function to convert image URL to base64
async function imageUrlToBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw new Error("Failed to process image");
  }
}

// POST /api/ingredients-to-recipes - Analyze ingredients from image and generate recipes
export async function POST(request) {
  try {
    const body = await request.json();
    const { imageUrl, userId } = body;

    if (!imageUrl) {
      return Response.json(
        { success: false, error: "Image URL is required" },
        { status: 400 }
      );
    }

    console.log("Processing ingredients-to-recipes for image:", imageUrl);

    // Convert image URL to base64
    let base64Image;
    try {
      base64Image = await imageUrlToBase64(imageUrl);
    } catch (error) {
      console.error("Error converting image:", error);
      return Response.json(
        { success: false, error: "Failed to process the image" },
        { status: 400 }
      );
    }

    // Get user preferences
    const userPreferences = await getUserPreferences(userId);
    const applyPreferences = userPreferences?.applyPreferencesInAssistant !== false;
    const measurementSystem = userPreferences?.measurementSystem || 'metric';

    // Use Vision API to detect ingredients
    let ingredientsAnalysis;
    try {
      ingredientsAnalysis = await analyzeIngredientsFromImage(base64Image);
    } catch (error) {
      console.error("Error analyzing ingredients:", error);
      return Response.json(
        { success: false, error: "Failed to analyze image. Please try a clearer photo." },
        { status: 500 }
      );
    }

    const detectedIngredients = ingredientsAnalysis.ingredients || [];
    const confidence = ingredientsAnalysis.confidence || 0;

    // Check confidence threshold
    if (confidence < 0.5 || detectedIngredients.length === 0) {
      return Response.json(
        {
          success: false,
          type: "low_confidence",
          error: "Could not clearly identify ingredients in this image. Please try a clearer photo of your fridge, pantry, or ingredients.",
          confidence: confidence,
        },
        { status: 400 }
      );
    }

    console.log(`Detected ${detectedIngredients.length} ingredients:`, detectedIngredients);

    // Generate recipes from ingredients
    let generatedRecipes;
    try {
      generatedRecipes = await generateRecipesFromIngredients(
        detectedIngredients,
        userPreferences,
        applyPreferences,
        measurementSystem
      );
    } catch (error) {
      console.error("Error generating recipes:", error);
      return Response.json(
        { success: false, error: "Failed to generate recipes. Please try again." },
        { status: 500 }
      );
    }

    if (!generatedRecipes || generatedRecipes.length === 0) {
      return Response.json(
        { success: false, error: "No recipes could be generated from these ingredients." },
        { status: 500 }
      );
    }

    // Save recipes to database and calculate match scores
    const recipesWithScores = [];
    for (const recipeData of generatedRecipes) {
      try {
        // Save recipe
        const imageUrl = null; // No image for now
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
            ${userId ? userId : null}::uuid,
            ${4.0},
            ${0}
          ) RETURNING id, name, description, category, cuisine, cooking_time, 
                      prep_time, difficulty, servings, nutrition, 
                      tags, average_rating, estimated_cost, ingredients, instructions
        `;

        const recipe = savedRecipe[0];

        // Calculate match score based on how many detected ingredients are used
        const recipeIngredients = Array.isArray(recipe.ingredients)
          ? recipe.ingredients.map(ing => {
              const ingName = typeof ing === 'string' ? ing : (ing.name || ing.ingredient || '');
              return ingName.toLowerCase();
            })
          : [];
        
        const detectedLower = detectedIngredients.map(ing => ing.toLowerCase());
        const matchingIngredients = recipeIngredients.filter(recipeIng => 
          detectedLower.some(detectedIng => 
            recipeIng.includes(detectedIng) || detectedIng.includes(recipeIng)
          )
        );
        
        const matchPercentage = detectedIngredients.length > 0
          ? Math.min(99, Math.max(75, (matchingIngredients.length / detectedIngredients.length) * 100))
          : 85;

        recipesWithScores.push({
          ...recipe,
          matchPercentage: Math.round(matchPercentage),
        });
      } catch (dbError) {
        console.error("Error saving recipe:", dbError);
        // Continue with other recipes even if one fails
      }
    }

    // Sort by match percentage (recipes using more detected ingredients first)
    recipesWithScores.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return Response.json({
      success: true,
      detectedIngredients: detectedIngredients,
      recipes: recipesWithScores.slice(0, 10), // Return top 10
    });
  } catch (error) {
    console.error("Error in ingredients-to-recipes endpoint:", error);
    return Response.json(
      { success: false, error: "Failed to process ingredients" },
      { status: 500 }
    );
  }
}

