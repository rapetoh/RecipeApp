import sql from '../../utils/sql.js';
import { getToken } from '@auth/core/jwt';
import { adapter } from '../../../../auth.js';

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

// GET /api/user/me - Get current user profile
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await sql`
      SELECT id, name, email, image, created_at, updated_at
      FROM auth_users
      WHERE id = ${userId}::uuid
    `;

    if (user.length === 0) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user stats
    const [recipeCount, favoriteCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM recipes WHERE creator_user_id = ${userId}::uuid AND creator_type = 'user'`,
      sql`SELECT COUNT(*) as count FROM recipe_favorites WHERE user_id = ${userId}::uuid`,
    ]);

    return Response.json({
      success: true,
      data: {
        ...user[0],
        stats: {
          recipeCount: parseInt(recipeCount[0]?.count || 0),
          favoriteCount: parseInt(favoriteCount[0]?.count || 0),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT /api/user/me - Update user profile
export async function PUT(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, image } = body;

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is already taken (if changing email)
    if (email) {
      const existing = await sql`
        SELECT id FROM auth_users WHERE email = ${email} AND id != ${userId}::uuid
      `;
      if (existing.length > 0) {
        return Response.json(
          { success: false, error: 'Email already in use' },
          { status: 409 }
        );
      }
    }

    // Update user
    const result = await sql`
      UPDATE auth_users
      SET 
        name = COALESCE(${name || null}, name),
        email = COALESCE(${email || null}, email),
        image = COALESCE(${image || null}, image),
        updated_at = NOW()
      WHERE id = ${userId}::uuid
      RETURNING id, name, email, image, created_at, updated_at
    `;

    if (result.length === 0) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return Response.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/me - Delete user account
export async function DELETE(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await sql`
      SELECT id FROM auth_users WHERE id = ${userId}::uuid
    `;

    if (user.length === 0) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user (CASCADE will handle related data)
    await adapter.deleteUser(userId);

    return Response.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return Response.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}


