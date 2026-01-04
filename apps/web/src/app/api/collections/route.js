import sql from "../utils/sql.js";
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

// GET /api/collections - Get user's collections
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const collections = await sql`
      SELECT 
        id, name, description, collection_type, system_type, 
        cover_image_url, is_pinned, recipe_count, created_at, updated_at
      FROM recipe_collections
      WHERE user_id = ${userId}::uuid
      ORDER BY is_pinned DESC, created_at DESC
    `;

    return Response.json({
      success: true,
      data: collections
    });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return Response.json(
      { success: false, error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create new collection
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
    const { name, description, cover_image_url } = body;

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: "Collection name is required" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO recipe_collections (user_id, name, description, cover_image_url, collection_type)
      VALUES (${userId}::uuid, ${name.trim()}, ${description || null}, ${cover_image_url || null}, 'custom')
      RETURNING *
    `;

    return Response.json(
      { success: true, data: result[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating collection:", error);
    return Response.json(
      { success: false, error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
