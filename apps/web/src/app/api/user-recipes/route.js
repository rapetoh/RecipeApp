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

// Helper to get user ID from request
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

// GET /api/user-recipes - List user's recipes
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
      recipes = await sql`
        SELECT 
          id, name, description, category, cuisine, cooking_time, prep_time,
          difficulty, servings, ingredients, instructions, image_url,
          tags, created_at, updated_at
        FROM recipes 
        WHERE creator_user_id = ${userId}::uuid
        AND creator_type = 'user'
        AND (
          LOWER(name) LIKE LOWER(${searchPattern}) OR 
          LOWER(description) LIKE LOWER(${searchPattern})
        )
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM recipes 
        WHERE creator_user_id = ${userId}::uuid
        AND creator_type = 'user'
        AND (
          LOWER(name) LIKE LOWER(${searchPattern}) OR 
          LOWER(description) LIKE LOWER(${searchPattern})
        )
      `;
      total = parseInt(countResult[0]?.count || 0);
    } else {
      recipes = await sql`
        SELECT 
          id, name, description, category, cuisine, cooking_time, prep_time,
          difficulty, servings, ingredients, instructions, image_url,
          tags, created_at, updated_at
        FROM recipes 
        WHERE creator_user_id = ${userId}::uuid
        AND creator_type = 'user'
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM recipes 
        WHERE creator_user_id = ${userId}::uuid
        AND creator_type = 'user'
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
    console.error("Error fetching user recipes:", error);
    return Response.json(
      { success: false, error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

// POST /api/user-recipes - Create new recipe
export async function POST(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Ensure ingredients and instructions are arrays
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
      INSERT INTO recipes (
        name, description, category, cuisine, cooking_time, prep_time,
        difficulty, servings, ingredients, instructions, image_url,
        tags, creator_type, creator_user_id
      ) VALUES (
        ${name}, 
        ${description || null}, 
        ${category || 'main'}, 
        ${cuisine || null}, 
        ${cooking_time || null}, 
        ${prep_time || null},
        ${difficulty || null}, 
        ${servings || null}, 
        ${JSON.stringify(validIngredients)}::jsonb, 
        ${JSON.stringify(validInstructions)}::jsonb,
        ${image_url || null}, 
        ${tags || []},
        'user', 
        ${userId}::uuid
      ) RETURNING *
    `;

    return Response.json(
      {
        success: true,
        data: result[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating recipe:", error);
    return Response.json(
      { success: false, error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}

