# RevenueCat Setup Guide

This guide will help you set up RevenueCat for subscription management.

## Prerequisites

1. **RevenueCat Account**: Sign up at https://www.revenuecat.com
2. **App Store Connect** (for iOS): Set up in-app purchases
3. **Google Play Console** (for Android): Set up subscriptions
4. **Stripe Account** (for web): Set up for web subscriptions

## Step 1: Create RevenueCat Project

1. Go to RevenueCat dashboard
2. Create a new project
3. Add your app (iOS and/or Android)
4. Note your **Public API Key** and **Secret API Key**

## Step 2: Configure Environment Variables

### Backend (.env)
```env
REVENUECAT_API_KEY=your_secret_api_key_here
```

### Mobile (.env or app.json)
```env
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=your_ios_public_key_here
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=your_android_public_key_here
```

## Step 3: Set Up Products in RevenueCat

1. In RevenueCat dashboard, go to **Products**
2. Create products:
   - `premium_monthly` - Monthly subscription ($9.99/month)
   - `premium_yearly` - Yearly subscription ($99/year)
3. Create entitlement: `premium`
4. Attach products to entitlement

## Step 4: Configure App Store / Play Store

### iOS (App Store Connect)
1. Create in-app purchase products:
   - Monthly subscription: `com.rapetoh.pocketchef.premium.monthly`
   - Yearly subscription: `com.rapetoh.pocketchef.premium.yearly`
2. Link products in RevenueCat dashboard

### Android (Google Play Console)
1. Create subscription products:
   - Monthly subscription: `premium_monthly`
   - Yearly subscription: `premium_yearly`
2. Link products in RevenueCat dashboard

## Step 5: Configure Webhooks

1. In RevenueCat dashboard, go to **Project Settings** → **Webhooks**
2. Add webhook URL: `https://your-api-domain.com/api/subscriptions/webhook`
3. Enable events:
   - `INITIAL_PURCHASE`
   - `RENEWAL`
   - `CANCELLATION`
   - `EXPIRATION`
   - `BILLING_ISSUE`
   - `SUBSCRIPTION_REACTIVATED`

## Step 6: Run Database Migration

Run the subscription migration:
```sql
-- Run this file:
database/migrations/004_add_subscriptions.sql
```

## Step 7: Test

1. Use RevenueCat sandbox/test accounts
2. Test purchases on iOS (sandbox)
3. Test purchases on Android (test accounts)
4. Test webhook handling

## Free Tier Limits

The following limits apply to free users:
- Voice Suggestions: 5/month
- Food Recognition: 3/month
- Ingredients to Recipes: 3/month
- Recipe Generation: 3/month
- Today's Suggestions: 10/month
- Meal Plan AI: 5/month

Premium users have unlimited access to all features.

## Troubleshooting

### RevenueCat not initializing
- Check API keys are set correctly
- Verify platform (iOS/Android) matches API key
- Check network connectivity

### Purchases not working
- Verify products are configured in RevenueCat
- Check App Store/Play Store products are linked
- Ensure webhook URL is accessible
- Check RevenueCat dashboard for errors

### Subscription status not updating
- Verify webhook is receiving events
- Check backend logs for webhook processing
- Ensure database migration was run

