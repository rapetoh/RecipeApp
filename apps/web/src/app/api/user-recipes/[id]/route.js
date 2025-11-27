import sql from "@/app/api/utils/sql";
import { getToken } from '@auth/core/jwt';

// Helper to decode JWT payload manually (since @auth/core/jwt doesn't export decodeJwt)
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    // Decode the payload (second part)
    const payload = parts[1];
    // Convert base64url to base64 (replace - with +, _ with /)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT payload:', error);
    return null;
  }
}

async function getUserId(request) {
  try {
    // First, try to get token from Authorization header (for mobile)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Try to decode as JWT first
      const decoded = decodeJwtPayload(token);
      if (decoded?.sub) {
        return decoded.sub;
      }
      
      // If not a JWT, try as session token (look up in database)
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
    
    // Fallback to cookies (for web)
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
  
  // Final fallback to query param
  const { searchParams } = new URL(request.url);
  return searchParams.get("userId");
}

// GET /api/user-recipes/[id] - Get single user recipe
export async function GET(request, { params }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const recipes = await sql`
      SELECT 
        id, name, description, category, cuisine, cooking_time, prep_time,
        difficulty, servings, ingredients, instructions, image_url,
        tags, created_at, updated_at
      FROM recipes 
      WHERE id = ${parseInt(id)}
      AND creator_user_id = ${userId}::uuid
      AND creator_type = 'user'
    `;

    if (recipes.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: recipes[0],
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return Response.json(
      { success: false, error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

// PUT /api/user-recipes/[id] - Update recipe
export async function PUT(request, { params }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
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
      tags,
    } = body;

    // Check if recipe exists and belongs to user
    const existing = await sql`
      SELECT id FROM recipes 
      WHERE id = ${parseInt(id)}
      AND creator_user_id = ${userId}::uuid
      AND creator_type = 'user'
    `;

    if (existing.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Validation
    if (!name || !ingredients || !instructions) {
      return Response.json(
        {
          success: false,
          error: "Missing required fields: name, ingredients, instructions",
        },
        { status: 400 }
      );
    }

    const validIngredients = Array.isArray(ingredients) 
      ? ingredients.filter(ing => ing.name?.trim() || ing.amount?.trim())
      : [];
    const validInstructions = Array.isArray(instructions)
      ? instructions.filter(inst => inst.instruction?.trim())
      : [];

    if (validIngredients.length === 0 || validInstructions.length === 0) {
      return Response.json(
        {
          success: false,
          error: "At least one ingredient and one instruction is required",
        },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE recipes SET
        name = ${name},
        description = ${description || null},
        category = ${category || 'dinner'},
        cuisine = ${cuisine || null},
        cooking_time = ${cooking_time || null},
        prep_time = ${prep_time || null},
        difficulty = ${difficulty || null},
        servings = ${servings || null},
        ingredients = ${JSON.stringify(validIngredients)}::jsonb,
        instructions = ${JSON.stringify(validInstructions)}::jsonb,
        image_url = ${image_url || null},
        tags = ${tags || []},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      AND creator_user_id = ${userId}::uuid
      AND creator_type = 'user'
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
      { status: 500 }
    );
  }
}

// DELETE /api/user-recipes/[id] - Delete recipe
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if recipe exists and belongs to user
    const existing = await sql`
      SELECT id FROM recipes 
      WHERE id = ${parseInt(id)}
      AND creator_user_id = ${userId}::uuid
      AND creator_type = 'user'
    `;

    if (existing.length === 0) {
      return Response.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    await sql`
      DELETE FROM recipes 
      WHERE id = ${parseInt(id)}
      AND creator_user_id = ${userId}::uuid
      AND creator_type = 'user'
    `;

    return Response.json({
      success: true,
      message: "Recipe deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return Response.json(
      { success: false, error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}

