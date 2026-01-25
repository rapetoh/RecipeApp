import sql from "../../utils/sql.js";
import { syncSubscriptionFromRevenueCat } from "../../utils/revenuecat.js";

// GET /api/subscriptions/check - Check user's subscription status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user's subscription status from users table
    const [user] = await sql`
      SELECT 
        subscription_status,
        revenuecat_customer_id,
        subscription_expires_at
      FROM users
      WHERE id = ${userId}::uuid
    `;

    if (!user) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // If user has a subscription in our DB, validate with RevenueCat
    const hasSubscriptionInDb = user.subscription_status === 'premium' || 
                                user.subscription_status === 'trial';
    
    if (hasSubscriptionInDb && user.revenuecat_customer_id) {
      // Validate with RevenueCat and sync if needed
      await syncSubscriptionFromRevenueCat(userId, user.revenuecat_customer_id);
      
      // Re-fetch user data after sync
      const [updatedUser] = await sql`
        SELECT 
          subscription_status,
          subscription_expires_at
        FROM users
        WHERE id = ${userId}::uuid
      `;
      
      // Update user reference for rest of function
      if (updatedUser) {
        user.subscription_status = updatedUser.subscription_status;
        user.subscription_expires_at = updatedUser.subscription_expires_at;
      }
    }

    // Get active subscription if exists
    const [activeSubscription] = await sql`
      SELECT 
        plan,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        platform,
        revenuecat_subscription_id,
        created_at
      FROM subscriptions
      WHERE user_id = ${userId}::uuid
        AND status = 'active'
      ORDER BY current_period_end DESC
      LIMIT 1
    `;

    // Check if subscription is expired
    const isExpired = user.subscription_expires_at 
      ? new Date(user.subscription_expires_at) < new Date()
      : false;

    const effectiveStatus = isExpired ? 'expired' : user.subscription_status;

    return Response.json({
      success: true,
      data: {
        status: effectiveStatus,
        isPremium: effectiveStatus === 'premium' || effectiveStatus === 'trial',
        plan: activeSubscription?.plan || null,
        expiresAt: user.subscription_expires_at,
        renewalDate: activeSubscription?.current_period_end || null,
        cancelAtPeriodEnd: activeSubscription?.cancel_at_period_end || false,
        platform: activeSubscription?.platform || null,
        subscriptionId: activeSubscription?.revenuecat_subscription_id || null,
        memberSince: activeSubscription?.created_at || null,
        currentPeriodStart: activeSubscription?.current_period_start || null,
      },
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return Response.json(
      { success: false, error: "Failed to check subscription" },
      { status: 500 }
    );
  }
}

