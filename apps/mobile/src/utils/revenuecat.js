import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApiUrl } from '@/config/api';

// RevenueCat API keys from app.json extra section
const REVENUECAT_API_KEY_IOS = Constants.expoConfig?.extra?.REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = Constants.expoConfig?.extra?.REVENUECAT_API_KEY_ANDROID || '';

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when app starts (after user logs in)
 * @param {string} userId - User ID from your auth system
 */
export async function initializeRevenueCat(userId) {
  try {
    if (isInitialized) {
      // Already initialized, just update user ID
      await Purchases.logIn(userId);
      return true;
    }

    // Get API key based on platform
    const apiKey = Platform.OS === 'ios' 
      ? REVENUECAT_API_KEY_IOS 
      : REVENUECAT_API_KEY_ANDROID;

    if (!apiKey) {
      console.warn('RevenueCat API key not configured for this platform');
      return false;
    }

    // Configure RevenueCat
    await Purchases.configure({ apiKey });

    // Set user ID
    if (userId) {
      await Purchases.logIn(userId);
    }

    isInitialized = true;
    console.log('RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
    isInitialized = false;
    return false;
  }
}

/**
 * Verify that RevenueCat is actually ready to use
 * @returns {Promise<boolean>} True if RevenueCat is ready
 */
export async function isRevenueCatReady() {
  try {
    // Try to get customer info - if this works, RevenueCat is ready
    await Purchases.getCustomerInfo();
    return isInitialized;
  } catch (error) {
    // If we get a "not configured" error, it's not ready
    if (error.message?.includes('singleton') || error.message?.includes('configure')) {
      return false;
    }
    // Other errors might be network issues, but SDK is ready
    return isInitialized;
  }
}

/**
 * Get available subscription packages
 * @param {number} retryCount - Current retry attempt (internal use)
 * @param {number} maxRetries - Maximum number of retries for error 7746
 * @returns {Promise<Array>} Array of available packages
 */
export async function getSubscriptionPackages(retryCount = 0, maxRetries = 3) {
  try {
    if (!isInitialized) {
      throw new Error('RevenueCat not initialized. Call initializeRevenueCat() first.');
    }
    
    const offerings = await Purchases.getOfferings();
    
    // Explicitly get the "main" offering instead of using "current"
    const mainOffering = offerings.all['main'] || offerings.current;
    
    if (!mainOffering || mainOffering.availablePackages.length === 0) {
      console.warn('No packages available in main offering');
      return [];
    }

    // Get packages from main offering
    const packages = mainOffering.availablePackages;
    
    return packages.map(pkg => ({
      // Store original package for RevenueCat SDK calls
      _originalPackage: pkg,
      identifier: pkg.identifier,
      product: {
        identifier: pkg.product.identifier,
        title: pkg.product.title,
        description: pkg.product.description,
        price: pkg.product.price,
        priceString: pkg.product.priceString,
        currencyCode: pkg.product.currencyCode,
        introPrice: pkg.product.introPrice,
      },
      packageType: pkg.packageType,
    }));
  } catch (error) {
    // Check if this is error 7746 (fetch token being ingested)
    const errorMessage = error?.message || error?.toString() || '';
    const isTokenIngestionError = errorMessage.includes('7746') || 
                                   errorMessage.includes('fetch token is currently being ingested') ||
                                   errorMessage.includes('being ingested');
    
    if (isTokenIngestionError && retryCount < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`[RevenueCat] Error 7746 detected, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return getSubscriptionPackages(retryCount + 1, maxRetries);
    }
    
    // If not error 7746, or max retries reached, log and return empty array
    console.error('Error fetching subscription packages:', error);
    if (isTokenIngestionError && retryCount >= maxRetries) {
      console.warn('[RevenueCat] Max retries reached for error 7746. RevenueCat backend may still be processing.');
    }
    return [];
  }
}

/**
 * Get the first active entitlement from customerInfo
 * @param {object} customerInfo - RevenueCat customer info
 * @returns {object|null} First active entitlement or null
 */
function getActiveEntitlement(customerInfo) {
  const activeEntitlements = customerInfo.entitlements?.active;
  if (!activeEntitlements || Object.keys(activeEntitlements).length === 0) {
    return null;
  }
  // Get the first active entitlement (there should only be one for premium)
  return Object.values(activeEntitlements)[0];
}

/**
 * Wait for subscription to appear in customerInfo with retry logic
 * @param {string} userId - User ID to verify
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<object|null>} CustomerInfo with subscription or null if not found
 */
async function waitForSubscriptionInCustomerInfo(userId, maxRetries = 5, initialDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Wait with exponential backoff
    const delay = initialDelay * Math.pow(2, attempt);
    if (attempt > 0) {
      console.log(`[RevenueCat] Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const activeEntitlement = getActiveEntitlement(customerInfo);
      
      if (activeEntitlement) {
        console.log(`[RevenueCat] Subscription found in customerInfo after ${attempt + 1} attempt(s) - Entitlement: ${activeEntitlement.identifier}`);
        return customerInfo;
      }
      
      if (attempt < maxRetries - 1) {
        console.log(`[RevenueCat] Subscription not found yet, will retry...`);
      }
    } catch (error) {
      console.error(`[RevenueCat] Error fetching customerInfo (attempt ${attempt + 1}):`, error);
      if (attempt === maxRetries - 1) {
        throw error;
      }
    }
  }
  
  console.warn(`[RevenueCat] Subscription not found after ${maxRetries} attempts`);
  return null;
}

/**
 * Purchase a subscription package
 * @param {object} packageToPurchase - Package to purchase
 * @param {string} userId - User ID from auth context (optional, will use originalAppUserId if not provided)
 * @returns {Promise<{success: boolean, customerInfo?: object, error?: string}>}
 */
export async function purchasePackage(packageToPurchase, userId = null) {
  try {
    // Use original package if available, otherwise use the package directly
    const packageForPurchase = packageToPurchase._originalPackage || packageToPurchase;
    const { customerInfo: initialCustomerInfo } = await Purchases.purchasePackage(packageForPurchase);
    
    // Get the actual user ID
    const actualUserId = userId || initialCustomerInfo.originalAppUserId;
    
    if (!actualUserId) {
      console.error('[RevenueCat] Cannot verify purchase: userId is missing');
      return {
        success: true,
        customerInfo: initialCustomerInfo,
      };
    }
    
    // Wait for subscription to appear in customerInfo with retry logic
    console.log('[RevenueCat] Waiting for subscription to appear in customerInfo...');
    const customerInfoWithSubscription = await waitForSubscriptionInCustomerInfo(actualUserId);
    
    // Use the customerInfo with subscription if available, otherwise use initial
    const finalCustomerInfo = customerInfoWithSubscription || initialCustomerInfo;
    
    // Verify purchase with backend
    await verifyPurchaseWithBackend(finalCustomerInfo, actualUserId);
    
    return {
      success: true,
      customerInfo: finalCustomerInfo,
    };
  } catch (error) {
    console.error('Error purchasing package:', error);
    
    // Check if user cancelled
    if (error.userCancelled) {
      return {
        success: false,
        error: 'Purchase cancelled',
        userCancelled: true,
      };
    }

    return {
      success: false,
      error: error.message || 'Purchase failed',
    };
  }
}

/**
 * Restore purchases
 * @param {string} userId - User ID from auth context (optional)
 * @returns {Promise<{success: boolean, customerInfo?: object, error?: string}>}
 */
export async function restorePurchases(userId = null) {
  try {
    // First, check if we have subscription in our database
    const apiUrl = getApiUrl();
    let dbHasSubscription = false;
    
    if (userId) {
      try {
        const checkResponse = await fetch(
          `${apiUrl}/api/subscriptions/check?userId=${userId}`
        );
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          dbHasSubscription = checkData.data?.isPremium === true;
        }
      } catch (error) {
        console.warn('[RevenueCat] Could not check database status:', error);
      }
    }
    
    // Now try to restore from RevenueCat
    const customerInfo = await Purchases.restorePurchases();
    
    // Get the actual user ID
    const actualUserId = userId || customerInfo.originalAppUserId;
    
    if (actualUserId) {
      // Wait for subscription to appear if restoring
      const customerInfoWithSubscription = await waitForSubscriptionInCustomerInfo(actualUserId, 3, 500);
      const finalCustomerInfo = customerInfoWithSubscription || customerInfo;
      
      // Check if we actually found an active subscription
      const activeEntitlement = getActiveEntitlement(finalCustomerInfo);
      
      if (!activeEntitlement) {
        // No active subscription in RevenueCat
        // If our DB had one, it was stale - backend sync will handle it
        console.log('[RevenueCat] No active subscription found after restore');
        
        // If DB had subscription but RevenueCat doesn't, trigger sync
        if (dbHasSubscription) {
          try {
            // Trigger sync by calling check endpoint (which validates with RevenueCat)
            await fetch(`${apiUrl}/api/subscriptions/check?userId=${actualUserId}`);
          } catch (error) {
            console.warn('[RevenueCat] Could not trigger sync:', error);
          }
        }
        
        return {
          success: false,
          error: 'No active subscription found. If you have a subscription, make sure you\'re signed in with the same Apple ID used to purchase it.',
          customerInfo: finalCustomerInfo,
        };
      }
      
      // Found active subscription - verify with backend
      await verifyPurchaseWithBackend(finalCustomerInfo, actualUserId);
      
      return {
        success: true,
        customerInfo: finalCustomerInfo,
      };
    }
    
    // If no userId, check if there's an active entitlement anyway
    const activeEntitlement = getActiveEntitlement(customerInfo);
    if (!activeEntitlement) {
      return {
        success: false,
        error: 'No active subscription found. If you have a subscription, make sure you\'re signed in with the same Apple ID used to purchase it.',
        customerInfo,
      };
    }
    
    return {
      success: true,
      customerInfo,
    };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return {
      success: false,
      error: error.message || 'Failed to restore purchases',
    };
  }
}

/**
 * Get current customer info
 * @returns {Promise<object>} Customer info with entitlements
 */
export async function getCustomerInfo() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
}

/**
 * Check if user has premium entitlement
 * @returns {Promise<boolean>} Whether user has active premium subscription
 */
export async function hasPremiumAccess() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlement = getActiveEntitlement(customerInfo);
    return activeEntitlement !== null && activeEntitlement.isActive === true;
  } catch (error) {
    console.error('Error checking premium access:', error);
    return false;
  }
}

/**
 * Verify purchase with backend
 * @param {object} customerInfo - RevenueCat customer info
 * @param {string} userId - User ID from auth context
 */
async function verifyPurchaseWithBackend(customerInfo, userId) {
  try {
    const apiUrl = getApiUrl();
    
    if (!userId) {
      console.error('[RevenueCat] Cannot verify purchase: userId is missing');
      return;
    }

    console.log('[RevenueCat] Verifying purchase with backend for userId:', userId);
    
    // Extract subscription data - get first active entitlement
    const activeSubscription = getActiveEntitlement(customerInfo);
    
    if (!activeSubscription) {
      console.warn('[RevenueCat] No active subscription found in customerInfo. Entitlements:', 
        JSON.stringify(customerInfo.entitlements, null, 2));
      return;
    }
    
    console.log('[RevenueCat] Found active entitlement:', activeSubscription.identifier);

    // Get cancellation status from entitlement or subscription
    // RevenueCat provides willRenew property on entitlements
    // If willRenew is false, it means subscription will cancel at period end
    const willRenew = activeSubscription.willRenew !== false; // Default to true if undefined
    const cancelAtPeriodEnd = !willRenew;

    // Also check subscriptions object for more detailed cancellation info
    const productIdentifier = activeSubscription.productIdentifier;
    const subscriptions = customerInfo.subscriptions || {};
    const subscription = subscriptions[productIdentifier];
    const actualCancelAtPeriodEnd = subscription?.willRenew === false || cancelAtPeriodEnd;

    const subscriptionData = {
      subscriptionId: activeSubscription.identifier,
      plan: activeSubscription.productIdentifier?.includes('yearly') ? 'yearly' : 'monthly',
      status: 'active',
      periodStart: activeSubscription.latestPurchaseDate,
      periodEnd: activeSubscription.expirationDate,
      cancelAtPeriodEnd: actualCancelAtPeriodEnd,
      platform: Platform.OS,
    };

    console.log('[RevenueCat] Subscription data:', JSON.stringify(subscriptionData, null, 2));

    // Send to backend to verify and update database
    const response = await fetch(`${apiUrl}/api/subscriptions/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        revenuecatCustomerId: customerInfo.originalAppUserId,
        subscriptionData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[RevenueCat] Failed to verify purchase with backend:', response.status, errorText);
      throw new Error(`Backend verification failed: ${response.status} - ${errorText}`);
    } else {
      const result = await response.json();
      console.log('[RevenueCat] Purchase verified successfully:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('[RevenueCat] Error verifying purchase with backend:', error);
    // Don't throw - we don't want to fail the purchase if verification fails
    // The subscription is still valid in RevenueCat, backend sync can happen later
  }
}

/**
 * Log out user from RevenueCat
 */
export async function logoutRevenueCat() {
  try {
    await Purchases.logOut();
    isInitialized = false;
  } catch (error) {
    console.error('Error logging out from RevenueCat:', error);
  }
}

