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

