import sql from "../../../utils/sql.js";
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

// POST /api/collections/[id]/recipes - Add recipe to collection
export async function POST(request, { params }) {
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
    const { recipeId, notes } = body;

    if (!recipeId) {
      return Response.json(
        { success: false, error: "Recipe ID is required" },
        { status: 400 }
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

    // Verify recipe exists
    const recipe = await sql`
      SELECT id FROM recipes WHERE id = ${parseInt(recipeId)}
    `;

    if (recipe.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Add recipe to collection
    try {
      const result = await sql`
        INSERT INTO collection_recipes (collection_id, recipe_id, notes)
        VALUES (${parseInt(id)}, ${parseInt(recipeId)}, ${notes || null})
        RETURNING *
      `;

      // Update recipe count
      await sql`
        UPDATE recipe_collections
        SET recipe_count = (
          SELECT COUNT(*) FROM collection_recipes WHERE collection_id = ${parseInt(id)}
        )
        WHERE id = ${parseInt(id)}
      `;

      return Response.json(
        { success: true, data: result[0] },
        { status: 201 }
      );
    } catch (insertError) {
      if (insertError.code === "23505") {
        // Already in collection
        return Response.json(
          { success: true, message: "Recipe already in collection" },
          { status: 200 }
        );
      }
      throw insertError;
    }
  } catch (error) {
    console.error("Error adding recipe to collection:", error);
    return Response.json(
      { success: false, error: "Failed to add recipe to collection" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id]/recipes/[recipeId] - Remove recipe from collection
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId(request);
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get("recipeId");

    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!recipeId) {
      return Response.json(
        { success: false, error: "Recipe ID is required" },
        { status: 400 }
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

    // Remove recipe from collection
    const result = await sql`
      DELETE FROM collection_recipes
      WHERE collection_id = ${parseInt(id)} AND recipe_id = ${parseInt(recipeId)}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found in collection" },
        { status: 404 }
      );
    }

    // Update recipe count
    await sql`
      UPDATE recipe_collections
      SET recipe_count = (
        SELECT COUNT(*) FROM collection_recipes WHERE collection_id = ${parseInt(id)}
      )
      WHERE id = ${parseInt(id)}
    `;

    return Response.json({
      success: true,
      message: "Recipe removed from collection"
    });
  } catch (error) {
    console.error("Error removing recipe from collection:", error);
    return Response.json(
      { success: false, error: "Failed to remove recipe from collection" },
      { status: 500 }
    );
  }
}
