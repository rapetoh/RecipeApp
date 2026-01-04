import sql from "@/app/api/utils/sql";

// GET /api/recipe-favorites - Get user's favorited recipes
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

    console.log("Fetching favorited recipes for user:", userId, "with search:", search);

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

    let favoritedRecipes;
    let total;

    if (search) {
      const searchPattern = `%${search}%`;
      favoritedRecipes = await sql`
        SELECT 
          rf.id as favorite_id, rf.created_at as favorited_at,
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, 
          r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition,
          r.tags, r.average_rating, r.rating_count, r.estimated_cost
        FROM recipe_favorites rf
        JOIN recipes r ON rf.recipe_id = r.id
        WHERE rf.user_id = ${userId}::uuid
        AND (
          LOWER(r.name) LIKE LOWER(${searchPattern}) OR 
          LOWER(r.description) LIKE LOWER(${searchPattern}) OR
          LOWER(r.cuisine) LIKE LOWER(${searchPattern})
        )
        ORDER BY rf.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM recipe_favorites rf
        JOIN recipes r ON rf.recipe_id = r.id
        WHERE rf.user_id = ${userId}::uuid
        AND (
          LOWER(r.name) LIKE LOWER(${searchPattern}) OR 
          LOWER(r.description) LIKE LOWER(${searchPattern}) OR
          LOWER(r.cuisine) LIKE LOWER(${searchPattern})
        )
      `;
      total = parseInt(countResult[0].total);
    } else {
      favoritedRecipes = await sql`
        SELECT 
          rf.id as favorite_id, rf.created_at as favorited_at,
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, 
          r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition,
          r.tags, r.average_rating, r.rating_count, r.estimated_cost
        FROM recipe_favorites rf
        JOIN recipes r ON rf.recipe_id = r.id
        WHERE rf.user_id = ${userId}::uuid
        ORDER BY rf.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as total 
        FROM recipe_favorites 
        WHERE user_id = ${userId}::uuid
      `;
      total = parseInt(countResult[0].total);
    }

    console.log(
      `Found ${favoritedRecipes.length} favorited recipes for user ${userId}`,
    );

    return Response.json({
      success: true,
      data: favoritedRecipes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching favorited recipes:", error);
    return Response.json(
      { success: false, error: "Failed to fetch favorited recipes" },
      { status: 500 },
    );
  }
}

// POST /api/recipe-favorites - Favorite a recipe
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

    console.log(`Favoriting recipe ${recipeId} for user ${userId}`);

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

    // Insert into recipe_favorites
    try {
      const result = await sql`
        INSERT INTO recipe_favorites (user_id, recipe_id, created_at)
        VALUES (${userId}::uuid, ${recipeId}, NOW())
        RETURNING *
      `;

      // Add to Favorites collection
      try {
        const favoritesCollection = await sql`
          SELECT id FROM recipe_collections
          WHERE user_id = ${userId}::uuid AND system_type = 'favorites'
          LIMIT 1
        `;
        
        if (favoritesCollection.length > 0) {
          await sql`
            INSERT INTO collection_recipes (collection_id, recipe_id, added_at)
            VALUES (${favoritesCollection[0].id}, ${recipeId}, NOW())
            ON CONFLICT (collection_id, recipe_id) DO NOTHING
          `;
          
          // Update collection recipe_count
          await sql`
            UPDATE recipe_collections
            SET recipe_count = (SELECT COUNT(*) FROM collection_recipes WHERE collection_id = ${favoritesCollection[0].id})
            WHERE id = ${favoritesCollection[0].id}
          `;
        }
      } catch (collectionError) {
        console.log("Error adding to Favorites collection:", collectionError.message);
      }

      console.log("Successfully favorited recipe:", result[0]);

      return Response.json(
        {
          success: true,
          data: result[0],
          message: "Recipe favorited successfully",
        },
        { status: 201 },
      );
    } catch (insertError) {
      if (insertError.code === "23505") {
        // Unique constraint violation - already favorited
        return Response.json(
          { success: true, message: "Recipe already favorited" },
          { status: 200 },
        );
      }
      throw insertError;
    }
  } catch (error) {
    console.error("Error favoriting recipe:", error);
    return Response.json(
      { success: false, error: "Failed to favorite recipe" },
      { status: 500 },
    );
  }
}

// DELETE /api/recipe-favorites - Unfavorite a recipe
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

    console.log(`Unfavoriting recipe ${recipeId} for user ${userId}`);

    // Delete from recipe_favorites
    const result = await sql`
      DELETE FROM recipe_favorites 
      WHERE user_id = ${userId}::uuid AND recipe_id = ${recipeId}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json(
        { success: false, error: "Favorited recipe not found" },
        { status: 404 },
      );
    }

    // Remove from Favorites collection
    try {
      const favoritesCollection = await sql`
        SELECT id FROM recipe_collections
        WHERE user_id = ${userId}::uuid AND system_type = 'favorites'
        LIMIT 1
      `;
      
      if (favoritesCollection.length > 0) {
        await sql`
          DELETE FROM collection_recipes
          WHERE collection_id = ${favoritesCollection[0].id} AND recipe_id = ${recipeId}
        `;
        
        // Update collection recipe_count
        await sql`
          UPDATE recipe_collections
          SET recipe_count = (SELECT COUNT(*) FROM collection_recipes WHERE collection_id = ${favoritesCollection[0].id})
          WHERE id = ${favoritesCollection[0].id}
        `;
      }
    } catch (collectionError) {
      console.log("Error removing from Favorites collection:", collectionError.message);
    }

    console.log("Successfully unfavorited recipe");

    return Response.json({
      success: true,
      message: "Recipe unfavorited successfully",
    });
  } catch (error) {
    console.error("Error unfavoriting recipe:", error);
    return Response.json(
      { success: false, error: "Failed to unfavorite recipe" },
      { status: 500 },
    );
  }
}

