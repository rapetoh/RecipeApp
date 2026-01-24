import sql from "./sql.js";

/**
 * Check if user has access to a premium feature
 * @param {string} userId - User ID
 * @param {string} feature - Feature name (voice_suggestions, food_recognition, etc.)
 * @returns {Promise<{hasAccess: boolean, reason?: string, usage?: object}>}
 */
export async function checkFeatureAccess(userId, feature) {
  if (!userId) {
    return { hasAccess: false, reason: "User not authenticated" };
  }

  try {
    // Get user's subscription status
    const [user] = await sql`
      SELECT 
        subscription_status,
        subscription_expires_at
      FROM users
      WHERE id = ${userId}::uuid
    `;

    if (!user) {
      return { hasAccess: false, reason: "User not found" };
    }

    // Check if subscription is expired
    const isExpired = user.subscription_expires_at 
      ? new Date(user.subscription_expires_at) < new Date()
      : false;

    const effectiveStatus = isExpired ? 'expired' : user.subscription_status;

    // Premium users have unlimited access
    if (effectiveStatus === 'premium' || effectiveStatus === 'trial') {
      return { hasAccess: true };
    }

    // Free users have limits - check usage
    const FREE_TIER_LIMITS = {
      voice_suggestions: 5,
      food_recognition: 3,
      ingredients_to_recipes: 3,
      recipe_generation: 3,
      today_suggestions: 10,
      meal_plan_ai: 5,
    };

    const limit = FREE_TIER_LIMITS[feature];
    if (!limit) {
      // Feature not limited, allow access
      return { hasAccess: true };
    }

    // Get current month period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get usage for current period
    const [usage] = await sql`
      SELECT usage_count
      FROM subscription_usage
      WHERE user_id = ${userId}::uuid
        AND feature = ${feature}
        AND period_start = ${periodStart.toISOString().split('T')[0]}::date
    `;

    const currentUsage = usage?.usage_count || 0;
    const remaining = limit - currentUsage;

    if (remaining <= 0) {
      return {
        hasAccess: false,
        reason: "Free tier limit reached",
        usage: {
          count: currentUsage,
          limit,
          remaining: 0,
        },
      };
    }

    return {
      hasAccess: true,
      usage: {
        count: currentUsage,
        limit,
        remaining,
      },
    };
  } catch (error) {
    console.error("Error checking feature access:", error);
    // On error, allow access (fail open) but log it
    return { hasAccess: true, reason: "Error checking access, allowing" };
  }
}

/**
 * Track feature usage (increment counter)
 * @param {string} userId - User ID
 * @param {string} feature - Feature name
 */
export async function trackFeatureUsage(userId, feature) {
  if (!userId || !feature) {
    return;
  }

  try {
    // Get current month period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Upsert usage count
    await sql`
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
    `;
  } catch (error) {
    console.error("Error tracking feature usage:", error);
    // Don't throw - usage tracking failure shouldn't break the feature
  }
}

