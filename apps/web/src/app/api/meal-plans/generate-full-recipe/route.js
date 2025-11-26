import sql from "@/app/api/utils/sql";
import { generateRecipeInstructionsWithGPT } from "@/app/api/utils/openai";

// POST /api/meal-plans/generate-full-recipe - Generate full recipe with instructions
export async function POST(request) {
  try {
    const body = await request.json();
    const { suggestionId, userId, date, mealType, suggestionOrder } = body;

    let suggestion;

    if (suggestionId) {
      // Fetch by suggestion ID
      const result = await sql`
        SELECT * FROM meal_plan_suggestions
        WHERE id = ${suggestionId}
          ${userId ? sql`AND user_id = ${userId}::uuid` : sql``}
      `;
      if (result.length === 0) {
        return Response.json(
          { success: false, error: "Suggestion not found" },
          { status: 404 }
        );
      }
      suggestion = result[0];
    } else if (userId && date && mealType && suggestionOrder) {
      // Fetch by user, date, meal type, and order
      const result = await sql`
        SELECT * FROM meal_plan_suggestions
        WHERE user_id = ${userId}::uuid
          AND date = ${date}::date
          AND meal_type = ${mealType}
          AND suggestion_order = ${suggestionOrder}
      `;
      if (result.length === 0) {
        return Response.json(
          { success: false, error: "Suggestion not found" },
          { status: 404 }
        );
      }
      suggestion = result[0];
    } else {
      return Response.json(
        { success: false, error: "Invalid parameters. Provide either suggestionId or (userId, date, mealType, suggestionOrder)" },
        { status: 400 }
      );
    }

    // If full recipe already generated, return existing recipe
    if (suggestion.is_full_recipe_generated && suggestion.recipe_id) {
      const existingRecipe = await sql`
        SELECT * FROM recipes WHERE id = ${suggestion.recipe_id}
      `;
      if (existingRecipe.length > 0) {
        return Response.json({
          success: true,
          recipe: existingRecipe[0],
          fromCache: true,
        });
      }
    }

    // Fetch user preferences for context
    const userPrefs = await sql`
      SELECT 
        diet_type, allergies, dislikes, preferred_cuisines,
        goals, cooking_skill, preferred_cooking_time, people_count, experience_level
      FROM users
      WHERE id = ${suggestion.user_id}::uuid
    `;

    const preferences = userPrefs.length > 0 ? {
      dietType: userPrefs[0].diet_type?.[0] || (Array.isArray(userPrefs[0].diet_type) ? userPrefs[0].diet_type[0] : userPrefs[0].diet_type) || null,
      allergies: userPrefs[0].allergies || [],
      dislikedIngredients: userPrefs[0].dislikes || [],
      favoriteCuisines: userPrefs[0].preferred_cuisines || [],
      goals: userPrefs[0].goals || [],
      cookingSkill: userPrefs[0].cooking_skill || userPrefs[0].experience_level || "beginner",
      preferredCookingTime: userPrefs[0].preferred_cooking_time || "15_30",
      peopleCount: userPrefs[0].people_count || 1,
    } : null;

    // Prepare existing metadata
    const existingMetadata = {
      description: suggestion.recipe_description || "",
      ingredients: suggestion.ingredients || [],
      nutrition: suggestion.nutrition || {},
      cooking_time: suggestion.cooking_time || 30,
      prep_time: suggestion.prep_time || 15,
      cuisine: suggestion.cuisine || "International",
      category: suggestion.category || suggestion.meal_type,
      difficulty: suggestion.difficulty || "medium",
      servings: suggestion.servings || 4,
      estimated_cost: suggestion.estimated_cost || 10.0,
    };

    // Generate full recipe instructions
    const fullRecipe = await generateRecipeInstructionsWithGPT(
      suggestion.recipe_name,
      existingMetadata,
      preferences
    );

    // Save full recipe to recipes table
    const savedRecipe = await sql`
      INSERT INTO recipes (
        name, description, category, cuisine, cooking_time, prep_time,
        difficulty, servings, ingredients, instructions, nutrition,
        tags, creator_type, estimated_cost, image_url
      ) VALUES (
        ${fullRecipe.name || suggestion.recipe_name},
        ${fullRecipe.description || suggestion.recipe_description || ""},
        ${fullRecipe.category || suggestion.category || suggestion.meal_type},
        ${fullRecipe.cuisine || suggestion.cuisine || "International"},
        ${fullRecipe.cooking_time || suggestion.cooking_time || 30},
        ${fullRecipe.prep_time || suggestion.prep_time || 15},
        ${fullRecipe.difficulty || suggestion.difficulty || "medium"},
        ${fullRecipe.servings || suggestion.servings || 4},
        ${JSON.stringify(fullRecipe.ingredients || suggestion.ingredients || [])},
        ${JSON.stringify(fullRecipe.instructions || [])},
        ${JSON.stringify(fullRecipe.nutrition || suggestion.nutrition || {})},
        ${JSON.stringify(["ai-generated", "meal-plan"])},
        ${"ai"},
        ${fullRecipe.estimated_cost || suggestion.estimated_cost || 10.0},
        ${null} -- Placeholder image
      ) RETURNING *
    `;

    const recipe = savedRecipe[0];

    // Update suggestion to link to full recipe
    await sql`
      UPDATE meal_plan_suggestions
      SET recipe_id = ${recipe.id},
          is_full_recipe_generated = true,
          updated_at = NOW()
      WHERE id = ${suggestion.id}
    `;

    return Response.json({
      success: true,
      recipe,
      fromCache: false,
    });
  } catch (error) {
    console.error("Error generating full recipe:", error);
    return Response.json(
      { success: false, error: "Failed to generate full recipe: " + error.message },
      { status: 500 }
    );
  }
}

