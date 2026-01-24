import sql from "../../utils/sql.js";

// GET /api/subscriptions/usage - Get user's feature usage for current period
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const feature = searchParams.get("feature"); // Optional: get specific feature usage

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get current month period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get usage for current period
    let usageQuery;
    if (feature) {
      usageQuery = sql`
        SELECT 
          feature,
          usage_count,
          period_start,
          period_end
        FROM subscription_usage
        WHERE user_id = ${userId}::uuid
          AND feature = ${feature}
          AND period_start = ${periodStart.toISOString().split('T')[0]}::date
      `;
    } else {
      usageQuery = sql`
        SELECT 
          feature,
          usage_count,
          period_start,
          period_end
        FROM subscription_usage
        WHERE user_id = ${userId}::uuid
          AND period_start = ${periodStart.toISOString().split('T')[0]}::date
      `;
    }

    const usage = await usageQuery;

    // Define free tier limits
    const FREE_TIER_LIMITS = {
      voice_suggestions: 5,
      food_recognition: 3,
      ingredients_to_recipes: 3,
      recipe_generation: 3,
      today_suggestions: 10,
      meal_plan_ai: 5,
    };

    // Format response with limits
    const usageData = {};
    Object.keys(FREE_TIER_LIMITS).forEach((feat) => {
      const usageRecord = usage.find((u) => u.feature === feat);
      usageData[feat] = {
        count: usageRecord?.usage_count || 0,
        limit: FREE_TIER_LIMITS[feat],
        remaining: Math.max(0, FREE_TIER_LIMITS[feat] - (usageRecord?.usage_count || 0)),
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
      };
    });

    return Response.json({
      success: true,
      data: feature ? usageData[feature] : usageData,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return Response.json(
      { success: false, error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions/usage - Increment feature usage
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, feature } = body;

    if (!userId || !feature) {
      return Response.json(
        { success: false, error: "User ID and feature are required" },
        { status: 400 }
      );
    }

    // Validate feature name
    const validFeatures = [
      'voice_suggestions',
      'food_recognition',
      'ingredients_to_recipes',
      'recipe_generation',
      'today_suggestions',
      'meal_plan_ai',
    ];

    if (!validFeatures.includes(feature)) {
      return Response.json(
        { success: false, error: "Invalid feature name" },
        { status: 400 }
      );
    }

    // Get current month period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Upsert usage count
    const [result] = await sql`
      INSERT INTO subscription_usage (user_id, feature, usage_count, period_start, period_end)
      VALUES (
        ${userId}::uuid,
        ${feature},
        1,
        ${periodStart.toISOString().split('T')[0]}::date,
        ${periodEnd.toISOString().split('T')[0]}::date
      )
      ON CONFLICT (user_id, feature, period_start)
      DO UPDATE SET
        usage_count = subscription_usage.usage_count + 1,
        updated_at = NOW()
      RETURNING usage_count
    `;

    return Response.json({
      success: true,
      data: {
        feature,
        count: result.usage_count,
        periodStart: periodStart.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error("Error incrementing usage:", error);
    return Response.json(
      { success: false, error: "Failed to increment usage" },
      { status: 500 }
    );
  }
}

