// RevenueCat REST API client
// Note: You'll need to set REVENUECAT_API_KEY in your environment variables
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;
const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';

/**
 * Get customer info from RevenueCat via REST API
 * @param {string} customerId - RevenueCat customer ID (app user ID)
 * @param {string} appUserId - App user ID (your internal user ID)
 * @returns {Promise<object>} Customer info with entitlements
 */
export async function getCustomerInfo(customerId, appUserId) {
  if (!REVENUECAT_API_KEY) {
    throw new Error('RevenueCat API key not configured');
  }

  try {
    // RevenueCat REST API: Get customer info
    // Use appUserId if provided, otherwise use customerId
    const userId = appUserId || customerId;
    
    const response = await fetch(`${REVENUECAT_API_BASE}/subscribers/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RevenueCat API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.subscriber;
  } catch (error) {
    console.error('Error fetching customer info from RevenueCat:', error);
    throw error;
  }
}

/**
 * Verify purchase and get subscription status
 * @param {string} customerId - RevenueCat customer ID (app user ID)
 * @param {string} appUserId - App user ID (your internal user ID)
 * @returns {Promise<{isPremium: boolean, plan: string|null, expiresAt: Date|null}>}
 */
export async function getSubscriptionStatus(customerId, appUserId) {
  if (!REVENUECAT_API_KEY) {
    return { isPremium: false, plan: null, expiresAt: null };
  }

  try {
    const customer = await getCustomerInfo(customerId, appUserId);
    
    // Check if user has premium entitlement
    const premiumEntitlement = customer.entitlements?.premium;
    const isPremium = premiumEntitlement?.isActive || false;
    
    // Get subscription info
    const activeSubscriptions = customer.subscriptions || {};
    const activeSubscription = Object.values(activeSubscriptions).find(
      sub => sub.isActive === true
    );
    
    const plan = activeSubscription?.productIdentifier?.includes('yearly') 
      ? 'yearly' 
      : activeSubscription?.productIdentifier?.includes('monthly')
      ? 'monthly'
      : null;
      
    const expiresAt = premiumEntitlement?.expiresDate 
      ? new Date(premiumEntitlement.expiresDate) 
      : null;

    return {
      isPremium,
      plan: isPremium ? plan : null,
      expiresAt,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { isPremium: false, plan: null, expiresAt: null };
  }
}

/**
 * Sync subscription status from RevenueCat to database
 * Validates our database against RevenueCat and updates if mismatch
 * @param {string} userId - Internal user ID
 * @param {string} revenuecatCustomerId - RevenueCat customer ID
 * @returns {Promise<{synced: boolean, wasActive: boolean, isActive: boolean}>}
 */
export async function syncSubscriptionFromRevenueCat(userId, revenuecatCustomerId) {
  if (!REVENUECAT_API_KEY) {
    console.warn('[Sync] RevenueCat API key not configured, skipping sync');
    return { synced: false, wasActive: false, isActive: false };
  }

  try {
    // Get current status from RevenueCat
    const customer = await getCustomerInfo(revenuecatCustomerId, userId);
    
    // Get first active entitlement (dynamic, not hardcoded)
    const activeEntitlements = customer.entitlements?.active || {};
    const activeEntitlement = Object.values(activeEntitlements)[0] || null;
    const isActiveInRevenueCat = activeEntitlement?.isActive === true;
    
    // Get subscription info
    const subscriptions = customer.subscriptions || {};
    const activeSubscription = Object.values(subscriptions).find(
      sub => sub.isActive === true
    );
    
    const plan = activeSubscription?.productIdentifier?.includes('yearly') 
      ? 'yearly' 
      : activeSubscription?.productIdentifier?.includes('monthly')
      ? 'monthly'
      : null;
    
    const expiresAt = activeEntitlement?.expiresDate 
      ? new Date(activeEntitlement.expiresDate) 
      : null;
    
    const periodStart = activeSubscription?.purchaseDate 
      ? new Date(activeSubscription.purchaseDate) 
      : null;
    
    const periodEnd = activeSubscription?.expiresDate 
      ? new Date(activeSubscription.expiresDate) 
      : expiresAt;
    
    const cancelAtPeriodEnd = activeSubscription?.willRenew === false;
    
    // Import sql here to avoid circular dependency
    const sql = (await import('./sql.js')).default;
    
    // Get current database status
    const [dbUser] = await sql`
      SELECT subscription_status, subscription_expires_at
      FROM users
      WHERE id = ${userId}::uuid
    `;
    
    const wasActiveInDb = dbUser?.subscription_status === 'premium' || 
                          dbUser?.subscription_status === 'trial';
    
    // Sync database if there's a mismatch
    if (isActiveInRevenueCat) {
      // RevenueCat says active - update database
      await sql`
        UPDATE users
        SET 
          subscription_status = 'premium',
          subscription_expires_at = ${expiresAt}::timestamp,
          updated_at = NOW()
        WHERE id = ${userId}::uuid
      `;
      
      if (activeSubscription) {
        // Determine platform from subscription store
        const platform = activeSubscription.store === 'APP_STORE' ? 'ios' : 
                        activeSubscription.store === 'PLAY_STORE' ? 'android' : 
                        null;
        
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
            ${activeSubscription.productIdentifier || 'premium'},
            ${plan},
            'active',
            ${periodStart}::timestamp,
            ${periodEnd}::timestamp,
            ${cancelAtPeriodEnd || false},
            ${platform}
          )
          ON CONFLICT (user_id, revenuecat_subscription_id)
          DO UPDATE SET
            status = 'active',
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            cancel_at_period_end = EXCLUDED.cancel_at_period_end,
            platform = EXCLUDED.platform,
            updated_at = NOW()
        `;
      }
      
      console.log(`[Sync] Synced subscription to active for user ${userId}`);
      return { synced: true, wasActive: wasActiveInDb, isActive: true };
    } else {
      // RevenueCat says expired - update database
      await sql`
        UPDATE users
        SET 
          subscription_status = 'expired',
          subscription_expires_at = NULL,
          updated_at = NOW()
        WHERE id = ${userId}::uuid
      `;
      
      await sql`
        UPDATE subscriptions
        SET 
          status = 'expired',
          updated_at = NOW()
        WHERE user_id = ${userId}::uuid
          AND status = 'active'
      `;
      
      console.log(`[Sync] Synced subscription to expired for user ${userId}`);
      return { synced: true, wasActive: wasActiveInDb, isActive: false };
    }
  } catch (error) {
    console.error('[Sync] Error syncing subscription from RevenueCat:', error);
    return { synced: false, wasActive: false, isActive: false };
  }
}

/**
 * Verify webhook signature (for production)
 * @param {string} signature - Webhook signature from headers
 * @param {object} payload - Webhook payload
 * @returns {boolean} Whether signature is valid
 */
export function verifyWebhookSignature(signature, payload) {
  // TODO: Implement webhook signature verification
  // RevenueCat provides webhook signing secret in dashboard
  // For now, return true (implement proper verification in production)
  return true;
}

