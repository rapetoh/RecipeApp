import sql from "../../utils/sql.js";

// Helper to get user ID from request
async function getUserId(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Try to decode JWT manually
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
          const decoded = Buffer.from(padded, 'base64').toString('utf-8');
          const parsed = JSON.parse(decoded);
          if (parsed?.sub) {
            return parsed.sub;
          }
        }
      } catch (e) {
        // Fall through to session lookup
      }
      // Try session lookup
      try {
        const session = await sql`
          SELECT "userId" FROM auth_sessions 
          WHERE "sessionToken" = ${token} 
          AND expires > NOW()
        `;
        if (session.length > 0 && session[0].userId) {
          return session[0].userId;
        }
      } catch (sessionError) {
        console.error('Failed to look up session token:', sessionError);
      }
    }
  } catch (error) {
    console.error('Error getting user ID:', error);
  }
  
  const { searchParams } = new URL(request.url);
  return searchParams.get("userId");
}

// GET /api/recipes/my-collections - Get all recipes from user's collections
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let recipes;
    let total;

    if (search) {
      const searchPattern = `%${search}%`;
      // Get all recipes from user's collections with search filter
      recipes = await sql`
        SELECT DISTINCT
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, r.prep_time,
          r.difficulty, r.servings, r.ingredients, r.instructions, r.image_url,
          r.tags, r.created_at, r.updated_at, r.creator_type, r.average_rating,
          r.rating_count, r.estimated_cost
        FROM collection_recipes cr
        JOIN recipe_collections rc ON cr.collection_id = rc.id
        JOIN recipes r ON cr.recipe_id = r.id
        WHERE rc.user_id = ${userId}::uuid
        AND (
          LOWER(r.name) LIKE LOWER(${searchPattern}) OR 
          LOWER(r.description) LIKE LOWER(${searchPattern})
        )
        ORDER BY r.updated_at DESC, r.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(DISTINCT r.id) as count
        FROM collection_recipes cr
        JOIN recipe_collections rc ON cr.collection_id = rc.id
        JOIN recipes r ON cr.recipe_id = r.id
        WHERE rc.user_id = ${userId}::uuid
        AND (
          LOWER(r.name) LIKE LOWER(${searchPattern}) OR 
          LOWER(r.description) LIKE LOWER(${searchPattern})
        )
      `;
      total = parseInt(countResult[0]?.count || 0);
    } else {
      // Get all recipes from user's collections (no search)
      recipes = await sql`
        SELECT DISTINCT
          r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time, r.prep_time,
          r.difficulty, r.servings, r.ingredients, r.instructions, r.image_url,
          r.tags, r.created_at, r.updated_at, r.creator_type, r.average_rating,
          r.rating_count, r.estimated_cost
        FROM collection_recipes cr
        JOIN recipe_collections rc ON cr.collection_id = rc.id
        JOIN recipes r ON cr.recipe_id = r.id
        WHERE rc.user_id = ${userId}::uuid
        ORDER BY r.updated_at DESC, r.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(DISTINCT r.id) as count
        FROM collection_recipes cr
        JOIN recipe_collections rc ON cr.collection_id = rc.id
        JOIN recipes r ON cr.recipe_id = r.id
        WHERE rc.user_id = ${userId}::uuid
      `;
      total = parseInt(countResult[0]?.count || 0);
    }

    return Response.json({
      success: true,
      data: {
        recipes: recipes,
        total: total,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching recipes from collections:", error);
    return Response.json(
      { success: false, error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}


