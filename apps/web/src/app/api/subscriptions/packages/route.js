// GET /api/subscriptions/packages - Get available subscription packages (public endpoint)
// This endpoint fetches pricing from RevenueCat or returns fallback prices

export async function GET(request) {
  try {
    // Note: RevenueCat REST API doesn't directly provide offerings/packages
    // The mobile app uses the RevenueCat SDK which has access to offerings
    // For the web landing page, we'll use fallback prices that should match
    // what's configured in RevenueCat. These can be updated if needed.
    
    // Prices matching RevenueCat configuration
    return Response.json({
      success: true,
      packages: [
        {
          identifier: 'monthly',
          product: {
            identifier: 'premium_monthly',
            priceString: '$4.99',
            price: 4.99,
            currencyCode: 'USD',
          }
        },
        {
          identifier: 'yearly',
          product: {
            identifier: 'premium_yearly',
            priceString: '$49.99',
            price: 49.99,
            currencyCode: 'USD',
          }
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    // Return fallback prices on error
    return Response.json({
      success: true,
      packages: [
        {
          identifier: 'monthly',
          product: {
            identifier: 'premium_monthly',
            priceString: '$4.99',
            price: 4.99,
            currencyCode: 'USD',
          }
        },
        {
          identifier: 'yearly',
          product: {
            identifier: 'premium_yearly',
            priceString: '$49.99',
            price: 49.99,
            currencyCode: 'USD',
          }
        }
      ]
    });
  }
}
