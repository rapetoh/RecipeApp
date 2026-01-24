import sql from "../../utils/sql.js";

// POST /api/subscriptions/verify - Verify RevenueCat receipt and update subscription
// This will be called from the mobile app after a purchase
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, revenuecatCustomerId, subscriptionData } = body;

    if (!userId || !revenuecatCustomerId) {
      return Response.json(
        { success: false, error: "User ID and RevenueCat customer ID are required" },
        { status: 400 }
      );
    }

    // Update user's RevenueCat customer ID
    await sql`
      UPDATE users
      SET 
        revenuecat_customer_id = ${revenuecatCustomerId},
        updated_at = NOW()
      WHERE id = ${userId}::uuid
    `;

    // If subscription data is provided, update/create subscription record
    if (subscriptionData) {
      const {
        subscriptionId,
        plan,
        status,
        periodStart,
        periodEnd,
        cancelAtPeriodEnd,
        platform,
      } = subscriptionData;

      // Upsert subscription
      await sql`
        INSERT INTO subscriptions (
          user_id,
          revenuecat_customer_id,
          revenuecat_subscription_id,
          plan,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          platform
        )
        VALUES (
          ${userId}::uuid,
          ${revenuecatCustomerId},
          ${subscriptionId || null},
          ${plan},
          ${status},
          ${periodStart ? new Date(periodStart) : null}::timestamp,
          ${periodEnd ? new Date(periodEnd) : null}::timestamp,
          ${cancelAtPeriodEnd || false},
          ${platform || null}
        )
        ON CONFLICT (user_id, revenuecat_subscription_id)
        DO UPDATE SET
          plan = EXCLUDED.plan,
          status = EXCLUDED.status,
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          cancel_at_period_end = EXCLUDED.cancel_at_period_end,
          platform = EXCLUDED.platform,
          updated_at = NOW()
      `;

      // Update user's subscription status
      const subscriptionStatus = status === 'active' ? 'premium' : status === 'trial' ? 'trial' : 'expired';
      
      await sql`
        UPDATE users
        SET 
          subscription_status = ${subscriptionStatus},
          subscription_expires_at = ${periodEnd ? new Date(periodEnd) : null}::timestamp,
          updated_at = NOW()
        WHERE id = ${userId}::uuid
      `;

      // Log subscription event
      await sql`
        INSERT INTO subscription_history (
          user_id,
          event_type,
          plan,
          revenuecat_subscription_id,
          metadata
        )
        VALUES (
          ${userId}::uuid,
          'purchased',
          ${plan},
          ${subscriptionId || null},
          ${JSON.stringify(subscriptionData)}::jsonb
        )
      `;
    }

    return Response.json({
      success: true,
      message: "Subscription verified and updated",
    });
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return Response.json(
      { success: false, error: "Failed to verify subscription" },
      { status: 500 }
    );
  }
}

