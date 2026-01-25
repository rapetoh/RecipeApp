import sql from "../../utils/sql.js";

// POST /api/subscriptions/webhook - Handle RevenueCat webhooks
// This endpoint receives events from RevenueCat when subscription status changes
export async function POST(request) {
  try {
    const body = await request.json();
    const { event } = body;

    // Verify webhook signature (you should add this in production)
    // const signature = request.headers.get('authorization');
    // if (!verifyWebhookSignature(signature, body)) {
    //   return Response.json({ error: "Invalid signature" }, { status: 401 });
    // }

    if (!event) {
      return Response.json(
        { success: false, error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Handle test events from RevenueCat dashboard
    // Test events have type: "TEST" and don't have customer_id
    if (event.type === 'TEST') {
      console.log('[Webhook] Received test event, acknowledging');
      return Response.json({ 
        success: true, 
        message: "Test event received and acknowledged" 
      });
    }

    // Real events must have customer_id
    if (!event.customer_id) {
      return Response.json(
        { success: false, error: "Invalid webhook payload: missing customer_id" },
        { status: 400 }
      );
    }

    const { customer_id, type, app_user_id } = event;

    // Get user by RevenueCat customer ID
    const [user] = await sql`
      SELECT id FROM users
      WHERE revenuecat_customer_id = ${customer_id}
    `;

    if (!user) {
      console.warn(`User not found for RevenueCat customer: ${customer_id}`);
      return Response.json({ success: true, message: "User not found, skipping" });
    }

    const userId = user.id;

    // Handle different event types
    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        await handleSubscriptionActive(event, userId, customer_id);
        break;

      case 'CANCELLATION':
        await handleSubscriptionCancelled(event, userId, customer_id);
        break;

      case 'EXPIRATION':
        await handleSubscriptionExpired(event, userId, customer_id);
        break;

      case 'BILLING_ISSUE':
        await handleBillingIssue(event, userId, customer_id);
        break;

      case 'SUBSCRIPTION_REACTIVATED':
        await handleSubscriptionReactivated(event, userId, customer_id);
        break;

      default:
        console.log(`Unhandled webhook event type: ${type}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return Response.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionActive(event, userId, customerId) {
  const { product_id, expires_date, period_type } = event;
  const plan = period_type === 'NORMAL' ? 'monthly' : 'yearly';
  const periodEnd = expires_date ? new Date(expires_date * 1000) : null;

  // Update subscription
  await sql`
    INSERT INTO subscriptions (
      user_id,
      revenuecat_customer_id,
      revenuecat_subscription_id,
      plan,
      status,
      current_period_start,
      current_period_end,
      platform
    )
    VALUES (
      ${userId}::uuid,
      ${customerId},
      ${event.transaction_id || null},
      ${plan},
      'active',
      NOW(),
      ${periodEnd}::timestamp,
      ${event.store || null}
    )
    ON CONFLICT (user_id, revenuecat_subscription_id)
    DO UPDATE SET
      status = 'active',
      current_period_end = ${periodEnd}::timestamp,
      updated_at = NOW()
  `;

  // Update user status
  await sql`
    UPDATE users
    SET 
      subscription_status = 'premium',
      subscription_expires_at = ${periodEnd}::timestamp,
      updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;

  // Log event
  await sql`
    INSERT INTO subscription_history (user_id, event_type, plan, metadata)
    VALUES (
      ${userId}::uuid,
      ${event.type === 'INITIAL_PURCHASE' ? 'purchased' : 'renewed'},
      ${plan},
      ${JSON.stringify(event)}::jsonb
    )
  `;
}

async function handleSubscriptionCancelled(event, userId, customerId) {
  await sql`
    UPDATE subscriptions
    SET 
      cancel_at_period_end = true,
      updated_at = NOW()
    WHERE user_id = ${userId}::uuid
      AND revenuecat_customer_id = ${customerId}
      AND status = 'active'
  `;

  await sql`
    INSERT INTO subscription_history (user_id, event_type, metadata)
    VALUES (
      ${userId}::uuid,
      'canceled',
      ${JSON.stringify(event)}::jsonb
    )
  `;
}

async function handleSubscriptionExpired(event, userId, customerId) {
  await sql`
    UPDATE subscriptions
    SET 
      status = 'expired',
      updated_at = NOW()
    WHERE user_id = ${userId}::uuid
      AND revenuecat_customer_id = ${customerId}
  `;

  await sql`
    UPDATE users
    SET 
      subscription_status = 'expired',
      updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;

  await sql`
    INSERT INTO subscription_history (user_id, event_type, metadata)
    VALUES (
      ${userId}::uuid,
      'expired',
      ${JSON.stringify(event)}::jsonb
    )
  `;
}

async function handleBillingIssue(event, userId, customerId) {
  // Log billing issue but don't change status yet
  await sql`
    INSERT INTO subscription_history (user_id, event_type, metadata)
    VALUES (
      ${userId}::uuid,
      'billing_issue',
      ${JSON.stringify(event)}::jsonb
    )
  `;
}

async function handleSubscriptionReactivated(event, userId, customerId) {
  await sql`
    UPDATE subscriptions
    SET 
      status = 'active',
      cancel_at_period_end = false,
      updated_at = NOW()
    WHERE user_id = ${userId}::uuid
      AND revenuecat_customer_id = ${customerId}
  `;

  await sql`
    UPDATE users
    SET 
      subscription_status = 'premium',
      updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;

  await sql`
    INSERT INTO subscription_history (user_id, event_type, metadata)
    VALUES (
      ${userId}::uuid,
      'reactivated',
      ${JSON.stringify(event)}::jsonb
    )
  `;
}

