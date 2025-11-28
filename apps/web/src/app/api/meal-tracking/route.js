import sql from "@/app/api/utils/sql";

// POST /api/meal-tracking - Track a meal (liked/disliked/neutral)
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, recipeId, liked, cookedDate } = body;

    if (!userId || !recipeId) {
      return Response.json(
        { success: false, error: "User ID and Recipe ID are required" },
        { status: 400 },
      );
    }

    // Validate recipe exists
    const recipeExists = await sql`
      SELECT id FROM recipes WHERE id = ${recipeId}
    `;

    if (recipeExists.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 },
      );
    }

    // Use provided date or today's date
    const date = cookedDate || new Date().toISOString().split("T")[0];

    // Check if tracking already exists for this recipe and date
    const existingTracking = await sql`
      SELECT id, liked 
      FROM meal_tracking
      WHERE user_id = ${userId}::uuid 
        AND recipe_id = ${recipeId}
        AND cooked_date = ${date}::date
      LIMIT 1
    `;

    let result;

    if (existingTracking.length > 0) {
      // Update existing tracking
      result = await sql`
        UPDATE meal_tracking
        SET liked = ${liked},
            created_at = NOW()
        WHERE id = ${existingTracking[0].id}
        RETURNING *
      `;
    } else {
      // Create new tracking record
      result = await sql`
        INSERT INTO meal_tracking (user_id, recipe_id, cooked_date, liked)
        VALUES (${userId}::uuid, ${recipeId}, ${date}::date, ${liked})
        RETURNING *
      `;
    }

    // If disliked, remove from today's suggestions
    if (liked === false) {
      await sql`
        DELETE FROM user_daily_suggestions
        WHERE user_id = ${userId}::uuid
          AND recipe_id = ${recipeId}
          AND date = ${date}::date
      `;
    }

    return Response.json({
      success: true,
      data: result[0],
      message: liked === false 
        ? "Recipe marked as disliked" 
        : liked === true 
        ? "Recipe marked as liked"
        : "Meal tracking updated",
    });
  } catch (error) {
    console.error("Error tracking meal:", error);
    return Response.json(
      { success: false, error: "Failed to track meal" },
      { status: 500 },
    );
  }
}

// GET /api/meal-tracking - Get user's meal tracking history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const recipeId = searchParams.get("recipeId");
    const days = parseInt(searchParams.get("days") || "30");

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    let query;
    if (recipeId) {
      // Get tracking for specific recipe
      query = sql`
        SELECT 
          mt.*,
          r.name as recipe_name,
          r.cuisine,
          r.category
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid
          AND mt.recipe_id = ${recipeId}
        ORDER BY mt.cooked_date DESC
        LIMIT 1
      `;
    } else {
      // Get recent tracking history
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const dateStr = cutoffDate.toISOString().split("T")[0];

      query = sql`
        SELECT 
          mt.*,
          r.name as recipe_name,
          r.cuisine,
          r.category
        FROM meal_tracking mt
        JOIN recipes r ON mt.recipe_id = r.id
        WHERE mt.user_id = ${userId}::uuid
          AND mt.cooked_date >= ${dateStr}::date
        ORDER BY mt.cooked_date DESC
        LIMIT 100
      `;
    }

    const tracking = await query;

    return Response.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    console.error("Error fetching meal tracking:", error);
    return Response.json(
      { success: false, error: "Failed to fetch meal tracking" },
      { status: 500 },
    );
  }
}

