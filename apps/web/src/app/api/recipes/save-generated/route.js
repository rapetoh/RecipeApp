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
    // Get authenticated user ID
    const userId = await getUserId(request);
    
    if (!userId) {
      return Response.json(
        { success: false, error: "Authentication required" },
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

    // STEP 1: Check if recipe already exists (by name match - case insensitive)
    // This prevents creating duplicate recipes
    let recipeId;
    const existingRecipe = await sql`
      SELECT id FROM recipes 
      WHERE LOWER(name) = LOWER(${name})
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existingRecipe.length > 0) {
      // Recipe exists - use existing ID (prevents duplicates)
      recipeId = existingRecipe[0].id;
      console.log(`Using existing recipe ID: ${recipeId} for "${name}"`);
      
      // Update creator info so recipe shows in "My Recipes" even after unfavoriting
      // This marks the recipe as "yours" - part of your collection
      await sql`
        UPDATE recipes 
        SET creator_user_id = ${userId}::uuid
        WHERE id = ${recipeId} AND (creator_user_id IS NULL OR creator_user_id != ${userId}::uuid)
      `;
    } else {
      // Recipe doesn't exist - create it
      const result = await sql`
        INSERT INTO recipes (
          name, description, category, cuisine, cooking_time, prep_time,
          difficulty, servings, ingredients, instructions, image_url,
          nutrition, tags, creator_type, creator_user_id, estimated_cost, 
          average_rating, rating_count, is_featured
        ) VALUES (
          ${name}, 
          ${description || null}, 
          ${category || 'dinner'}, 
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
          ${userId}::uuid,
          ${12.0},
          ${4.2},
          ${1},
          ${false}
        ) RETURNING id
      `;
      recipeId = result[0].id;
      console.log(`Created new recipe ID: ${recipeId} for "${name}"`);
    }

    // STEP 2: Add recipe to saved_recipes (user's collection)
    // This is what "Keep Recipe" should do - add to user's saved collection
    try {
      const savedRecipe = await sql`
        INSERT INTO saved_recipes (user_id, recipe_id)
        VALUES (${userId}::uuid, ${recipeId})
        ON CONFLICT (user_id, recipe_id) DO NOTHING
        RETURNING *
      `;

      // Check if it was already in the collection
      if (savedRecipe.length === 0) {
        const alreadySaved = await sql`
          SELECT * FROM saved_recipes 
          WHERE user_id = ${userId}::uuid AND recipe_id = ${recipeId}
          LIMIT 1
        `;
        
        if (alreadySaved.length > 0) {
          // Recipe was already in collection
          const recipe = await sql`
            SELECT * FROM recipes WHERE id = ${recipeId}
          `;
          
          return Response.json({
            success: true,
            data: recipe[0],
            message: "Recipe already in your collection",
          });
        }
      }
    } catch (saveError) {
      // Handle unique constraint violation (recipe already saved)
      if (saveError.code === "23505") {
        const recipe = await sql`
          SELECT * FROM recipes WHERE id = ${recipeId}
        `;
        
        return Response.json({
          success: true,
          data: recipe[0],
          message: "Recipe already in your collection",
        });
      }
      throw saveError;
    }

    // STEP 3: Update food_recognition_results if recognitionId provided
    if (recognitionId) {
      try {
        await sql`
          UPDATE food_recognition_results 
          SET generated_recipe_id = ${recipeId}
          WHERE id = ${recognitionId}
        `;
      } catch (updateError) {
        console.error('Failed to update recognition result:', updateError);
        // Don't fail the request if this update fails
      }
    }

    // Get the full recipe to return
    const recipe = await sql`
      SELECT * FROM recipes WHERE id = ${recipeId}
    `;

    return Response.json({
      success: true,
      data: recipe[0],
      message: "Recipe added to your collection",
    });
  } catch (error) {
    console.error("Error saving generated recipe:", error);
    return Response.json(
      { success: false, error: "Failed to save recipe" },
      { status: 500 }
    );
  }
}
