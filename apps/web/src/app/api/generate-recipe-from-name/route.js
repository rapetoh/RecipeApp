import sql from "@/app/api/utils/sql";
import { generateRecipeWithGPT, generateImageWithDALLE } from "@/app/api/utils/openai";

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

// POST /api/generate-recipe-from-name - Generate recipe from dish name
export async function POST(request) {
  try {
    const body = await request.json();
    const { dishName, userId } = body;

    if (!dishName || !dishName.trim()) {
      return Response.json(
        { success: false, error: "Dish name is required" },
        { status: 400 },
      );
    }

    const trimmedDishName = dishName.trim();

    // First, search database for existing recipe
    const existingRecipes = await sql`
      SELECT * FROM recipes 
      WHERE LOWER(name) LIKE LOWER(${"%" + trimmedDishName + "%"})
      ORDER BY 
        CASE WHEN LOWER(name) = LOWER(${trimmedDishName}) THEN 1 ELSE 2 END,
        average_rating DESC
      LIMIT 1
    `;

    if (existingRecipes.length > 0) {
      const recipe = existingRecipes[0];
      const dishLower = trimmedDishName.toLowerCase();
      const nameLower = recipe.name.toLowerCase();
      
      // If names match closely, return existing recipe
      if (nameLower.includes(dishLower) || dishLower.includes(nameLower)) {
        return Response.json({
          success: true,
          data: {
            recipe: recipe,
            isGenerated: false,
          },
        });
      }
    }

    // Generate recipe using AI
    // Create analysis object for recipe generation (outside try block so it's accessible in SQL query)
    const analysis = {
      cuisine: "Global",
      difficulty: "medium",
      estimated_time: 30,
      category: "dinner",
    };

    // Fetch user preferences if userId is provided
    const userPreferences = await getUserPreferences(userId);
    const applyPreferences = userPreferences?.applyPreferencesInAssistant !== false; // Default to true

    let recipeJson;
    try {
      recipeJson = await generateRecipeWithGPT(
        trimmedDishName, 
        analysis,
        userPreferences,
        applyPreferences
      );
      
      // Validate that we got a meaningful recipe
      if (!recipeJson.name || !recipeJson.ingredients || !recipeJson.instructions) {
        throw new Error("AI generated incomplete recipe data");
      }
    } catch (error) {
      console.error("Failed to generate recipe:", error);
      return Response.json(
        {
          success: false,
          error: "We couldn't generate a recipe for this dish name. Please check the spelling or try another name.",
        },
        { status: 500 },
      );
    }

    // Generate image using DALL-E
    let imageUrl = null;
    try {
      imageUrl = await generateImageWithDALLE(recipeJson.name || trimmedDishName);
    } catch (imageError) {
      console.error("Failed to generate image:", imageError);
      // Use placeholder image if generation fails
      imageUrl = "https://images.pexels.com/photos/5773960/pexels-photo-5773960.jpeg";
    }

    // Save the generated recipe to database
    const savedRecipe = await sql`
      INSERT INTO recipes (
        name, description, category, cuisine, cooking_time, prep_time,
        difficulty, servings, ingredients, instructions, nutrition,
        image_url, tags, creator_type, estimated_cost, average_rating, rating_count, is_featured
      ) VALUES (
        ${recipeJson.name || trimmedDishName},
        ${recipeJson.description || `A delicious ${trimmedDishName} recipe`},
        ${analysis.category},
        ${analysis.cuisine},
        ${recipeJson.cooking_time || analysis.estimated_time || 30},
        ${recipeJson.prep_time || 15},
        ${analysis.difficulty},
        ${recipeJson.servings || 4},
        ${JSON.stringify(recipeJson.ingredients || [])},
        ${JSON.stringify(recipeJson.instructions || [])},
        ${JSON.stringify(recipeJson.nutrition || { calories: 300, protein: 15, carbs: 30, fat: 10 })},
        ${imageUrl},
        ${["ai-generated", "text-generated"]},
        ${"ai"},
        ${12.0},
        ${4.2},
        ${1},
        ${false}
      ) RETURNING *
    `;

    return Response.json({
      success: true,
      data: {
        recipe: savedRecipe[0],
        isGenerated: true,
      },
    });
  } catch (error) {
    console.error("Error generating recipe from name:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to generate recipe. Please try again.",
      },
      { status: 500 },
    );
  }
}

