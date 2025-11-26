import sql from "@/app/api/utils/sql";

// GET /api/meal-plans/suggestions - Get meal plan suggestions for a user
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
        { status: 400 }
      );
    }

    let suggestions;

    if (date) {
      // Get suggestions for specific date
      suggestions = await sql`
        SELECT 
          mps.*,
          r.id as full_recipe_id,
          r.instructions as full_recipe_instructions
        FROM meal_plan_suggestions mps
        LEFT JOIN recipes r ON mps.recipe_id = r.id
        WHERE mps.user_id = ${userId}::uuid
          AND mps.date = ${date}::date
        ORDER BY 
          CASE mps.meal_type 
            WHEN 'breakfast' THEN 1 
            WHEN 'lunch' THEN 2 
            WHEN 'dinner' THEN 3 
          END,
          mps.suggestion_order
      `;
    } else if (startDate && endDate) {
      // Get suggestions for date range
      suggestions = await sql`
        SELECT 
          mps.*,
          r.id as full_recipe_id,
          r.instructions as full_recipe_instructions
        FROM meal_plan_suggestions mps
        LEFT JOIN recipes r ON mps.recipe_id = r.id
        WHERE mps.user_id = ${userId}::uuid
          AND mps.date >= ${startDate}::date
          AND mps.date <= ${endDate}::date
        ORDER BY 
          mps.date ASC, 
          CASE mps.meal_type 
            WHEN 'breakfast' THEN 1 
            WHEN 'lunch' THEN 2 
            WHEN 'dinner' THEN 3 
          END,
          mps.suggestion_order
      `;
    } else {
      return Response.json(
        { success: false, error: "Date or date range (startDate, endDate) is required" },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error("Error fetching meal plan suggestions:", error);
    return Response.json(
      { success: false, error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

