import sql from "@/app/api/utils/sql";
import { getRecipeRecommendation } from "@/app/api/utils/openai";

// GET /api/recommendations - Get daily recommendations for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    // Check if recommendations already exist for this date
    const existingRecommendations = await sql`
      SELECT 
        dr.*,
        r.name, r.description, r.image_url, r.cooking_time, r.difficulty,
        r.cuisine, r.category, r.nutrition, r.average_rating, r.estimated_cost
      FROM daily_recommendations dr
      JOIN recipes r ON dr.recommended_recipe_id = r.id
      WHERE dr.user_id = ${userId}::uuid AND dr.date = ${date}
    `;

    if (existingRecommendations.length > 0) {
      const recommendation = existingRecommendations[0];

      // Get alternative recipes
      const alternatives = await sql`
        SELECT id, name, description, image_url, cooking_time, difficulty,
               cuisine, category, nutrition, average_rating, estimated_cost
        FROM recipes
        WHERE id = ANY(${recommendation.alternative_recipe_ids || []})
        ORDER BY average_rating DESC
      `;

      return Response.json({
        success: true,
        data: {
          recommendation: {
            id: recommendation.id,
            recipe: {
              id: recommendation.recommended_recipe_id,
              name: recommendation.name,
              description: recommendation.description,
              image_url: recommendation.image_url,
              cooking_time: recommendation.cooking_time,
              difficulty: recommendation.difficulty,
              cuisine: recommendation.cuisine,
              category: recommendation.category,
              nutrition: recommendation.nutrition,
              average_rating: recommendation.average_rating,
              estimated_cost: recommendation.estimated_cost,
            },
            reason: recommendation.reason,
            alternatives: alternatives,
            presented: recommendation.presented,
            accepted: recommendation.accepted,
            date: recommendation.date,
          },
        },
      });
    }

    // Generate new AI-powered recommendations
    const [user, recentMeals, availableRecipes] = await sql.transaction([
      sql`
        SELECT diet_type, allergies, dislikes, preferred_cuisines, 
               calorie_goal, experience_level, cooking_schedule, name
        FROM users 
        WHERE id = ${userId}::uuid
      `,
      sql`
        SELECT r.name, r.cuisine, r.category, mt.liked, mt.cooked_date,
               EXTRACT(days FROM (${date}::date - mt.cooked_date)) as days_ago
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid 
          AND mt.cooked_date >= ${date}::date - interval '14 days'
        ORDER BY mt.cooked_date DESC
        LIMIT 15
      `,
      sql`
        SELECT id, name, description, cuisine, category, cooking_time, 
               difficulty, average_rating, tags, nutrition, estimated_cost
        FROM recipes 
        WHERE average_rating >= 4.0
        ORDER BY rating_count DESC, average_rating DESC
        LIMIT 30
      `,
    ]);

    if (user.length === 0) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const userPrefs = user[0];
    const recentMealHistory = recentMeals;
    const candidateRecipes = availableRecipes;

    // Determine meal type based on time of day
    const currentHour = new Date().getHours();
    let mealType = "dinner";
    if (currentHour < 11) mealType = "breakfast";
    else if (currentHour < 16) mealType = "lunch";

    // Use OpenAI to generate personalized recommendation
    let aiRecommendation;
    try {
      aiRecommendation = await getRecipeRecommendation(
        userPrefs,
        recentMealHistory,
        candidateRecipes,
        mealType
      );

      // Validate that recommended recipe exists
      if (
        !candidateRecipes.find(
          (r) => r.id === aiRecommendation.recommended_recipe_id,
        )
      ) {
        throw new Error("AI recommended invalid recipe ID");
      }

      // Validate alternative IDs
      aiRecommendation.alternative_recipe_ids =
        aiRecommendation.alternative_recipe_ids.filter((id) =>
          candidateRecipes.find((r) => r.id === id),
        );
    } catch (error) {
      console.error("Error getting AI recommendation:", error);
      aiRecommendation = null;
    }

    // Fallback to rule-based recommendation if AI fails
    if (!aiRecommendation) {
      console.log("Using fallback recommendation logic");

      // Filter candidates based on user preferences
      let filteredRecipes = candidateRecipes.filter((recipe) => {
        // Avoid recently eaten similar recipes
        const recentlyCookedSimilar = recentMealHistory.some(
          (meal) =>
            meal.name === recipe.name ||
            (meal.cuisine === recipe.cuisine &&
              meal.category === recipe.category &&
              meal.days_ago < 7),
        );
        if (recentlyCookedSimilar) return false;

        // Match experience level
        if (
          userPrefs.experience_level === "beginner" &&
          (recipe.difficulty !== "easy" || recipe.cooking_time > 30)
        ) {
          return false;
        }

        // Dietary restrictions
        if (userPrefs.diet_type) {
          const hasCompatibleTags = userPrefs.diet_type.some(
            (diet) =>
              recipe.tags?.includes(diet) ||
              (diet === "vegetarian" && !recipe.tags?.includes("meat")),
          );
          if (!hasCompatibleTags) return false;
        }

        return true;
      });

      if (filteredRecipes.length === 0) {
        filteredRecipes = candidateRecipes.slice(0, 5); // Fallback to top recipes
      }

      const recommendedRecipe = filteredRecipes[0];
      const alternatives = filteredRecipes.slice(1, 4);

      aiRecommendation = {
        recommended_recipe_id: recommendedRecipe.id,
        reason: `Perfect for ${mealType} - this ${recommendedRecipe.cuisine} ${recommendedRecipe.category} is ${recommendedRecipe.difficulty} to make and highly rated by our community!`,
        alternative_recipe_ids: alternatives.map((r) => r.id),
        confidence: 0.7,
        meal_type: mealType,
      };
    }

    // Get full recipe details
    const [recommendedRecipe, alternativeRecipes] = await sql.transaction([
      sql`
        SELECT id, name, description, image_url, cooking_time, difficulty,
               cuisine, category, nutrition, average_rating, estimated_cost
        FROM recipes WHERE id = ${aiRecommendation.recommended_recipe_id}
      `,
      sql`
        SELECT id, name, description, image_url, cooking_time, difficulty,
               cuisine, category, nutrition, average_rating, estimated_cost
        FROM recipes 
        WHERE id = ANY(${aiRecommendation.alternative_recipe_ids})
        ORDER BY average_rating DESC
      `,
    ]);

    // Save the AI recommendation
    const savedRecommendation = await sql`
      INSERT INTO daily_recommendations (
        user_id, date, recommended_recipe_id, alternative_recipe_ids, reason
      ) VALUES (
        ${userId}::uuid, ${date}, ${aiRecommendation.recommended_recipe_id}, 
        ${aiRecommendation.alternative_recipe_ids}, ${aiRecommendation.reason}
      ) RETURNING *
    `;

    return Response.json({
      success: true,
      data: {
        recommendation: {
          id: savedRecommendation[0].id,
          recipe: recommendedRecipe[0],
          reason: aiRecommendation.reason,
          alternatives: alternativeRecipes,
          presented: false,
          accepted: false,
          date: date,
        },
      },
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return Response.json(
      { success: false, error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }
}

// PUT /api/recommendations - Accept a recommendation
export async function PUT(request) {
  try {
    const body = await request.json();
    const { recommendationId, accepted = true } = body;

    if (!recommendationId) {
      return Response.json(
        { success: false, error: "Recommendation ID is required" },
        { status: 400 },
      );
    }

    const result = await sql`
      UPDATE daily_recommendations 
      SET accepted = ${accepted}, presented = true
      WHERE id = ${recommendationId}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json(
        { success: false, error: "Recommendation not found" },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      data: result[0],
      message: accepted ? "Recommendation accepted" : "Recommendation declined",
    });
  } catch (error) {
    console.error("Error updating recommendation:", error);
    return Response.json(
      { success: false, error: "Failed to update recommendation" },
      { status: 500 },
    );
  }
}

