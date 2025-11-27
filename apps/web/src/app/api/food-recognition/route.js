import sql from "@/app/api/utils/sql";
import { analyzeImageWithVision, generateRecipeWithGPT } from "@/app/api/utils/openai";

// Helper function to fetch user preferences
async function getUserPreferences(userId) {
  if (!userId) return null;
  
  try {
    // Check if apply_preferences_in_assistant column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'apply_preferences_in_assistant'
    `;
    
    const hasApplyPreferencesColumn = columnExists.length > 0;
    
    // Conditionally include apply_preferences_in_assistant if column exists
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
            apply_preferences_in_assistant
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
            people_count
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
        : true, // Default to true if column doesn't exist
    };
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return null; // Return null on error, don't break the flow
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

    // Get content type from response headers
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw new Error("Failed to process image");
  }
}

// POST /api/food-recognition - Analyze food image and generate recipe
export async function POST(request) {
  try {
    const body = await request.json();
    const { imageUrl, userId } = body;

    if (!imageUrl) {
      return Response.json(
        { success: false, error: "Image URL is required" },
        { status: 400 },
      );
    }

    console.log("Processing food recognition for image:", imageUrl);

    // Convert image URL to base64
    let base64Image;
    try {
      base64Image = await imageUrlToBase64(imageUrl);
    } catch (error) {
      console.error("Error converting image:", error);
      return Response.json(
        { success: false, error: "Failed to process the image" },
        { status: 400 },
      );
    }

    // Use OpenAI Vision to analyze the image
    let analysisJson;
    try {
      analysisJson = await analyzeImageWithVision(base64Image);
      
      // Validate required fields and set defaults
      if (
        !analysisJson.dish_name ||
        !analysisJson.detected_ingredients ||
        typeof analysisJson.confidence !== "number"
      ) {
        throw new Error("Missing required fields in analysis");
      }

      // Lower confidence threshold for common foods (was 0.5, now 0.3)
      if (analysisJson.confidence < 0.3) {
        return Response.json(
          {
            success: false,
            error:
              "Could not identify food in this image. Try a clearer photo of a dish.",
          },
          { status: 400 },
        );
      }

      // Set defaults for missing fields
      analysisJson.cuisine = analysisJson.cuisine || "Global";
      analysisJson.difficulty = analysisJson.difficulty || "medium";
      analysisJson.estimated_time = analysisJson.estimated_time || 30;
      analysisJson.category = analysisJson.category || "dinner";
    } catch (parseError) {
      console.error("Failed to analyze image:", parseError);
      return Response.json(
        {
          success: false,
          error:
            "Could not analyze the food in this image. Please try a different photo.",
        },
        { status: 400 },
      );
    }

    console.log("Parsed analysis:", analysisJson);

    // Check if we have similar recipes in our database first
    const similarRecipes = await sql`
      SELECT id, name, average_rating, cooking_time, cuisine, difficulty, description, image_url, ingredients, instructions, nutrition
      FROM recipes 
      WHERE (
        LOWER(name) LIKE LOWER(${"%" + analysisJson.dish_name + "%"}) OR
        LOWER(description) LIKE LOWER(${"%" + analysisJson.dish_name + "%"}) OR
        LOWER(cuisine) = LOWER(${analysisJson.cuisine})
      )
      AND average_rating >= 4.0
      ORDER BY 
        CASE WHEN LOWER(name) LIKE LOWER(${"%" + analysisJson.dish_name + "%"}) THEN 1 ELSE 2 END,
        average_rating DESC
      LIMIT 5
    `;

    let generatedRecipe = null;
    let useExistingRecipe = false;

    // If we found a very close match, use it instead of generating
    if (similarRecipes.length > 0) {
      const bestMatch = similarRecipes[0];
      const dishLower = analysisJson.dish_name.toLowerCase();
      const nameLower = bestMatch.name.toLowerCase();

      // If the names are very similar, use existing recipe
      if (nameLower.includes(dishLower) || dishLower.includes(nameLower)) {
        generatedRecipe = bestMatch;
        useExistingRecipe = true;
        console.log("Using existing recipe:", bestMatch.name);
      }
    }

    // If no good existing recipe found, generate a new one
    if (!useExistingRecipe) {
      console.log("Generating new recipe for:", analysisJson.dish_name);

      // Fetch user preferences if userId is provided
      const userPreferences = await getUserPreferences(userId);
      const applyPreferences = userPreferences?.applyPreferencesInAssistant !== false; // Default to true

      try {
        const recipeJson = await generateRecipeWithGPT(
          analysisJson.dish_name, 
          analysisJson,
          userPreferences,
          applyPreferences
        );

        console.log("Recipe Json:", recipeJson);

        // Don't save the recipe automatically - return it as data for user to optionally save
        // Combine recipe data with analysis data for the response
        generatedRecipe = {
          ...recipeJson,
          category: analysisJson.category,
          cuisine: analysisJson.cuisine,
          cooking_time: recipeJson.cooking_time || analysisJson.estimated_time || 30,
          prep_time: recipeJson.prep_time || 15,
          difficulty: analysisJson.difficulty,
          servings: recipeJson.servings || 4,
          nutrition: recipeJson.nutrition || { calories: 300, protein: 15, carbs: 30, fat: 10 },
          tags: ["ai-generated", "image-recognized"],
          creator_type: "ai",
          image_url: imageUrl,
          // Store original analysis for reference
          _analysis: analysisJson,
          _imageUrl: imageUrl,
        };
        
        console.log("Generated recipe (not saved yet):", generatedRecipe.name);
      } catch (parseError) {
        console.error("Failed to parse or save generated recipe:", parseError);
        // Fall back to using similar recipe if available
        if (similarRecipes.length > 0) {
          generatedRecipe = similarRecipes[0];
          useExistingRecipe = true;
        } else {
          throw parseError;
        }
      }
    }

    // Save the recognition result (without recipe ID since recipe isn't saved yet)
    const recognitionResult = await sql`
      INSERT INTO food_recognition_results (
        user_id, image_url, detected_dish_name, detected_ingredients,
        confidence_score, generated_recipe_id
      ) VALUES (
        ${userId ? userId : null},
        ${imageUrl},
        ${analysisJson.dish_name},
        ${analysisJson.detected_ingredients},
        ${analysisJson.confidence},
        null
      ) RETURNING *
    `;

    // Get alternative recipes (excluding the main one)
    const alternatives = similarRecipes
      .filter((r) => r.id !== generatedRecipe?.id)
      .slice(0, 3);

    return Response.json({
      success: true,
      data: {
        analysis: analysisJson,
        similarRecipes: alternatives,
        generatedRecipe: generatedRecipe,
        recognitionId: recognitionResult[0].id,
      },
    });
  } catch (error) {
    console.error("Error in food recognition:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to analyze the image. Please try again.",
      },
      { status: 500 },
    );
  }
}

