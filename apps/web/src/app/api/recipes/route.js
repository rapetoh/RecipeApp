import sql from "../utils/sql.js";

// GET /api/recipes - List recipes with filters and search
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const cuisine = searchParams.get("cuisine");
    const difficulty = searchParams.get("difficulty");
    const maxTime = searchParams.get("maxTime");
    const featured = searchParams.get("featured");
    const tags = searchParams.get("tags");
    const creatorUserId = searchParams.get("creatorUserId");
    const creatorType = searchParams.get("creatorType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build query using tagged template literals (Neon-compatible)
    let recipes;
    let total;

    if (search || category || cuisine || difficulty || maxTime || featured === "true" || tags || creatorUserId || creatorType) {
      // Complex query with filters - build conditionally
      let conditions = [];
      let values = [];

      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(`(LOWER(name) LIKE LOWER(${searchPattern}) OR LOWER(description) LIKE LOWER(${searchPattern}) OR LOWER(cuisine) LIKE LOWER(${searchPattern}))`);
      }

      if (category) {
        conditions.push(`category = '${category.replace(/'/g, "''")}'`);
      }

      if (cuisine) {
        conditions.push(`cuisine = '${cuisine.replace(/'/g, "''")}'`);
      }

      if (difficulty) {
        conditions.push(`difficulty = '${difficulty.replace(/'/g, "''")}'`);
      }

      if (maxTime) {
        conditions.push(`cooking_time <= ${parseInt(maxTime)}`);
      }

      if (featured === "true") {
        conditions.push("is_featured = true");
      }

      if (tags) {
        const tagList = tags.split(",").map((tag) => tag.trim());
        conditions.push(`tags && ARRAY[${tagList.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')}]`);
      }

      if (creatorUserId) {
        conditions.push(`creator_user_id = '${creatorUserId.replace(/'/g, "''")}'::uuid`);
      }

      if (creatorType) {
        conditions.push(`creator_type = '${creatorType.replace(/'/g, "''")}'`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Use unsafe for dynamic queries (less ideal but necessary for complex filters)
      const query = `
        SELECT 
          id, name, description, category, cuisine, cooking_time, prep_time,
          difficulty, servings, ingredients, image_url, nutrition, tags,
          average_rating, rating_count, estimated_cost, is_featured, created_at
        FROM recipes 
        ${whereClause}
        ORDER BY 
          CASE WHEN is_featured = true THEN 0 ELSE 1 END,
          average_rating DESC,
          created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      recipes = await sql.unsafe(query);

      const countQuery = `SELECT COUNT(*) as total FROM recipes ${whereClause}`;
      const countResult = await sql.unsafe(countQuery);
      total = parseInt(countResult[0].total);
    } else {
      // Simple query - use tagged template literal (safer)
      recipes = await sql`
        SELECT 
          id, name, description, category, cuisine, cooking_time, prep_time,
          difficulty, servings, ingredients, image_url, nutrition, tags,
          average_rating, rating_count, estimated_cost, is_featured, created_at
        FROM recipes 
        ORDER BY 
          CASE WHEN is_featured = true THEN 0 ELSE 1 END,
          average_rating DESC,
          created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`SELECT COUNT(*) as total FROM recipes`;
      total = parseInt(countResult[0].total);
    }

    return Response.json({
      success: true,
      data: recipes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return Response.json(
      { success: false, error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}

// POST /api/recipes - Create new recipe
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      name,
      description,
      category,
      cuisine,
      cooking_time,
      prep_time,
      difficulty,
      servings,
      ingredients,
      instructions,
      image_url,
      video_url,
      nutrition,
      allergens,
      tags,
      estimated_cost,
      creator_type = "admin",
      creator_user_id,
    } = body;

    // Validate required fields
    if (!name || !ingredients || !instructions) {
      return Response.json(
        {
          success: false,
          error: "Missing required fields: name, ingredients, instructions",
        },
        { status: 400 },
      );
    }

    const result = await sql`
      INSERT INTO recipes (
        name, description, category, cuisine, cooking_time, prep_time,
        difficulty, servings, ingredients, instructions, image_url,
        video_url, nutrition, allergens, tags, estimated_cost,
        creator_type, creator_user_id
      ) VALUES (
        ${name}, ${description}, ${category}, ${cuisine}, ${cooking_time}, ${prep_time},
        ${difficulty}, ${servings || 1}, ${JSON.stringify(ingredients)}, ${JSON.stringify(instructions)},
        ${image_url}, ${video_url}, ${JSON.stringify(nutrition)}, ${allergens}, ${tags},
        ${estimated_cost}, ${creator_type}, ${creator_user_id}
      ) RETURNING *
    `;

    return Response.json(
      {
        success: true,
        data: result[0],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating recipe:", error);
    return Response.json(
      { success: false, error: "Failed to create recipe" },
      { status: 500 },
    );
  }
}

