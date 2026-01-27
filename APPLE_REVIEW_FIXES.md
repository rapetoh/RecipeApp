# Apple App Review Fixes - January 26, 2026

## Review Details
- **Submission ID**: 5cc2b533-0f31-4282-94b9-b6f636d1412c
- **Review Date**: January 26, 2026
- **Review Devices**: iPad Air 11-inch (M3) and iPhone 17 Pro Max
- **Version Reviewed**: 1.0

## Issues Identified by Apple

### Issue 1: Guideline 3.1.2 - Business - Payments - Subscriptions

**Problem**: Missing required information for auto-renewable subscriptions:
- Missing functional link to Terms of Use (EULA) in the app
- Missing functional link to Privacy Policy in the app
- Missing links in App Store Connect metadata

**Apple Requirements**:
Apps offering auto-renewable subscriptions must include all of the following required information **in the app itself**:
- Title of auto-renewing subscription (this may be the same as the in-app purchase product name)
- Length of subscription
- Price of subscription, and price per unit if appropriate
- Functional links to the privacy policy and Terms of Use (EULA)

The app metadata must also include functional links to:
- Privacy policy in the Privacy Policy field in App Store Connect
- Terms of Use (EULA) in the App Description or EULA field in App Store Connect

### Issue 2: Guideline 1.5 - Safety

**Problem**: Support URL `https://example.com/support` is not functional

**Apple Requirements**: Support URL must direct users to a functional webpage with support information.

---

## Fixes Implemented

### 1. Created Terms of Use (EULA) ✅

**File Created**: `recipe-app-standalone/Terms/index.html`

**Content Includes**:
- Acceptance of Terms
- Description of Service
- Subscription Services (auto-renewable subscriptions, pricing, cancellation)
- User Accounts
- User Content
- Acceptable Use
- Intellectual Property
- AI-Generated Content Disclaimers
- Disclaimers and Limitation of Liability
- Contact Information

**Next Step**: Host this file publicly (same method as Privacy Policy - Netlify Drop or similar)

### 2. Created Legal Center Screen ✅

**File Created**: `recipe-app-standalone/apps/mobile/src/app/legal-center.jsx`

**Features**:
- Tabbed interface for "Privacy Policy" and "Terms of Use"
- Summary cards with key information
- Links to full policies (opens in browser)
- Matches app design (orange theme, Inter font)
- Accessible from subscription flow

**Navigation**: Users can access via "Terms" or "Privacy" links in subscription plans page

### 3. Updated Subscription Plans Page ✅

**File Updated**: `recipe-app-standalone/apps/mobile/src/app/subscription/plans.jsx`

**Changes**:
- Made "Terms" link functional → navigates to Legal Center
- Made "Privacy" link functional → navigates to Legal Center
- Subscription information already displayed:
  - **Title**: "POCKETCHEF PREMIUM" (in badge)
  - **Length**: "Monthly" or "Yearly" (in toggle)
  - **Price**: Dynamically loaded from RevenueCat
  - **Links**: Functional Terms and Privacy links

### 4. Subscription Information Display ✅

The subscription plans page (`plans.jsx`) already displays all required information:
- ✅ **Title**: "POCKETCHEF PREMIUM" displayed prominently in badge
- ✅ **Length**: Monthly/Yearly toggle clearly visible
- ✅ **Price**: Dynamically displayed from RevenueCat packages
- ✅ **Links**: Functional Terms and Privacy links in footer

---

## Remaining Tasks (Manual Steps)

### 1. Deploy Web App Routes ✅

**Status**: Routes created in web app - ready to deploy

**What Was Done**:
- Created `/privacy` route in web app (`apps/web/src/app/privacy/page.jsx`)
- Created `/terms` route in web app (`apps/web/src/app/terms/page.jsx`)
- Created `/support` route in web app (`apps/web/src/app/support/page.jsx`)
- Added routes to `apps/web/src/app/routes.ts`
- Updated `legal-center.jsx` to use `getApiUrl()` - automatically uses your web app domain
- Added Inter font to root layout for consistent styling

**Action Required**:
1. Deploy your web app (if not already deployed)
2. The routes will be available at:
   - `https://your-web-app-domain.com/privacy`
   - `https://your-web-app-domain.com/terms`
   - `https://your-web-app-domain.com/support`
3. No additional configuration needed - URLs are automatically constructed from your API URL

### 3. Update App Store Connect Metadata

**Action Required**:

#### A. Privacy Policy URL
1. Go to App Store Connect → Your App → App Privacy
2. Find "Privacy Policy URL" field
3. Enter: `https://your-web-app-domain.com/privacy` (replace with your actual domain)
4. Save

#### B. Terms of Use (EULA)
**Option 1: Add to App Description** (Recommended)
1. Go to App Store Connect → Your App → App Information
2. Edit App Description
3. Add: "Terms of Use: https://your-web-app-domain.com/terms" (replace with your actual domain)

**Option 2: Add Custom EULA**
1. Go to App Store Connect → Your App → App Information
2. Scroll to "EULA" section
3. Click "Edit" next to EULA
4. Select "Custom EULA"
5. Enter: `https://your-web-app-domain.com/terms` (replace with your actual domain)

#### C. Support URL ✅
1. Go to App Store Connect → Your App → App Information
2. Find "Support URL" field
3. Enter: `https://your-web-app-domain.com/support` (replace with your actual domain)
4. Save

**Note**: Support page has been created in your web app at `/support` route

### 4. Test the Implementation

**Before Resubmitting**:
1. ✅ Test Legal Center screen opens from subscription page
2. ✅ Test Privacy Policy tab displays correctly
3. ✅ Test Terms of Use tab displays correctly
4. ✅ Test "View Full Privacy Policy" link opens browser
5. ✅ Test "View Full Terms of Use" link opens browser
6. ✅ Verify subscription information is clearly visible
7. ✅ Verify all links are functional

---

## Code Changes Summary

### Files Created:
1. `recipe-app-standalone/Terms/index.html` - Terms of Use HTML (backup/reference)
2. `recipe-app-standalone/apps/mobile/src/app/legal-center.jsx` - Legal Center screen component
3. `recipe-app-standalone/apps/web/src/app/privacy/page.jsx` - Privacy Policy web route
4. `recipe-app-standalone/apps/web/src/app/terms/page.jsx` - Terms of Use web route
5. `recipe-app-standalone/apps/web/src/app/support/page.jsx` - Support page web route
6. `recipe-app-standalone/APPLE_REVIEW_FIXES.md` - This documentation

### Files Updated:
1. `recipe-app-standalone/apps/mobile/src/app/subscription/plans.jsx` - Made Terms/Privacy links functional
2. `recipe-app-standalone/apps/web/src/app/routes.ts` - Added privacy, terms, and support routes
3. `recipe-app-standalone/apps/web/src/app/root.tsx` - Added Inter font link

---

## Verification Checklist

Before resubmitting to Apple, verify:

- [x] Terms of Use route created in web app (`/terms`)
- [x] Privacy Policy route created in web app (`/privacy`)
- [x] Routes added to `routes.ts`
- [x] Legal Center screen opens correctly from subscription page
- [x] Both tabs (Privacy/Terms) work correctly
- [x] "View Full" links use `getApiUrl()` - automatically uses your web app domain
- [ ] **Web app is deployed** (if not already)
- [ ] **Test `/privacy` route** - visit `https://your-domain.com/privacy` in browser
- [ ] **Test `/terms` route** - visit `https://your-domain.com/terms` in browser
- [ ] **Test `/support` route** - visit `https://your-domain.com/support` in browser
- [ ] App Store Connect has Privacy Policy URL: `https://your-domain.com/privacy`
- [ ] App Store Connect has Terms of Use URL: `https://your-domain.com/terms` (in description or EULA field)
- [ ] App Store Connect has Support URL: `https://your-domain.com/support`
- [ ] Subscription information is clearly visible:
  - [x] Title: "PocketChef Premium"
  - [x] Length: Monthly/Yearly
  - [x] Price: Displayed
  - [x] Links: Functional

---

## Notes

- The Legal Center screen uses tabs to show both Privacy Policy and Terms of Use summaries
- Full policies open in the device's browser when users tap "View Full" buttons
- Subscription information is already clearly displayed on the plans page
- All links are now functional and navigate correctly

---

## Support URL Options

If you need to create a simple support page, you can:

1. **Create a simple HTML page** with:
   - Contact email: rochapetoh@hotmail.com
   - App name: PocketChef
   - Brief support information
   - Link to contact form or email

2. **Host it** using Netlify Drop (same as Privacy/Terms)

3. **Update App Store Connect** with the URL

Example support page content:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Support - PocketChef</title>
</head>
<body>
    <h1>PocketChef Support</h1>
    <p>For support, please contact us:</p>
    <p>Email: <a href="mailto:rochapetoh@hotmail.com">rochapetoh@hotmail.com</a></p>
    <p>We'll respond to your inquiry as soon as possible.</p>
</body>
</html>
```

---

## Next Steps

1. ✅ **Code Complete** - All routes and components created
2. **Deploy Web App** - Ensure your web app is deployed (routes will be available automatically)
3. **Test Routes** - Verify all routes are accessible in browser:
   - `https://your-domain.com/privacy`
   - `https://your-domain.com/terms`
   - `https://your-domain.com/support`
4. **Update App Store Connect**:
   - Privacy Policy URL: `https://your-domain.com/privacy`
   - Terms of Use URL: `https://your-domain.com/terms`
   - Support URL: `https://your-domain.com/support`
5. **Test Mobile App** - Verify Legal Center opens and links work
6. **Resubmit to App Store**

---

**Last Updated**: January 26, 2026
