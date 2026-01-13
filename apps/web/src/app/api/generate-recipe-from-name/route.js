import sql from "../utils/sql.js";
import { 
  generateRecipeWithGPT, 
  validateFoodInput, 
  classifyInputSpecificity,
  generateSuggestionsForAmbiguous 
} from "../utils/openai.js";
import { findBestMatch, filterAndSortBySimilarity } from "../utils/similarity.js";

// Helper function to fetch user preferences
async function getUserPreferences(userId) {
  if (!userId) return null;
  
  try {
    // Check if apply_preferences_in_assistant column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'apply_preferences_in_assistant'
    `;
    
    const hasApplyPreferencesColumn = columnExists.length > 0;
    
    // Conditionally include apply_preferences_in_assistant if column exists
    const userPrefs = hasApplyPreferencesColumn
      ? await sql`
          SELECT 
            diet_type,
            allergies,
            dislikes,
            preferred_cuisines,
            goals,
            cooking_skill,
            preferred_cooking_time,
            people_count,
            apply_preferences_in_assistant,
            measurement_system
          FROM users
          WHERE id = ${userId}::uuid
        `
      : await sql`
          SELECT 
            diet_type,
            allergies,
            dislikes,
            preferred_cuisines,
            goals,
            cooking_skill,
            preferred_cooking_time,
            people_count,
            measurement_system
          FROM users
          WHERE id = ${userId}::uuid
        `;
    
    if (userPrefs.length === 0) return null;
    
    const prefs = userPrefs[0];
    return {
      dietType: (prefs.diet_type && Array.isArray(prefs.diet_type) && prefs.diet_type.length > 0) 
        ? prefs.diet_type[0] 
        : (prefs.diet_type || null),
      allergies: prefs.allergies || [],
      dislikedIngredients: prefs.dislikes || [],
      favoriteCuisines: prefs.preferred_cuisines || [],
      goals: prefs.goals || [],
      cookingSkill: prefs.cooking_skill || "beginner",
      preferredCookingTime: prefs.preferred_cooking_time || "15_30",
      peopleCount: prefs.people_count || 1,
      applyPreferencesInAssistant: hasApplyPreferencesColumn 
        ? (prefs.apply_preferences_in_assistant !== false) 
        : true, // Default to true if column doesn't exist
      measurementSystem: prefs.measurement_system || "metric",
    };
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return null; // Return null on error, don't break the flow
  }
}

// POST /api/generate-recipe-from-name - Generate recipe from dish name
export async function POST(request) {
  try {
    const body = await request.json();
    const { dishName, userId } = body;

    if (!dishName || !dishName.trim()) {
      return Response.json(
        { success: false, error: "Dish name is required" },
        { status: 400 },
      );
    }

    const trimmedDishName = dishName.trim();

    // Step 1: Validate if input is a valid food/recipe name
    const validation = await validateFoodInput(trimmedDishName);
    if (!validation.isValid) {
      return Response.json({
        success: false,
        type: "invalid",
        error: validation.reason || "Oops, this doesn't seem to be a recipe. Please try a food name!",
      }, { status: 400 });
    }

    // Step 2: Search database for existing recipes (fuzzy search)
    const dbMatches = await sql`
      SELECT * FROM recipes 
      WHERE LOWER(name) LIKE LOWER(${"%" + trimmedDishName + "%"})
      ORDER BY 
        CASE WHEN LOWER(name) = LOWER(${trimmedDishName}) THEN 1 
             WHEN LOWER(name) LIKE LOWER(${trimmedDishName + "%"}) THEN 2
             WHEN LOWER(name) LIKE LOWER(${"%" + trimmedDishName}) THEN 3
             ELSE 4 END,
        average_rating DESC
      LIMIT 20
    `;

    // Check for 95%+ similarity match - use DB recipe if found
    const bestMatch = findBestMatch(trimmedDishName, dbMatches, 95);
    
    if (bestMatch) {
      return Response.json({
        success: true,
        type: "recipe",
        data: {
          recipe: bestMatch.recipe,
          isGenerated: false,
        },
      });
    }

    // Step 3: Classify input (specific vs ambiguous)
    let isSpecific = false;
    let shouldUseAI = false;

    if (dbMatches.length >= 3) {
      // 3+ partial matches = ambiguous
      isSpecific = false;
    } else if (dbMatches.length === 0) {
      // No matches - use AI to classify
      const classification = await classifyInputSpecificity(trimmedDishName);
      isSpecific = classification.isSpecific && classification.confidence > 0.6;
    } else {
      // 1-2 matches - use AI to classify
      const classification = await classifyInputSpecificity(trimmedDishName);
      isSpecific = classification.isSpecific && classification.confidence > 0.6;
    }

    // Fetch user preferences
    const userPreferences = await getUserPreferences(userId);
    const applyPreferences = userPreferences?.applyPreferencesInAssistant !== false;
    const measurementSystem = userPreferences?.measurementSystem || "metric";

    // Step 4: Handle ambiguous input - return 6 suggestions
    if (!isSpecific) {
      // Filter and sort DB matches by similarity (prioritize 95%+ matches)
      const sortedBySimilarity = filterAndSortBySimilarity(trimmedDishName, dbMatches, 0);
      
      // Separate 95%+ matches from lower similarity matches
      const highSimilarityMatches = sortedBySimilarity
        .filter(item => item.similarity >= 95)
        .map(item => item.recipe);
      
      const lowerSimilarityMatches = sortedBySimilarity
        .filter(item => item.similarity < 95)
        .map(item => item.recipe);
      
      // Prioritize 95%+ matches, then fill with lower similarity DB matches
      const dbSuggestions = [
        ...highSimilarityMatches.slice(0, 6),
        ...lowerSimilarityMatches.slice(0, Math.max(0, 6 - highSimilarityMatches.length))
      ].slice(0, 6);
      
      // Generate AI suggestions to fill up to 6 total
      const aiSuggestions = await generateSuggestionsForAmbiguous(
        trimmedDishName,
        dbSuggestions,
        userPreferences,
        measurementSystem
      );

      // Combine DB and AI suggestions (prioritize 95%+ DB matches)
      const allSuggestions = [...dbSuggestions];
      
      // Add AI suggestions (avoid duplicates by name)
      for (const aiSuggestion of aiSuggestions) {
        if (allSuggestions.length >= 6) break;
        
        const isDuplicate = allSuggestions.some(s => 
          s.name.toLowerCase() === aiSuggestion.name.toLowerCase()
        );
        
        if (!isDuplicate) {
          // Save AI-generated suggestion to DB for future use
          try {
            const savedSuggestion = await sql`
              INSERT INTO recipes (
                name, description, category, cuisine, cooking_time, prep_time,
                difficulty, servings, ingredients, instructions, nutrition,
                image_url, tags, creator_type, estimated_cost, average_rating, rating_count, is_featured
              ) VALUES (
                ${aiSuggestion.name},
                ${aiSuggestion.description || `A delicious ${aiSuggestion.name} recipe`},
                ${aiSuggestion.category || "dinner"},
                ${aiSuggestion.cuisine || "Global"},
                ${aiSuggestion.cooking_time || 30},
                ${aiSuggestion.prep_time || 15},
                ${aiSuggestion.difficulty || "medium"},
                ${aiSuggestion.servings || 4},
                ${JSON.stringify(aiSuggestion.ingredients || [])},
                ${JSON.stringify(aiSuggestion.instructions || [])},
                ${JSON.stringify(aiSuggestion.nutrition || { calories: 300, protein: 15, carbs: 30, fat: 10 })},
                ${null},
                ${["ai-generated", "text-generated", "suggestion"]},
                ${"ai"},
                ${12.0},
                ${4.2},
                ${1},
                ${false}
              ) RETURNING *
            `;
            allSuggestions.push(savedSuggestion[0]);
          } catch (error) {
            console.error("Error saving AI suggestion:", error);
            // Still include it in response even if save fails
            allSuggestions.push(aiSuggestion);
          }
        }
      }

      return Response.json({
        success: true,
        type: "suggestions",
        data: {
          suggestions: allSuggestions.slice(0, 6),
          query: trimmedDishName,
        },
      });
    }

    // Step 5: Handle clear/specific input - generate exact recipe
    const analysis = {
      cuisine: "Global",
      difficulty: "medium",
      estimated_time: 30,
      category: "dinner",
    };

    let recipeJson;
    try {
      recipeJson = await generateRecipeWithGPT(
        trimmedDishName, 
        analysis,
        userPreferences,
        applyPreferences,
        measurementSystem
      );
      
      // Validate that we got a meaningful recipe
      if (!recipeJson.name || !recipeJson.ingredients || !recipeJson.instructions) {
        throw new Error("AI generated incomplete recipe data");
      }
    } catch (error) {
      console.error("Failed to generate recipe:", error);
      return Response.json(
        {
          success: false,
          error: "We couldn't generate a recipe for this dish name. Please check the spelling or try another name.",
        },
        { status: 500 },
      );
    }

    // Save the generated recipe to database
    const savedRecipe = await sql`
      INSERT INTO recipes (
        name, description, category, cuisine, cooking_time, prep_time,
        difficulty, servings, ingredients, instructions, nutrition,
        image_url, tags, creator_type, estimated_cost, average_rating, rating_count, is_featured
      ) VALUES (
        ${recipeJson.name || trimmedDishName},
        ${recipeJson.description || `A delicious ${trimmedDishName} recipe`},
        ${analysis.category},
        ${analysis.cuisine},
        ${recipeJson.cooking_time || analysis.estimated_time || 30},
        ${recipeJson.prep_time || 15},
        ${analysis.difficulty},
        ${recipeJson.servings || 4},
        ${JSON.stringify(recipeJson.ingredients || [])},
        ${JSON.stringify(recipeJson.instructions || [])},
        ${JSON.stringify(recipeJson.nutrition || { calories: 300, protein: 15, carbs: 30, fat: 10 })},
        ${null},
        ${["ai-generated", "text-generated"]},
        ${"ai"},
        ${12.0},
        ${4.2},
        ${1},
        ${false}
      ) RETURNING *
    `;

    return Response.json({
      success: true,
      type: "recipe",
      data: {
        recipe: savedRecipe[0],
        isGenerated: true,
      },
    });
  } catch (error) {
    console.error("Error generating recipe from name:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to generate recipe. Please try again.",
      },
      { status: 500 },
    );
  }
}

