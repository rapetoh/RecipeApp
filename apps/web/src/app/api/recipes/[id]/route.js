import sql from "../../utils/sql.js";

// GET /api/recipes/[id] - Get single recipe by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const recipes = await sql`
      SELECT 
        id, name, description, category, cuisine, cooking_time, prep_time,
        difficulty, servings, ingredients, instructions, image_url, video_url,
        nutrition, allergens, tags, average_rating, rating_count, estimated_cost,
        is_featured, creator_type, creator_user_id, created_at, updated_at
      FROM recipes 
      WHERE id = ${parseInt(id)}
    `;

    if (recipes.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 },
      );
    }

    let recipe = recipes[0];
    
    // Check if recipe is favorited for the user if userId is provided
    if (userId) {
      const favoritedRecipe = await sql`
        SELECT id FROM recipe_favorites 
        WHERE user_id = ${userId}::uuid AND recipe_id = ${parseInt(id)}
        LIMIT 1
      `;
      recipe = {
        ...recipe,
        is_saved: favoritedRecipe.length > 0,
      };
    } else {
      recipe = {
        ...recipe,
        is_saved: false,
      };
    }

    return Response.json({
      success: true,
      data: recipe,
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return Response.json(
      { success: false, error: "Failed to fetch recipe" },
      { status: 500 },
    );
  }
}

// PUT /api/recipes/[id] - Update recipe
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const recipeId = parseInt(id);

    // Get current recipe
    const currentRecipe = await sql`
      SELECT * FROM recipes WHERE id = ${recipeId}
    `;

    if (currentRecipe.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 },
      );
    }

    const current = currentRecipe[0];

    // Update with provided values or keep current values
    const result = await sql`
      UPDATE recipes 
      SET 
        name = ${body.name !== undefined ? body.name : current.name},
        description = ${body.description !== undefined ? body.description : current.description},
        category = ${body.category !== undefined ? body.category : current.category},
        cuisine = ${body.cuisine !== undefined ? body.cuisine : current.cuisine},
        cooking_time = ${body.cooking_time !== undefined ? body.cooking_time : current.cooking_time},
        prep_time = ${body.prep_time !== undefined ? body.prep_time : current.prep_time},
        difficulty = ${body.difficulty !== undefined ? body.difficulty : current.difficulty},
        servings = ${body.servings !== undefined ? body.servings : current.servings},
        ingredients = ${body.ingredients !== undefined ? JSON.stringify(body.ingredients) : JSON.stringify(current.ingredients)}::jsonb,
        instructions = ${body.instructions !== undefined ? JSON.stringify(body.instructions) : JSON.stringify(current.instructions)}::jsonb,
        image_url = ${body.image_url !== undefined ? body.image_url : current.image_url},
        video_url = ${body.video_url !== undefined ? body.video_url : current.video_url},
        nutrition = ${body.nutrition !== undefined ? JSON.stringify(body.nutrition) : JSON.stringify(current.nutrition)}::jsonb,
        allergens = ${body.allergens !== undefined ? body.allergens : current.allergens},
        tags = ${body.tags !== undefined ? body.tags : current.tags},
        estimated_cost = ${body.estimated_cost !== undefined ? body.estimated_cost : current.estimated_cost},
        updated_at = NOW()
      WHERE id = ${recipeId}
      RETURNING *
    `;

    return Response.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error updating recipe:", error);
    return Response.json(
      { success: false, error: "Failed to update recipe" },
      { status: 500 },
    );
  }
}

// DELETE /api/recipes/[id] - Delete recipe
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const result = await sql`
      DELETE FROM recipes 
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      message: "Recipe deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return Response.json(
      { success: false, error: "Failed to delete recipe" },
      { status: 500 },
    );
  }
}
