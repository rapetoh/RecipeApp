import sql from "../utils/sql.js";

// GET /api/notification-preferences - Get user notification preferences
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 401 },
      );
    }

    console.log("Fetching notification preferences for user:", userId);

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

    // Check if notification_preferences column exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'notification_preferences'
    `;
    const hasNotificationPreferencesColumn = columnCheck.length > 0;

    if (!hasNotificationPreferencesColumn) {
      // Return default preferences if column doesn't exist yet
      return Response.json({
        success: true,
        data: getDefaultNotificationPreferences(),
      });
    }

    // Fetch user preferences
    const userPrefs = await sql`
      SELECT notification_preferences
      FROM users
      WHERE id = ${userId}::uuid
    `;

    if (userPrefs.length === 0) {
      // User exists but no preferences row yet
      return Response.json({
        success: true,
        data: getDefaultNotificationPreferences(),
      });
    }

    const prefs = userPrefs[0].notification_preferences;

    // Merge with defaults to ensure all fields exist
    const preferences = {
      ...getDefaultNotificationPreferences(),
      ...(prefs || {}),
    };

    return Response.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return Response.json(
      { success: false, error: "Failed to fetch notification preferences" },
      { status: 500 },
    );
  }
}

// POST /api/notification-preferences - Save user notification preferences
export async function POST(request) {
  try {
    const body = await request.json();
    const userId = body.userId;
    const preferences = body.preferences;

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 401 },
      );
    }

    if (!preferences || typeof preferences !== "object") {
      return Response.json(
        { success: false, error: "Preferences object is required" },
        { status: 400 },
      );
    }

    console.log("Saving notification preferences for user:", userId);

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

    // Check if notification_preferences column exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'notification_preferences'
    `;
    const hasNotificationPreferencesColumn = columnCheck.length > 0;

    if (!hasNotificationPreferencesColumn) {
      return Response.json(
        {
          success: false,
          error:
            "Notification preferences column not found. Please run the migration first.",
        },
        { status: 500 },
      );
    }

    // Validate and merge with defaults to ensure structure
    const defaultPrefs = getDefaultNotificationPreferences();
    const mergedPreferences = {
      ...defaultPrefs,
      ...preferences,
    };

    // Check if user preferences row exists
    const existingPrefs = await sql`
      SELECT id FROM users WHERE id = ${userId}::uuid
    `;

    if (existingPrefs.length === 0) {
      // Insert new user row with notification preferences
      await sql`
        INSERT INTO users (id, notification_preferences, created_at, updated_at)
        VALUES (${userId}::uuid, ${JSON.stringify(
        mergedPreferences,
      )}::jsonb, NOW(), NOW())
      `;
    } else {
      // Update existing user row
      await sql`
        UPDATE users 
        SET notification_preferences = ${JSON.stringify(
          mergedPreferences,
        )}::jsonb,
            updated_at = NOW()
        WHERE id = ${userId}::uuid
      `;
    }

    console.log("Successfully saved notification preferences for user:", userId);

    return Response.json({
      success: true,
      message: "Notification preferences saved successfully",
      data: mergedPreferences,
    });
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to save notification preferences: " + error.message,
      },
      { status: 500 },
    );
  }
}

// Default notification preferences structure
function getDefaultNotificationPreferences() {
  return {
    // Daily suggestions
    dailySuggestions: {
      enabled: true,
      time: "18:00",
      days: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },

    // Meal reminders
    mealReminders: {
      breakfast: { enabled: true, time: "08:00" },
      lunch: { enabled: true, time: "12:30" },
      dinner: { enabled: true, time: "18:30" },
    },

    // Grocery lists
    groceryReminders: {
      enabled: true,
      weeklyGeneration: true,
      beforeShopping: true,
    },

    // Meal planning
    mealPlanningReminders: {
      enabled: true,
      weeklyPlanning: true,
      dayBefore: true,
    },

    // App notifications
    pushNotifications: true,
    emailNotifications: false,
    marketingEmails: false,
  };
}

