import sql from "@/app/api/utils/sql";
import { getToken } from '@auth/core/jwt';

// Helper to decode JWT payload manually (since @auth/core/jwt doesn't export decodeJwt)
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
  return null;
}

// POST /api/recipes/save-generated - Save a generated recipe from food recognition
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
      nutrition,
      tags,
      recognitionId, // Optional: link to food_recognition_results
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
      ? ingredients.filter(ing => ing.name?.trim() || ing.amount?.trim() || ing.ingredient?.trim())
      : [];
    const validInstructions = Array.isArray(instructions)
      ? instructions.filter(inst => inst.instruction?.trim() || inst.step?.trim())
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

    // Save the recipe
    const result = await sql`
      INSERT INTO recipes (
        name, description, category, cuisine, cooking_time, prep_time,
        difficulty, servings, ingredients, instructions, image_url,
        nutrition, tags, creator_type, estimated_cost, average_rating, rating_count, is_featured
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
        ${JSON.stringify(nutrition || {})}::jsonb,
        ${Array.isArray(tags) ? tags : []},
        'ai',
        ${12.0},
        ${4.2},
        ${1},
        ${false}
      ) RETURNING *
    `;

    const savedRecipe = result[0];

    // Update food_recognition_results with the saved recipe ID if recognitionId is provided
    if (recognitionId) {
      try {
        await sql`
          UPDATE food_recognition_results 
          SET generated_recipe_id = ${savedRecipe.id}
          WHERE id = ${recognitionId}
        `;
      } catch (updateError) {
        console.error('Failed to update recognition result:', updateError);
        // Don't fail the request if this update fails
      }
    }

    return Response.json(
      {
        success: true,
        data: savedRecipe,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving generated recipe:", error);
    return Response.json(
      { success: false, error: "Failed to save recipe" },
      { status: 500 }
    );
  }
}
