import sql from "../../utils/sql.js";
import { generateRecipeMetadataWithGPT } from "../../utils/openai.js";

// POST /api/meal-plans/generate - Generate 14-day meal plan (metadata only)
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if meal_plan_suggestions table exists
    try {
      await sql`SELECT 1 FROM meal_plan_suggestions LIMIT 1`;
    } catch (tableError) {
      console.error("meal_plan_suggestions table does not exist:", tableError);
      return Response.json(
        { 
          success: false, 
          error: "Database table not found. Please run the migration: database/migrations/add_meal_plan_suggestions.sql" 
        },
        { status: 500 }
      );
    }

    // Fetch user preferences
    const userPrefs = await sql`
      SELECT 
        diet_type, allergies, dislikes, preferred_cuisines,
        goals, cooking_skill, preferred_cooking_time, people_count, experience_level
      FROM users
      WHERE id = ${userId}::uuid
    `;

    if (userPrefs.length === 0) {
      return Response.json(
        { success: false, error: "User preferences not found. Please complete onboarding first." },
        { status: 404 }
      );
    }

    console.log("User preferences found:", {
      hasDietType: !!userPrefs[0].diet_type,
      allergiesCount: userPrefs[0].allergies?.length || 0,
      cuisinesCount: userPrefs[0].preferred_cuisines?.length || 0,
    });

    const prefs = userPrefs[0];
    const preferences = {
      dietType: prefs.diet_type?.[0] || (Array.isArray(prefs.diet_type) ? prefs.diet_type[0] : prefs.diet_type) || null,
      allergies: prefs.allergies || [],
      dislikedIngredients: prefs.dislikes || [],
      favoriteCuisines: prefs.preferred_cuisines || [],
      goals: prefs.goals || [],
      cookingSkill: prefs.cooking_skill || prefs.experience_level || "beginner",
      preferredCookingTime: prefs.preferred_cooking_time || "15_30",
      peopleCount: prefs.people_count || 1,
    };

    // Calculate date range (next 14 days from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 13); // 14 days total (today + 13 more)

    const mealTypes = ["breakfast", "lunch", "dinner"];
    let generatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    console.log("Starting meal plan generation for 14 days...");

    // Generate suggestions for each day and meal
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      const dateStr = currentDate.toISOString().split("T")[0];

      for (const mealType of mealTypes) {
        // Generate 3 suggestions for this meal
        for (let order = 1; order <= 3; order++) {
          try {
            // Check if suggestion already exists
            const existing = await sql`
              SELECT id FROM meal_plan_suggestions
              WHERE user_id = ${userId}::uuid
                AND date = ${dateStr}::date
                AND meal_type = ${mealType}
                AND suggestion_order = ${order}
            `;

            if (existing.length > 0) {
              skippedCount++;
              continue; // Skip if already exists
            }

            // Generate recipe metadata (no instructions)
            console.log(`Generating ${mealType} #${order} for ${dateStr}...`);
            const recipeMetadata = await generateRecipeMetadataWithGPT(
              mealType,
              currentDate,
              preferences,
              order
            );

            if (!recipeMetadata || !recipeMetadata.name) {
              throw new Error("Invalid recipe metadata returned from OpenAI");
            }

            // Save to database
            await sql`
              INSERT INTO meal_plan_suggestions (
                user_id, date, meal_type, suggestion_order,
                recipe_name, recipe_description, ingredients, nutrition,
                cooking_time, prep_time, cuisine, category, difficulty,
                servings, estimated_cost
              ) VALUES (
                ${userId}::uuid,
                ${dateStr}::date,
                ${mealType},
                ${order},
                ${recipeMetadata.name},
                ${recipeMetadata.description || ""},
                ${JSON.stringify(recipeMetadata.ingredients || [])},
                ${JSON.stringify(recipeMetadata.nutrition || {})},
                ${recipeMetadata.cooking_time || 30},
                ${recipeMetadata.prep_time || 15},
                ${recipeMetadata.cuisine || "International"},
                ${recipeMetadata.category || mealType},
                ${recipeMetadata.difficulty || "medium"},
                ${recipeMetadata.servings || 4},
                ${recipeMetadata.estimated_cost || 10.0}
              )
            `;

            generatedCount++;
            if (generatedCount % 10 === 0) {
              console.log(`Progress: ${generatedCount} suggestions generated...`);
            }
          } catch (error) {
            console.error(
              `Error generating suggestion for ${dateStr} ${mealType} #${order}:`,
              error.message,
              error.stack
            );
            errors.push({
              date: dateStr,
              mealType,
              order,
              error: error.message,
            });
          }
        }
      }
    }

    console.log(`Generation complete: ${generatedCount} generated, ${skippedCount} skipped, ${errors.length} errors`);

    // If no suggestions were generated and no errors, likely all already exist
    if (generatedCount === 0 && errors.length === 0) {
      return Response.json({
        success: true,
        message: "All meal suggestions already exist for the next 14 days",
        generatedCount: 0,
        skippedCount,
        totalExpected: 126,
        note: "All 126 suggestions already exist. Delete existing suggestions to regenerate.",
      });
    }

    // If errors occurred, include them in response
    if (errors.length > 0) {
      console.error(`Generation completed with ${errors.length} errors:`, errors.slice(0, 5));
    }

    return Response.json({
      success: true,
      message: `Generated ${generatedCount} meal suggestions${skippedCount > 0 ? ` (${skippedCount} already existed)` : ""}`,
      generatedCount,
      skippedCount,
      totalExpected: 126, // 14 days × 3 meals × 3 suggestions
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit to first 10 errors
      errorCount: errors.length,
    });
  } catch (error) {
    console.error("Error generating meal plan:", error);
    return Response.json(
      { success: false, error: "Failed to generate meal plan: " + error.message },
      { status: 500 }
    );
  }
}

