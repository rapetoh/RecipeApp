import sql from "../../utils/sql.js";
import { getToken } from '@auth/core/jwt';

// Helper to decode JWT payload manually
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT payload:', error);
    return null;
  }
}

// Helper to get user ID from request
async function getUserId(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = decodeJwtPayload(token);
      if (decoded?.sub) {
        return decoded.sub;
      }
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
    
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL?.startsWith('https'),
    });
    if (token?.sub) {
      return token.sub;
    }
  } catch (error) {
    console.error('Error getting user ID:', error);
  }
  
  const { searchParams } = new URL(request.url);
  return searchParams.get("userId");
}

// GET /api/collections/[id] - Get recipes in a collection
export async function GET(request, { params }) {
  try {
    const userId = await getUserId(request);
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify collection belongs to user
    const collection = await sql`
      SELECT * FROM recipe_collections
      WHERE id = ${parseInt(id)} AND user_id = ${userId}::uuid
    `;

    if (collection.length === 0) {
      return Response.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    // Get recipes in collection
    const recipes = await sql`
      SELECT 
        r.id, r.name, r.description, r.category, r.cuisine, r.cooking_time,
        r.prep_time, r.difficulty, r.servings, r.image_url, r.nutrition,
        r.tags, r.average_rating, r.rating_count, r.estimated_cost,
        cr.added_at, cr.display_order, cr.notes
      FROM collection_recipes cr
      JOIN recipes r ON cr.recipe_id = r.id
      WHERE cr.collection_id = ${parseInt(id)}
      ORDER BY cr.display_order ASC, cr.added_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM collection_recipes
      WHERE collection_id = ${parseInt(id)}
    `;
    const total = parseInt(countResult[0]?.total || 0);

    return Response.json({
      success: true,
      data: {
        collection: collection[0],
        recipes: recipes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error("Error fetching collection recipes:", error);
    return Response.json(
      { success: false, error: "Failed to fetch collection recipes" },
      { status: 500 }
    );
  }
}

// PUT /api/collections/[id] - Update collection
export async function PUT(request, { params }) {
  try {
    const userId = await getUserId(request);
    const { id } = params;

    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, cover_image_url, is_pinned } = body;

    // Verify collection belongs to user and is custom (can't edit system collections)
    const existing = await sql`
      SELECT * FROM recipe_collections
      WHERE id = ${parseInt(id)} AND user_id = ${userId}::uuid AND collection_type = 'custom'
    `;

    if (existing.length === 0) {
      return Response.json(
        { success: false, error: "Collection not found or cannot be edited" },
        { status: 404 }
      );
    }

    const result = await sql`
      UPDATE recipe_collections
      SET 
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description !== undefined ? description : null}, description),
        cover_image_url = COALESCE(${cover_image_url || null}, cover_image_url),
        is_pinned = COALESCE(${is_pinned !== undefined ? is_pinned : null}, is_pinned),
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    return Response.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error("Error updating collection:", error);
    return Response.json(
      { success: false, error: "Failed to update collection" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id] - Delete collection (only custom collections)
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId(request);
    const { id } = params;

    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify collection belongs to user and is custom (can't delete system collections)
    const existing = await sql`
      SELECT * FROM recipe_collections
      WHERE id = ${parseInt(id)} AND user_id = ${userId}::uuid AND collection_type = 'custom'
    `;

    if (existing.length === 0) {
      return Response.json(
        { success: false, error: "Collection not found or cannot be deleted" },
        { status: 404 }
      );
    }

    await sql`
      DELETE FROM recipe_collections
      WHERE id = ${parseInt(id)}
    `;

    return Response.json({
      success: true,
      message: "Collection deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return Response.json(
      { success: false, error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
