import sql from "@/app/api/utils/sql";

// GET /api/meal-plans - Get meal plans for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const date = searchParams.get("date");

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    let mealPlans;

    if (startDate && endDate) {
      // Get meal plans for date range
      mealPlans = await sql`
        SELECT 
          mp.id, mp.date, mp.meal_type,
          r.id as recipe_id, r.name as recipe_name, r.cooking_time, r.cuisine,
          r.difficulty, r.estimated_cost, r.average_rating
        FROM meal_plans mp
        JOIN recipes r ON mp.recipe_id = r.id
        WHERE mp.user_id = ${userId}::uuid 
          AND mp.date >= ${startDate}::date 
          AND mp.date <= ${endDate}::date
        ORDER BY mp.date ASC, 
          CASE mp.meal_type 
            WHEN 'breakfast' THEN 1 
            WHEN 'lunch' THEN 2 
            WHEN 'dinner' THEN 3 
            ELSE 4 
          END
      `;
    } else if (date) {
      // Get meal plans for specific date
      mealPlans = await sql`
        SELECT 
          mp.id, mp.date, mp.meal_type,
          r.id as recipe_id, r.name as recipe_name, r.cooking_time, r.cuisine,
          r.difficulty, r.estimated_cost, r.average_rating
        FROM meal_plans mp
        JOIN recipes r ON mp.recipe_id = r.id
        WHERE mp.user_id = ${userId}::uuid 
          AND mp.date = ${date}::date
        ORDER BY CASE mp.meal_type 
          WHEN 'breakfast' THEN 1 
          WHEN 'lunch' THEN 2 
          WHEN 'dinner' THEN 3 
          ELSE 4 
        END
      `;
    } else {
      // Get meal plans for current week
      mealPlans = await sql`
        SELECT 
          mp.id, mp.date, mp.meal_type,
          r.id as recipe_id, r.name as recipe_name, r.cooking_time, r.cuisine,
          r.difficulty, r.estimated_cost, r.average_rating
        FROM meal_plans mp
        JOIN recipes r ON mp.recipe_id = r.id
        WHERE mp.user_id = ${userId}::uuid 
          AND mp.date >= CURRENT_DATE - INTERVAL '7 days'
          AND mp.date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY mp.date ASC, 
          CASE mp.meal_type 
            WHEN 'breakfast' THEN 1 
            WHEN 'lunch' THEN 2 
            WHEN 'dinner' THEN 3 
            ELSE 4 
          END
      `;
    }

    return Response.json({
      success: true,
      data: mealPlans,
    });
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    return Response.json(
      { success: false, error: "Failed to fetch meal plans" },
      { status: 500 },
    );
  }
}

// POST /api/meal-plans - Add a meal to the plan
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, date, mealType, recipeId } = body;

    if (!userId || !date || !mealType || !recipeId) {
      return Response.json(
        {
          success: false,
          error: "User ID, date, meal type, and recipe ID are required",
        },
        { status: 400 },
      );
    }

    // Validate meal type
    const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
    if (!validMealTypes.includes(mealType)) {
      return Response.json(
        { success: false, error: "Invalid meal type" },
        { status: 400 },
      );
    }

    // Check if recipe exists
    const recipeExists = await sql`
      SELECT id FROM recipes WHERE id = ${recipeId}
    `;

    if (recipeExists.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 },
      );
    }

    // Check if meal plan already exists for this date and meal type
    const existingPlan = await sql`
      SELECT id FROM meal_plans 
      WHERE user_id = ${userId}::uuid 
        AND date = ${date}::date 
        AND meal_type = ${mealType}
    `;

    if (existingPlan.length > 0) {
      // Update existing plan
      const updatedPlan = await sql`
        UPDATE meal_plans 
        SET recipe_id = ${recipeId}
        WHERE user_id = ${userId}::uuid 
          AND date = ${date}::date 
          AND meal_type = ${mealType}
        RETURNING *
      `;

      return Response.json({
        success: true,
        data: updatedPlan[0],
        message: "Meal plan updated successfully",
      });
    } else {
      // Create new meal plan
      const newPlan = await sql`
        INSERT INTO meal_plans (user_id, date, meal_type, recipe_id)
        VALUES (${userId}::uuid, ${date}::date, ${mealType}, ${recipeId})
        RETURNING *
      `;

      return Response.json(
        {
          success: true,
          data: newPlan[0],
          message: "Meal added to plan successfully",
        },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error("Error creating/updating meal plan:", error);
    return Response.json(
      { success: false, error: "Failed to save meal plan" },
      { status: 500 },
    );
  }
}

// DELETE /api/meal-plans - Remove a meal from the plan
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");
    const mealType = searchParams.get("mealType");
    const id = searchParams.get("id");

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 },
      );
    }

    let result;

    if (id) {
      // Delete by meal plan ID
      result = await sql`
        DELETE FROM meal_plans 
        WHERE id = ${id} AND user_id = ${userId}::uuid
        RETURNING *
      `;
    } else if (date && mealType) {
      // Delete by date and meal type
      result = await sql`
        DELETE FROM meal_plans 
        WHERE user_id = ${userId}::uuid 
          AND date = ${date}::date 
          AND meal_type = ${mealType}
        RETURNING *
      `;
    } else {
      return Response.json(
        {
          success: false,
          error: "Either meal plan ID or (date and meal type) are required",
        },
        { status: 400 },
      );
    }

    if (result.length === 0) {
      return Response.json(
        { success: false, error: "Meal plan not found" },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      message: "Meal removed from plan successfully",
    });
  } catch (error) {
    console.error("Error removing meal plan:", error);
    return Response.json(
      { success: false, error: "Failed to remove meal plan" },
      { status: 500 },
    );
  }
}

