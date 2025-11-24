import sql from "@/app/api/utils/sql";

// GET /api/preferences - Get user preferences
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    // Try to get userId from query params or from request body
    let userId = searchParams.get("userId");
    
    // If not in query params, try to get from cookies/session
    if (!userId) {
      // Try to extract from cookies if available
      const cookies = request.headers.get("cookie");
      if (cookies) {
        // This is a fallback - in production you'd use proper session handling
        // For now, we'll require userId in query params
      }
    }

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 401 },
      );
    }

    console.log("Fetching preferences for user:", userId);

    // Check if user exists
    const userExists = await sql`
      SELECT id FROM auth_users WHERE id = ${userId}::uuid
    `;

    if (userExists.length === 0) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Check if apply_preferences_in_assistant column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'apply_preferences_in_assistant'
    `;
    const hasApplyPreferencesColumn = columnExists.length > 0;

    // Get user preferences from users table
    // Conditionally include apply_preferences_in_assistant if column exists
    let userPrefs;
    if (hasApplyPreferencesColumn) {
      userPrefs = await sql`
        SELECT 
          id,
          diet_type,
          allergies,
          dislikes,
          preferred_cuisines,
          experience_level,
          cooking_schedule,
          goals,
          cooking_skill,
          preferred_cooking_time,
          people_count,
          daily_suggestion_enabled,
          daily_suggestion_time,
          weekly_plan_enabled,
          weekly_plan_days,
          measurement_system,
          onboarding_completed,
          apply_preferences_in_assistant
        FROM users
        WHERE id = ${userId}::uuid
      `;
    } else {
      userPrefs = await sql`
        SELECT 
          id,
          diet_type,
          allergies,
          dislikes,
          preferred_cuisines,
          experience_level,
          cooking_schedule,
          goals,
          cooking_skill,
          preferred_cooking_time,
          people_count,
          daily_suggestion_enabled,
          daily_suggestion_time,
          weekly_plan_enabled,
          weekly_plan_days,
          measurement_system,
          onboarding_completed
        FROM users
        WHERE id = ${userId}::uuid
      `;
    }

    if (userPrefs.length === 0) {
      // User exists but no preferences yet
      return Response.json({
        success: true,
        data: null,
      });
    }

    const prefs = userPrefs[0];

    // Transform database fields to match frontend format
    const preferences = {
      goals: prefs.goals || [],
      // diet_type is stored as TEXT[] in DB, extract first element or null
      dietType: (prefs.diet_type && Array.isArray(prefs.diet_type) && prefs.diet_type.length > 0) 
        ? prefs.diet_type[0] 
        : (prefs.diet_type || null),
      allergies: prefs.allergies || [],
      favoriteCuisines: prefs.preferred_cuisines || [],
      dislikedIngredients: prefs.dislikes || [],
      cookingSkill: prefs.cooking_skill || prefs.experience_level || "beginner",
      preferredCookingTime: prefs.preferred_cooking_time || "15_30",
      peopleCount: prefs.people_count || 1,
      dailySuggestionEnabled: prefs.daily_suggestion_enabled !== false,
      dailySuggestionTime: prefs.daily_suggestion_time || "18:00",
      weeklyPlanEnabled: prefs.weekly_plan_enabled || false,
      weeklyPlanDays: prefs.weekly_plan_days || ["mon", "tue", "wed", "thu", "fri"],
      measurementSystem: prefs.measurement_system || "metric",
      onboardingCompleted: prefs.onboarding_completed || false,
      applyPreferencesInAssistant: hasApplyPreferencesColumn 
        ? (prefs.apply_preferences_in_assistant !== false) 
        : true, // Default to true if column doesn't exist yet
    };

    return Response.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return Response.json(
      { success: false, error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
}

// POST /api/preferences - Save user preferences
export async function POST(request) {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 401 },
      );
    }

    console.log("Saving preferences for user:", userId);

    // Check if user exists
    const userExists = await sql`
      SELECT id FROM auth_users WHERE id = ${userId}::uuid
    `;

    if (userExists.length === 0) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Check if apply_preferences_in_assistant column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'apply_preferences_in_assistant'
    `;
    const hasApplyPreferencesColumn = columnExists.length > 0;

    // Transform frontend format to database format
    // diet_type is TEXT[] in DB, so wrap string in array (or null)
    const dietTypeValue = body.dietType 
      ? (Array.isArray(body.dietType) ? body.dietType : [body.dietType])
      : null;
    
    const preferencesData = {
      diet_type: dietTypeValue,
      allergies: Array.isArray(body.allergies) ? body.allergies : [],
      dislikes: Array.isArray(body.dislikedIngredients) ? body.dislikedIngredients : [],
      preferred_cuisines: Array.isArray(body.favoriteCuisines) ? body.favoriteCuisines : [],
      experience_level: body.cookingSkill || "beginner",
      goals: Array.isArray(body.goals) ? body.goals : [],
      cooking_skill: body.cookingSkill || "beginner",
      preferred_cooking_time: body.preferredCookingTime || "15_30",
      people_count: body.peopleCount || 1,
      daily_suggestion_enabled: body.dailySuggestionEnabled !== false,
      daily_suggestion_time: body.dailySuggestionTime || "18:00",
      weekly_plan_enabled: body.weeklyPlanEnabled || false,
      weekly_plan_days: Array.isArray(body.weeklyPlanDays) ? body.weeklyPlanDays : ["mon", "tue", "wed", "thu", "fri"],
      measurement_system: body.measurementSystem || "metric",
      onboarding_completed: body.onboardingCompleted || false,
    };

    // Only add apply_preferences_in_assistant if column exists
    if (hasApplyPreferencesColumn) {
      preferencesData.apply_preferences_in_assistant = body.applyPreferencesInAssistant !== false;
    }

    // Check if user preferences row exists
    const existingPrefs = await sql`
      SELECT id FROM users WHERE id = ${userId}::uuid
    `;

    if (existingPrefs.length === 0) {
      // Insert new preferences
      if (hasApplyPreferencesColumn) {
        await sql`
          INSERT INTO users (
            id, diet_type, allergies, dislikes, preferred_cuisines,
            experience_level, goals, cooking_skill, preferred_cooking_time,
            people_count, daily_suggestion_enabled, daily_suggestion_time,
            weekly_plan_days, weekly_plan_enabled, measurement_system,
            onboarding_completed, apply_preferences_in_assistant, created_at, updated_at
          )
          VALUES (
            ${userId}::uuid,
            ${preferencesData.diet_type},
            ${preferencesData.allergies},
            ${preferencesData.dislikes},
            ${preferencesData.preferred_cuisines},
            ${preferencesData.experience_level},
            ${preferencesData.goals},
            ${preferencesData.cooking_skill},
            ${preferencesData.preferred_cooking_time},
            ${preferencesData.people_count},
            ${preferencesData.daily_suggestion_enabled},
            ${preferencesData.daily_suggestion_time},
            ${preferencesData.weekly_plan_days},
            ${preferencesData.weekly_plan_enabled},
            ${preferencesData.measurement_system},
            ${preferencesData.onboarding_completed},
            ${preferencesData.apply_preferences_in_assistant},
            NOW(),
            NOW()
          )
        `;
      } else {
        // Insert without apply_preferences_in_assistant column
        await sql`
          INSERT INTO users (
            id, diet_type, allergies, dislikes, preferred_cuisines,
            experience_level, goals, cooking_skill, preferred_cooking_time,
            people_count, daily_suggestion_enabled, daily_suggestion_time,
            weekly_plan_days, weekly_plan_enabled, measurement_system,
            onboarding_completed, created_at, updated_at
          )
          VALUES (
            ${userId}::uuid,
            ${preferencesData.diet_type},
            ${preferencesData.allergies},
            ${preferencesData.dislikes},
            ${preferencesData.preferred_cuisines},
            ${preferencesData.experience_level},
            ${preferencesData.goals},
            ${preferencesData.cooking_skill},
            ${preferencesData.preferred_cooking_time},
            ${preferencesData.people_count},
            ${preferencesData.daily_suggestion_enabled},
            ${preferencesData.daily_suggestion_time},
            ${preferencesData.weekly_plan_days},
            ${preferencesData.weekly_plan_enabled},
            ${preferencesData.measurement_system},
            ${preferencesData.onboarding_completed},
            NOW(),
            NOW()
          )
        `;
      }
    } else {
      // Update existing preferences
      if (hasApplyPreferencesColumn) {
        await sql`
          UPDATE users SET
            diet_type = ${preferencesData.diet_type},
            allergies = ${preferencesData.allergies},
            dislikes = ${preferencesData.dislikes},
            preferred_cuisines = ${preferencesData.preferred_cuisines},
            experience_level = ${preferencesData.experience_level},
            goals = ${preferencesData.goals},
            cooking_skill = ${preferencesData.cooking_skill},
            preferred_cooking_time = ${preferencesData.preferred_cooking_time},
            people_count = ${preferencesData.people_count},
            daily_suggestion_enabled = ${preferencesData.daily_suggestion_enabled},
            daily_suggestion_time = ${preferencesData.daily_suggestion_time},
            weekly_plan_enabled = ${preferencesData.weekly_plan_enabled},
            weekly_plan_days = ${preferencesData.weekly_plan_days},
            measurement_system = ${preferencesData.measurement_system},
            onboarding_completed = ${preferencesData.onboarding_completed},
            apply_preferences_in_assistant = ${preferencesData.apply_preferences_in_assistant},
            updated_at = NOW()
          WHERE id = ${userId}::uuid
        `;
      } else {
        // Update without apply_preferences_in_assistant column
        await sql`
          UPDATE users SET
            diet_type = ${preferencesData.diet_type},
            allergies = ${preferencesData.allergies},
            dislikes = ${preferencesData.dislikes},
            preferred_cuisines = ${preferencesData.preferred_cuisines},
            experience_level = ${preferencesData.experience_level},
            goals = ${preferencesData.goals},
            cooking_skill = ${preferencesData.cooking_skill},
            preferred_cooking_time = ${preferencesData.preferred_cooking_time},
            people_count = ${preferencesData.people_count},
            daily_suggestion_enabled = ${preferencesData.daily_suggestion_enabled},
            daily_suggestion_time = ${preferencesData.daily_suggestion_time},
            weekly_plan_enabled = ${preferencesData.weekly_plan_enabled},
            weekly_plan_days = ${preferencesData.weekly_plan_days},
            measurement_system = ${preferencesData.measurement_system},
            onboarding_completed = ${preferencesData.onboarding_completed},
            updated_at = NOW()
          WHERE id = ${userId}::uuid
        `;
      }
    }

    console.log("Successfully saved preferences for user:", userId);

    return Response.json({
      success: true,
      message: "Preferences saved successfully",
    });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return Response.json(
      { success: false, error: "Failed to save preferences: " + error.message },
      { status: 500 },
    );
  }
}

