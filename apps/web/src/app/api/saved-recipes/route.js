import sql from "../utils/sql.js";

// GET /api/saved-recipes - Get user's saved recipes
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 401 },
      );
    }

    console.log("Fetching saved recipes for user:", userId, "with search:", search);

    // Try to find user first to validate
    const userExists = await sql`
      SELECT id FROM auth_users WHERE id = ${userId}::uuid
    `;

    if (userExists.length === 0) {
      console.log("User not found in auth_users:", userId);
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    let savedRecipes;
    let total;

    if (search) {
      const searchPattern = `%${search}%`;
      savedRecipes = await sql`
        SELECT 
          sr.id as saved_id, sr.created_at as saved_at,
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, 
          r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition,
          r.tags, r.average_rating, r.rating_count, r.estimated_cost
        FROM saved_recipes sr
        JOIN recipes r ON sr.recipe_id = r.id
        WHERE sr.user_id = ${userId}::uuid
        AND (
          LOWER(r.name) LIKE LOWER(${searchPattern}) OR 
          LOWER(r.description) LIKE LOWER(${searchPattern}) OR
          LOWER(r.cuisine) LIKE LOWER(${searchPattern})
        )
        ORDER BY sr.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM saved_recipes sr
        JOIN recipes r ON sr.recipe_id = r.id
        WHERE sr.user_id = ${userId}::uuid
        AND (
          LOWER(r.name) LIKE LOWER(${searchPattern}) OR 
          LOWER(r.description) LIKE LOWER(${searchPattern}) OR
          LOWER(r.cuisine) LIKE LOWER(${searchPattern})
        )
      `;
      total = parseInt(countResult[0].total);
    } else {
      savedRecipes = await sql`
        SELECT 
          sr.id as saved_id, sr.created_at as saved_at,
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, 
          r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition,
          r.tags, r.average_rating, r.rating_count, r.estimated_cost
        FROM saved_recipes sr
        JOIN recipes r ON sr.recipe_id = r.id
        WHERE sr.user_id = ${userId}::uuid
        ORDER BY sr.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM saved_recipes 
        WHERE user_id = ${userId}::uuid
      `;
      total = parseInt(countResult[0].total);
    }

    console.log(
      `Found ${savedRecipes.length} saved recipes for user ${userId}`,
    );

    return Response.json({
      success: true,
      data: savedRecipes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching saved recipes:", error);
    return Response.json(
      { success: false, error: "Failed to fetch saved recipes" },
      { status: 500 },
    );
  }
}

// POST /api/saved-recipes - Save a recipe
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, recipeId } = body;

    if (!userId || !recipeId) {
      return Response.json(
        {
          success: false,
          error: "User ID and Recipe ID are required",
        },
        { status: 400 },
      );
    }

    console.log(`Saving recipe ${recipeId} for user ${userId}`);

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

    // Try to insert, handle duplicate key error
    try {
      const result = await sql`
        INSERT INTO saved_recipes (user_id, recipe_id)
        VALUES (${userId}::uuid, ${recipeId})
        RETURNING *
      `;

      console.log("Successfully saved recipe:", result[0]);

      return Response.json(
        {
          success: true,
          data: result[0],
          message: "Recipe saved successfully",
        },
        { status: 201 },
      );
    } catch (insertError) {
      if (insertError.code === "23505") {
        // Unique constraint violation - already saved
        return Response.json(
          { success: true, message: "Recipe already saved" },
          { status: 200 },
        );
      }
      throw insertError;
    }
  } catch (error) {
    console.error("Error saving recipe:", error);
    return Response.json(
      { success: false, error: "Failed to save recipe" },
      { status: 500 },
    );
  }
}

// DELETE /api/saved-recipes - Remove saved recipe
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const recipeId = searchParams.get("recipeId");

    if (!userId || !recipeId) {
      return Response.json(
        {
          success: false,
          error: "User ID and Recipe ID are required",
        },
        { status: 400 },
      );
    }

    console.log(`Removing saved recipe ${recipeId} for user ${userId}`);

    const result = await sql`
      DELETE FROM saved_recipes 
      WHERE user_id = ${userId}::uuid AND recipe_id = ${recipeId}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json(
        { success: false, error: "Saved recipe not found" },
        { status: 404 },
      );
    }

    console.log("Successfully removed saved recipe");

    return Response.json({
      success: true,
      message: "Recipe removed from saved list",
    });
  } catch (error) {
    console.error("Error removing saved recipe:", error);
    return Response.json(
      { success: false, error: "Failed to remove saved recipe" },
      { status: 500 },
    );
  }
}

