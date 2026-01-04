import sql from "@/app/api/utils/sql";
import { generateTodaySuggestions } from "@/app/api/utils/openai";

// Helper function to generate suggestions for a date (can be called async in background)
async function generateSuggestionsForDate(userId, date) {
  try {
    // Check if suggestions already exist to avoid duplicate generation
    const existingCheck = await sql`
      SELECT COUNT(*) as count
      FROM user_daily_suggestions
      WHERE user_id = ${userId}::uuid AND date = ${date}::date
      LIMIT 1
    `;
    
    if (parseInt(existingCheck[0]?.count || 0) > 0) {
      console.log(`Suggestions already exist for ${date}, skipping generation`);
      return; // Already exists, don't regenerate
    }

    // Collect comprehensive user data for personalization
    const [
      userPrefs,
      savedRecipes,
      recentMeals,
      createdRecipes,
      recentSuggestions,
      dislikedRecipes
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
          (${date}::date - mt.cooked_date) as days_ago
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid 
          AND mt.cooked_date >= ${date}::date - interval '14 days'
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
        SELECT r.name, r.cuisine, r.category
        FROM user_daily_suggestions uds
        JOIN recipes r ON uds.recipe_id = r.id
        WHERE uds.user_id = ${userId}::uuid 
          AND uds.date >= ${date}::date - interval '7 days'
          AND uds.date < ${date}::date
        ORDER BY uds.date DESC
        LIMIT 30
      `,
      sql`
        SELECT DISTINCT r.id, r.name, r.cuisine, r.category, r.ingredients, r.tags
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid
          AND mt.liked = false
        LIMIT 20
      `
    ]);

    if (userPrefs.length === 0) {
      console.error(`User not found for ${userId}`);
      return;
    }

    const preferences = userPrefs[0];
    const saved = savedRecipes.map(r => ({
      name: r.name,
      tags: r.tags || [],
      cuisine: r.cuisine,
      category: r.category,
      title: r.name
    }));
    const recent = recentMeals.map(m => ({
      name: m.name,
      cuisine: m.cuisine,
      category: m.category,
      liked: m.liked,
      days_ago: parseInt(m.days_ago) || 0,
      recipe_name: m.name
    }));
    const created = createdRecipes.map(r => ({
      name: r.name,
      tags: r.tags || [],
      cuisine: r.cuisine,
      category: r.category,
      title: r.name
    }));
    const dislikedRecipesList = dislikedRecipes.map(r => ({
      name: r.name,
      cuisine: r.cuisine,
      category: r.category,
      ingredients: r.ingredients,
      tags: r.tags,
    }));

    // Generate AI suggestions
    let generatedRecipes;
    try {
      generatedRecipes = await generateTodaySuggestions(
        preferences,
        saved,
        recent,
        created,
        dislikedRecipesList
      );
    } catch (error) {
      console.error("Error generating AI suggestions in background:", error);
      return;
    }

    if (!generatedRecipes || generatedRecipes.length === 0) {
      console.error("No recipes generated in background");
      return;
    }

    // Save recipes to database and link them
    for (const recipeData of generatedRecipes) {
      try {
        // No image generation - will use placeholder in frontend
        const imageUrl = null;

        // Save recipe to database
        const savedRecipe = await sql`
          INSERT INTO recipes (
            name, description, category, cuisine, cooking_time, prep_time,
            difficulty, servings, ingredients, instructions, image_url,
            nutrition, tags, estimated_cost, creator_type, creator_user_id,
            average_rating, rating_count
          ) VALUES (
            ${recipeData.name},
            ${recipeData.description || ''},
            ${recipeData.category || 'lunch'},
            ${recipeData.cuisine || 'International'},
            ${recipeData.cooking_time || 30},
            ${recipeData.prep_time || 15},
            ${recipeData.difficulty || 'medium'},
            ${recipeData.servings || 4},
            ${JSON.stringify(recipeData.ingredients || [])},
            ${JSON.stringify(recipeData.instructions || [])},
            ${imageUrl},
            ${JSON.stringify(recipeData.nutrition || {})},
            ${recipeData.tags || []},
            ${recipeData.estimated_cost || 10.0},
            ${'ai'},
            ${userId}::uuid,
            ${4.0},
            ${0}
          ) RETURNING id
        `;

        const recipeId = savedRecipe[0].id;

        // Link recipe to user's daily suggestions
        await sql`
          INSERT INTO user_daily_suggestions (user_id, date, recipe_id)
          VALUES (${userId}::uuid, ${date}, ${recipeId})
          ON CONFLICT (user_id, date, recipe_id) DO NOTHING
        `;
      } catch (dbError) {
        console.error("Error saving recipe in background:", recipeData.name, dbError);
      }
    }
    
    console.log(`Successfully generated ${generatedRecipes.length} suggestions for ${date} in background`);
  } catch (error) {
    console.error("Error in generateSuggestionsForDate:", error);
  }
}

// GET /api/today-suggestions - Get or generate today's AI suggestions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const forceRegenerate = searchParams.get("forceRegenerate") === "true";

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    // Check if suggestions already exist for today (unless forcing regenerate)
    if (!forceRegenerate) {
      const existingSuggestions = await sql`
        SELECT 
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, 
          r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition, 
          r.tags, r.average_rating, r.estimated_cost, r.ingredients, r.instructions,
          uds.generated_at
        FROM user_daily_suggestions uds
        JOIN recipes r ON uds.recipe_id = r.id
        LEFT JOIN meal_tracking mt ON mt.user_id = ${userId}::uuid 
          AND mt.recipe_id = r.id 
          AND mt.liked = false
        WHERE uds.user_id = ${userId}::uuid 
          AND uds.date = ${date}
          AND mt.id IS NULL
        ORDER BY uds.generated_at ASC
      `;

      if (existingSuggestions.length > 0) {
        return Response.json({
          success: true,
          data: existingSuggestions,
          cached: true,
        });
      }
      
      // If today's suggestions don't exist, check for most recent available (fallback)
      // Look back up to 7 days to find the most recent suggestions
      const fallbackSuggestions = await sql`
        SELECT 
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, 
          r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition, 
          r.tags, r.average_rating, r.estimated_cost, r.ingredients, r.instructions,
          uds.generated_at, uds.date as suggestion_date
        FROM user_daily_suggestions uds
        JOIN recipes r ON uds.recipe_id = r.id
        LEFT JOIN meal_tracking mt ON mt.user_id = ${userId}::uuid 
          AND mt.recipe_id = r.id 
          AND mt.liked = false
        WHERE uds.user_id = ${userId}::uuid 
          AND uds.date < ${date}::date
          AND uds.date >= ${date}::date - interval '7 days'
          AND mt.id IS NULL
        ORDER BY uds.date DESC
        LIMIT 9
      `;
      
      // If we found fallback suggestions, return them immediately
      // (so user doesn't wait while we generate today's suggestions)
      if (fallbackSuggestions.length > 0) {
        // Trigger generation of today's suggestions in background (non-blocking)
        // We don't await this - it runs in the background
        generateSuggestionsForDate(userId, date).catch(err => {
          console.error("Background suggestion generation failed:", err);
        });
        
        return Response.json({
          success: true,
          data: fallbackSuggestions,
          cached: true,
          fallback: true, // Indicate these are fallback suggestions
          fallbackDate: fallbackSuggestions[0].suggestion_date,
        });
      }
    } else {
      // Delete existing suggestions if forcing regenerate
      await sql`
        DELETE FROM user_daily_suggestions 
        WHERE user_id = ${userId}::uuid AND date = ${date}
      `;
    }

    // Collect comprehensive user data for personalization
    const [
      userPrefs,
      savedRecipes,
      recentMeals,
      createdRecipes,
      recentSuggestions,
      dislikedRecipes
    ] = await Promise.all([
      // Get user preferences
      sql`
        SELECT 
          diet_type, allergies, dislikes, preferred_cuisines, 
          calorie_goal, experience_level, cooking_skill, cooking_schedule,
          goals, preferred_cooking_time, people_count
        FROM users 
        WHERE id = ${userId}::uuid
      `,
      // Get saved recipes (light summary - titles + tags)
      sql`
        SELECT 
          r.name, r.tags, r.cuisine, r.category
        FROM saved_recipes sr
        JOIN recipes r ON sr.recipe_id = r.id
        WHERE sr.user_id = ${userId}::uuid
        ORDER BY sr.created_at DESC
        LIMIT 20
      `,
      // Get recent meal tracking
      sql`
        SELECT 
          r.name, r.cuisine, r.category, mt.liked, mt.cooked_date,
          (${date}::date - mt.cooked_date) as days_ago
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid 
          AND mt.cooked_date >= ${date}::date - interval '14 days'
        ORDER BY mt.cooked_date DESC
        LIMIT 20
      `,
      // Get recipes user created
      sql`
        SELECT 
          name, tags, cuisine, category
        FROM recipes
        WHERE creator_user_id = ${userId}::uuid
        ORDER BY created_at DESC
        LIMIT 10
      `,
      // Get recent suggestions to avoid repetition
      sql`
        SELECT r.name, r.cuisine, r.category
        FROM user_daily_suggestions uds
        JOIN recipes r ON uds.recipe_id = r.id
        WHERE uds.user_id = ${userId}::uuid 
          AND uds.date >= ${date}::date - interval '7 days'
          AND uds.date < ${date}::date
        ORDER BY uds.date DESC
        LIMIT 30
      `,
      // Get disliked recipes to exclude from suggestions (with details for AI context)
      sql`
        SELECT DISTINCT r.id, r.name, r.cuisine, r.category, r.ingredients, r.tags
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid
          AND mt.liked = false
        LIMIT 20
      `
    ]);

    if (userPrefs.length === 0) {
      return Response.json(
        { success: false, error: "User not found or preferences not set" },
        { status: 404 },
      );
    }

    const preferences = userPrefs[0];
    const saved = savedRecipes.map(r => ({
      name: r.name,
      tags: r.tags || [],
      cuisine: r.cuisine,
      category: r.category,
      title: r.name // alias for compatibility
    }));
    const recent = recentMeals.map(m => ({
      name: m.name,
      cuisine: m.cuisine,
      category: m.category,
      liked: m.liked,
      days_ago: parseInt(m.days_ago) || 0,
      recipe_name: m.name // alias
    }));
    const created = createdRecipes.map(r => ({
      name: r.name,
      tags: r.tags || [],
      cuisine: r.cuisine,
      category: r.category,
      title: r.name // alias
    }));
    const dislikedRecipesList = dislikedRecipes.map(r => ({
      name: r.name,
      cuisine: r.cuisine,
      category: r.category,
      ingredients: r.ingredients,
      tags: r.tags,
    }));

    // Generate AI suggestions
    let generatedRecipes;
    try {
      generatedRecipes = await generateTodaySuggestions(
        preferences,
        saved,
        recent,
        created,
        dislikedRecipesList
      );
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      
      // Before returning error, try to return fallback suggestions
      const fallbackOnError = await sql`
        SELECT 
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, 
          r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition, 
          r.tags, r.average_rating, r.estimated_cost, r.ingredients, r.instructions,
          uds.generated_at, uds.date as suggestion_date
        FROM user_daily_suggestions uds
        JOIN recipes r ON uds.recipe_id = r.id
        LEFT JOIN meal_tracking mt ON mt.user_id = ${userId}::uuid 
          AND mt.recipe_id = r.id 
          AND mt.liked = false
        WHERE uds.user_id = ${userId}::uuid 
          AND uds.date < ${date}::date
          AND uds.date >= ${date}::date - interval '7 days'
          AND mt.id IS NULL
        ORDER BY uds.date DESC
        LIMIT 9
      `;
      
      if (fallbackOnError.length > 0) {
        return Response.json({
          success: true,
          data: fallbackOnError,
          cached: true,
          fallback: true,
          fallbackDate: fallbackOnError[0].suggestion_date,
        });
      }
      
      return Response.json(
        { 
          success: false, 
          error: "Failed to generate suggestions. Please try again later.",
          details: error.message 
        },
        { status: 500 },
      );
    }

    if (!generatedRecipes || generatedRecipes.length === 0) {
      // Before returning error, try to return fallback suggestions
      const fallbackOnEmpty = await sql`
        SELECT 
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, 
          r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition, 
          r.tags, r.average_rating, r.estimated_cost, r.ingredients, r.instructions,
          uds.generated_at, uds.date as suggestion_date
        FROM user_daily_suggestions uds
        JOIN recipes r ON uds.recipe_id = r.id
        LEFT JOIN meal_tracking mt ON mt.user_id = ${userId}::uuid 
          AND mt.recipe_id = r.id 
          AND mt.liked = false
        WHERE uds.user_id = ${userId}::uuid 
          AND uds.date < ${date}::date
          AND uds.date >= ${date}::date - interval '7 days'
          AND mt.id IS NULL
        ORDER BY uds.date DESC
        LIMIT 9
      `;
      
      if (fallbackOnEmpty.length > 0) {
        return Response.json({
          success: true,
          data: fallbackOnEmpty,
          cached: true,
          fallback: true,
          fallbackDate: fallbackOnEmpty[0].suggestion_date,
        });
      }
      
      return Response.json(
        { success: false, error: "No recipes generated" },
        { status: 500 },
      );
    }

    // Save recipes to database and link them
    const savedRecipesList = [];
    const currentDate = new Date().toISOString().split("T")[0];

    for (const recipeData of generatedRecipes) {
      try {
        // No image generation - will use placeholder in frontend
        const imageUrl = null;

        // Save recipe to database
        const savedRecipe = await sql`
          INSERT INTO recipes (
            name, description, category, cuisine, cooking_time, prep_time,
            difficulty, servings, ingredients, instructions, image_url,
            nutrition, tags, estimated_cost, creator_type, creator_user_id,
            average_rating, rating_count
          ) VALUES (
            ${recipeData.name},
            ${recipeData.description || ''},
            ${recipeData.category || 'lunch'},
            ${recipeData.cuisine || 'International'},
            ${recipeData.cooking_time || 30},
            ${recipeData.prep_time || 15},
            ${recipeData.difficulty || 'medium'},
            ${recipeData.servings || 4},
            ${JSON.stringify(recipeData.ingredients || [])},
            ${JSON.stringify(recipeData.instructions || [])},
            ${imageUrl},
            ${JSON.stringify(recipeData.nutrition || {})},
            ${recipeData.tags || []},
            ${recipeData.estimated_cost || 10.0},
            ${'ai'},
            ${userId}::uuid,
            ${4.0}, -- Default rating for AI-generated
            ${0} -- No ratings yet
          ) RETURNING id, name, description, category, cuisine, cooking_time, 
                      prep_time, difficulty, servings, image_url, nutrition, 
                      tags, average_rating, estimated_cost, ingredients, instructions
        `;

        const recipe = savedRecipe[0];

        // Link recipe to user's daily suggestions
        await sql`
          INSERT INTO user_daily_suggestions (user_id, date, recipe_id)
          VALUES (${userId}::uuid, ${date}, ${recipe.id})
          ON CONFLICT (user_id, date, recipe_id) DO NOTHING
        `;

        savedRecipesList.push(recipe);
      } catch (dbError) {
        console.error("Error saving recipe to database:", recipeData.name, dbError);
        // Continue with other recipes even if one fails
      }
    }

    if (savedRecipesList.length === 0) {
      return Response.json(
        { success: false, error: "Failed to save any recipes" },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      data: savedRecipesList,
      cached: false,
    });
  } catch (error) {
    console.error("Error in today-suggestions endpoint:", error);
    return Response.json(
      { success: false, error: "Failed to get today's suggestions" },
      { status: 500 },
    );
  }
}

// POST /api/today-suggestions - Force regenerate suggestions (with rate limiting)
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    const date = new Date().toISOString().split("T")[0];

    // Rate limiting: Check how many times user has regenerated today
    // We'll check the number of unique batches (based on generated_at timestamps)
    const regenerationsCheck = await sql`
      SELECT COUNT(DISTINCT DATE_TRUNC('hour', generated_at)) as batch_count
      FROM user_daily_suggestions
      WHERE user_id = ${userId}::uuid 
        AND date = ${date}
    `;

    const batchCount = parseInt(regenerationsCheck[0]?.batch_count || 0);
    
    // Allow max 2 regenerations per day (initial generation + 2 regenerations = 3 batches max)
    // But since we check before regenerating, we allow up to 2 batches
    if (batchCount >= 2) {
      return Response.json(
        { 
          success: false, 
          error: "You've already regenerated suggestions. Please try again tomorrow.",
          limitReached: true
        },
        { status: 429 },
      );
    }

    // Force regenerate by calling GET with forceRegenerate=true
    const url = new URL(request.url);
    url.searchParams.set("forceRegenerate", "true");
    url.searchParams.set("userId", userId);
    url.searchParams.set("date", date);

    const getRequest = new Request(url.toString(), {
      method: "GET",
      headers: request.headers,
    });

    return GET(getRequest);
  } catch (error) {
    console.error("Error regenerating suggestions:", error);
    return Response.json(
      { success: false, error: "Failed to regenerate suggestions" },
      { status: 500 },
    );
  }
}

