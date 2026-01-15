# OAuth Troubleshooting Journal

## Complete Record of Google & Apple OAuth Implementation Struggles

This document is a comprehensive record of every issue, error, failed attempt, and successful fix encountered while implementing and debugging Google and Apple OAuth authentication for the ChefVibe mobile app. Use this as a reference when facing similar issues in the future.

---

## Table of Contents

1. [Issue #1: UnknownAction - Unsupported Action](#issue-1-unknownaction---unsupported-action)
2. [Issue #2: InvalidCheck - pkceCodeVerifier Could Not Be Parsed](#issue-2-invalidcheck---pkcecodeverifier-could-not-be-parsed)
3. [Issue #3: InvalidCheck - State Value Could Not Be Parsed](#issue-3-invalidcheck---state-value-could-not-be-parsed)
4. [Issue #4: OAuthAccountNotLinked Error](#issue-4-oauthaccountnotlinked-error)
5. [Issue #5: Mobile App Shows Raw JSON After OAuth](#issue-5-mobile-app-shows-raw-json-after-oauth)
6. [Issue #6: Apple OAuth - clientSecret Must Be A String](#issue-6-apple-oauth---clientsecret-must-be-a-string)
7. [Issue #7: Apple OAuth Redirects to Web Root Instead of Mobile App](#issue-7-apple-oauth-redirects-to-web-root-instead-of-mobile-app)
8. [Issue #8: Apple User Name Shows as Private Relay Email](#issue-8-apple-user-name-shows-as-private-relay-email)
9. [Issue #9: Google Login Logs In As Apple User](#issue-9-google-login-logs-in-as-apple-user)
10. [Issue #10: Multiple OAuth Accounts Linked to Same User](#issue-10-multiple-oauth-accounts-linked-to-same-user)
11. [Database Cleanup Commands](#database-cleanup-commands)
12. [Key Lessons Learned](#key-lessons-learned)

---

## Issue #1: UnknownAction - Unsupported Action

### When It Occurred
First attempt to test Google OAuth after setting up environment variables on Render.

### Error Message
```
[auth][warn][env-url-basepath-redundant] Read more: https://warnings.authjs.dev#env-url-basepath-redundant
[auth][error] UnknownAction: Unsupported action. Read more at https://errors.authjs.dev#unknownaction
```

### Server Logs
```
🔐 Auth route accessed: GET /api/auth/signin/google
URL: http://recipe-app-web-xtnu.onrender.com/api/auth/signin/google?callbackUrl=https%3A%2F%2Frecipe-app-web-xtnu.onrender.com%2Fapi%2Fauth%2Ftoken
```

### What Was Happening
The mobile app was making a GET request to `/api/auth/signin/google`, but Auth.js does NOT support GET requests to this endpoint. Auth.js requires a POST request with a CSRF token to initiate OAuth.

### Root Cause
Auth.js sign-in flow requires:
1. First, fetch a CSRF token from `/api/auth/csrf`
2. Then, POST to `/api/auth/signin/:provider` with the CSRF token in the body

The mobile app (using `expo-web-browser`) was directly opening the URL as a GET request.

### Failed Attempts

#### Failed Attempt #1: Setting AUTH_URL Environment Variable
**What we tried:** Added `AUTH_URL=https://recipe-app-web-xtnu.onrender.com` to Render environment variables, thinking the issue was URL configuration.

**Why we thought it would work:** The warning `env-url-basepath-redundant` suggested there might be a URL configuration issue.

**Why it failed:** The `UnknownAction` error persisted. The URL configuration was not the root cause - the HTTP method (GET vs POST) was.

#### Failed Attempt #2: Conditionally Setting basePath
**What we tried:** Modified `server.ts` to conditionally set `basePath: '/api/auth'` only when `AUTH_URL` was not set.

**Code change:**
```typescript
const authConfig = {
  ...baseAuthConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
};

if (!process.env.AUTH_URL) {
  authConfig.basePath = '/api/auth';
  authConfig.url = `${protocol}://${host}`;
}
```

**Why it failed:** The `UnknownAction` error still occurred. The issue was not about basePath configuration.

#### Failed Attempt #3: Caching Auth Config at Startup
**What we tried:** Cached `getAuthConfig()` once at startup instead of calling it per-request, and added debug logging.

**Code change:**
```typescript
const baseAuthConfig = getAuthConfig();
console.log('✅ Base auth config loaded with', baseAuthConfig.providers?.length || 0, 'providers');
```

**Why it failed:** While this improved efficiency, it didn't solve the `UnknownAction` error. The providers were loading correctly (showed "2 providers"), but the GET request was still the problem.

### Successful Fix
Created a custom endpoint `/api/auth/oauth/:provider` that:
1. Fetches the CSRF token from Auth.js
2. Returns an HTML page that auto-submits a POST form to Auth.js

**File:** `apps/web/src/server.ts`

**Code:**
```typescript
app.get('/api/auth/oauth/:provider', async (c) => {
  const provider = c.req.param('provider');
  const protocol = 'https';
  const host = c.req.header('host') || 'recipe-app-web-xtnu.onrender.com';
  const baseUrl = `${protocol}://${host}`;
  
  // Fetch CSRF token from Auth.js
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
    headers: { 'Cookie': c.req.header('Cookie') || '' },
  });
  
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;
  
  // Return HTML that auto-submits POST form
  const html = `<!DOCTYPE html>
<html>
<head><title>Redirecting to ${provider}...</title></head>
<body>
  <form id="oauth-form" action="${baseUrl}/api/auth/signin/${provider}" method="POST">
    <input type="hidden" name="csrfToken" value="${csrfToken}" />
    <input type="hidden" name="callbackUrl" value="${baseUrl}/?mobile_oauth=1" />
  </form>
  <script>document.getElementById('oauth-form').submit();</script>
</body>
</html>`;
  
  return c.html(html);
});
```

**Why it works:** This bridges the mobile app's GET request to Auth.js's required POST request by auto-submitting a form with the CSRF token.

---

## Issue #2: InvalidCheck - pkceCodeVerifier Could Not Be Parsed

### When It Occurred
After fixing Issue #1, attempting Google OAuth sign-in.

### Error Message
```
[auth][error] InvalidCheck: pkceCodeVerifier value could not be parsed.
```

### Server Logs
```
🔐 Auth route accessed: GET /api/auth/callback/google
URL: http://recipe-app-web-xtnu.onrender.com/api/auth/callback/google?code=4%2F0ATX87lMKFhWtzbMSWzL3iXb1E869NmLBqKHW81plkD29IxD26K1t1uyvMPIPhp5hInWMUA&scope=...
```

### What Was Happening
Auth.js uses PKCE (Proof Key for Code Exchange) as a security measure. It:
1. Sets a cookie `__Secure-authjs.pkce.code_verifier` when starting OAuth
2. Expects this cookie back when the callback returns
3. Verifies the code_verifier matches

### Root Cause
Mobile embedded browsers (used by `expo-web-browser`) don't reliably persist cookies, especially `__Secure-` prefixed cookies. The PKCE cookie was set but not sent back with the callback request.

### Why This Happens on Mobile
- iOS uses `ASWebAuthenticationSession` which has its own cookie storage
- `__Secure-` cookies require HTTPS and specific conditions
- The embedded browser session may not preserve cookies between redirects
- Different cookie policies between the initial request and callback

### Successful Fix
Disabled PKCE verification for Google provider by setting `checks: ["state"]` (state only, no PKCE).

**File:** `apps/web/src/auth.js`

**Code change:**
```javascript
// Before
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
}),

// After
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  checks: ["state"], // Disable PKCE, use state only
}),
```

### Security Note
Disabling PKCE reduces security slightly, but is necessary for mobile embedded browsers. The `state` parameter still provides CSRF protection.

---

## Issue #3: InvalidCheck - State Value Could Not Be Parsed

### When It Occurred
Immediately after fixing Issue #2.

### Error Message
```
[auth][error] InvalidCheck: state value could not be parsed.
```

### What Was Happening
After disabling PKCE, we enabled state verification. But the state cookie (`__Secure-authjs.state`) also wasn't persisting in the mobile embedded browser.

### Root Cause
Same as Issue #2 - the mobile embedded browser wasn't preserving ANY `__Secure-` cookies, including the state cookie.

### Successful Fix
Disabled ALL verification checks for both Google and Apple providers.

**File:** `apps/web/src/auth.js`

**Code:**
```javascript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  checks: [], // Disable all checks for mobile compatibility
  allowDangerousEmailAccountLinking: true,
}),

Apple({
  clientId: process.env.APPLE_CLIENT_ID,
  clientSecret: appleClientSecret,
  checks: [], // Disable all checks for mobile compatibility
  allowDangerousEmailAccountLinking: true,
}),
```

### Security Note
Disabling all checks is less secure but necessary for mobile embedded browsers. The OAuth flow still validates:
- The authorization code from the provider
- The access token exchange
- The user's identity from the provider

---

## Issue #4: OAuthAccountNotLinked Error

### When It Occurred
After fixing Issues #2 and #3, when a user tried to sign in with Google using an email that already had a credentials-based account.

### Error Message
```
[auth][error] OAuthAccountNotLinked: Another account already exists with the same e-mail address.
Read more at https://errors.authjs.dev#oauthaccountnotlinked
```

### Server Logs
```
[auth][debug]: adapter_getUserByAccount {
  "args": [{ "providerAccountId": "110845129752172295460", "provider": "google" }]
}
[auth][error] OAuthAccountNotLinked: The account is already associated with another user.
```

### What Was Happening
1. User had previously created an account with email `rapetohsenyo@gmail.com` using email/password
2. User tried to "Sign in with Google" using the same email
3. Auth.js found an existing user with that email but no Google OAuth link
4. Auth.js refused to automatically link for security reasons

### Root Cause
Auth.js prevents automatic account linking by default because:
- Someone could create an account with your email
- Then you try to sign in with Google
- If auto-linking was enabled, they'd gain access to your Google OAuth

### Successful Fix
Enabled dangerous email account linking (acceptable for this app's use case).

**File:** `apps/web/src/auth.js`

**Code:**
```javascript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  checks: [],
  allowDangerousEmailAccountLinking: true, // Allow linking accounts with same email
}),
```

### Security Note
This is called "dangerous" because it allows automatic linking. Only enable this if:
- You trust your email verification process
- The convenience outweighs the security risk for your app

---

## Issue #5: Mobile App Shows Raw JSON After OAuth

### When It Occurred
After Google OAuth completed successfully on the server, the mobile app showed a raw JSON response instead of logging the user in.

### What The User Saw
The in-app browser showed raw JSON:
```json
{"session":{"user":{"name":"Senyo Rapetoh","email":"rapetohsenyo@gmail.com"...}}}
```

### What Was Happening
1. OAuth completed successfully
2. Server returned JSON with the session data
3. `expo-web-browser` expected a redirect to a URL the app could catch
4. Instead, it displayed the JSON response in the browser

### Root Cause
The mobile OAuth flow needs to:
1. Complete OAuth on the server
2. Redirect to a custom URL scheme (`recipeapp://...`)
3. The app catches this URL and extracts the token

We were returning JSON instead of redirecting.

### Successful Fix (Part 1): Register Custom URL Scheme
Added URL scheme to `app.json`:

**File:** `apps/mobile/app.json`

**Code:**
```json
{
  "expo": {
    "scheme": "recipeapp",
    ...
  }
}
```

### Successful Fix (Part 2): Redirect Instead of Return JSON
Modified the token endpoint to redirect to the app:

**File:** `apps/web/src/server.ts`

**Code:**
```typescript
app.get('/api/auth/token', verifyAuth(), async (c) => {
  const authUser = c.get('authUser');
  const { session, user } = authUser;
  
  const jwt = session.sessionToken || session.id;
  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
  
  // Redirect to mobile app instead of returning JSON
  const redirectUrl = `recipeapp://oauth/callback?jwt=${encodeURIComponent(jwt)}&user=${encodeURIComponent(JSON.stringify(userData))}`;
  return c.redirect(redirectUrl);
});
```

### Successful Fix (Part 3): Parse URL in Mobile App
Updated the OAuth hook to parse the redirect URL:

**File:** `apps/mobile/src/utils/auth/useOAuth.js`

**Code:**
```javascript
const result = await WebBrowser.openAuthSessionAsync(oauthUrl, appCallbackUrl);

if (result.type === 'success' && result.url) {
  const url = new URL(result.url);
  const params = new URLSearchParams(url.search);
  
  const jwt = params.get('jwt');
  const userJson = params.get('user');
  const user = JSON.parse(decodeURIComponent(userJson));
  
  setAuth({ jwt, user });
  router.replace('/');
}
```

---

## Issue #6: Apple OAuth - clientSecret Must Be A String

### When It Occurred
First attempt to test Apple Sign In after setting up environment variables.

### Error Message
```
TypeError: "clientSecret" must be a string
```

### Server Logs
```
🔐 Auth route accessed: POST /api/auth/signin/apple
[auth][error] TypeError: "clientSecret" must be a string
```

### What Was Happening
Apple OAuth requires a JWT client secret that must be generated from:
- Team ID
- Client ID (Service ID)
- Key ID
- Private Key

Auth.js was supposed to generate this automatically, but it was failing.

### Root Cause
The `APPLE_PRIVATE_KEY` environment variable had issues:
1. Newlines were escaped as `\n` literal strings instead of actual newlines
2. The key format might have been invalid
3. Auth.js's internal JWT generation was failing silently

### Failed Attempt: Relying on Auth.js Auto-Generation
**What we tried:** Just providing the `privateKey` to the Apple provider config:

```javascript
Apple({
  clientId: process.env.APPLE_CLIENT_ID,
  clientSecret: process.env.APPLE_PRIVATE_KEY, // Wrong!
})
```

**Why it failed:** `clientSecret` expects a JWT string, not a private key. Auth.js has internal logic to generate the JWT from a `privateKey` option, but this wasn't working reliably.

### Successful Fix
Explicitly generate the JWT client secret at server startup using the `jose` library.

**File:** `apps/web/src/auth.js`

**Code:**
```javascript
import { SignJWT, importPKCS8 } from 'jose';

// Generate Apple client secret at startup
let appleClientSecret = null;

async function generateAppleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const keyId = process.env.APPLE_KEY_ID;
  let privateKey = process.env.APPLE_PRIVATE_KEY;
  
  if (!teamId || !clientId || !keyId || !privateKey) {
    console.log('⚠️ Apple OAuth: Missing environment variables');
    return null;
  }
  
  // Fix escaped newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Ensure proper PEM format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
  }
  
  try {
    const key = await importPKCS8(privateKey, 'ES256');
    
    const jwt = await new SignJWT({})
      .setAudience('https://appleid.apple.com')
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('180d')
      .setSubject(clientId)
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .sign(key);
    
    console.log('✅ Apple client secret generated successfully');
    return jwt;
  } catch (error) {
    console.error('❌ Failed to generate Apple client secret:', error);
    return null;
  }
}

// Generate at startup
appleClientSecret = await generateAppleClientSecret();

// Use in provider config
Apple({
  clientId: process.env.APPLE_CLIENT_ID,
  clientSecret: appleClientSecret, // Pre-generated JWT
  checks: [],
  allowDangerousEmailAccountLinking: true,
}),
```

### Key Points
1. The private key from Apple is in PKCS#8 format
2. Escaped newlines (`\n`) must be converted to real newlines
3. The JWT must include specific claims (aud, iss, iat, exp, sub)
4. The algorithm must be ES256 with the Key ID in the header

---

## Issue #7: Apple OAuth Redirects to Web Root Instead of Mobile App

### When It Occurred
After Apple OAuth completed successfully, the browser redirected to the web root (`/`) instead of the mobile app (`recipeapp://...`).

### What The User Saw
After Face ID authentication, instead of returning to the app, the browser showed the web app's home page.

### Server Logs
```
[auth][debug]: adapter_createSession { ... }
GET / accessed
```

### What Was Happening
1. Apple OAuth completed successfully
2. Auth.js created a session and set cookies
3. Auth.js redirected to the `callbackUrl` which was `/` (root)
4. The mobile app never received the callback

### Root Cause
Auth.js controls the final redirect after OAuth. Our `callbackUrl` was being set but Auth.js wasn't preserving it correctly through the OAuth flow.

### Failed Attempt #1: Cookie-Based Tracking
**What we tried:** Set a `__mobile_oauth=1` cookie when OAuth started, then check for it at `GET /`.

**Code:**
```typescript
// When starting OAuth
c.header('Set-Cookie', '__mobile_oauth=1; Path=/; HttpOnly; SameSite=Lax');

// At GET /
const mobileOAuth = c.req.header('Cookie')?.includes('__mobile_oauth=1');
if (mobileOAuth) {
  return c.redirect('recipeapp://oauth/callback?...');
}
```

**Server logs showing failure:**
```
GET / accessed, __mobile_oauth param: undefined
```

**Why it failed:** Cookies set in one request weren't being sent in subsequent requests due to the embedded browser's cookie handling.

### Failed Attempt #2: Query Parameter in callbackUrl
**What we tried:** Changed the `callbackUrl` in the form submission to include a query parameter.

**Code:**
```typescript
const mobileCallbackUrl = `${baseUrl}/?mobile_oauth=1`;
// ...
<input type="hidden" name="callbackUrl" value="${mobileCallbackUrl}" />
```

**Server logs showing failure:**
```
GET / accessed, mobile_oauth param: undefined
```

**Why it failed:** Auth.js was stripping or not preserving the query parameter through the OAuth flow.

### Failed Attempt #3: Intercepting Auth.js Redirect with c.res
**What we tried:** Added middleware to intercept the redirect from `/api/auth/callback/*` and modify it.

**Code:**
```typescript
app.use('/api/auth/callback/*', async (c, next) => {
  await next();
  
  const location = c.res.headers.get('Location');
  if (location === '/' || location === baseUrl + '/') {
    console.log('🔐 Intercepting redirect to /', 'changing to /?mobile_oauth=1');
    c.res = new Response(null, {
      status: 302,
      headers: { 'Location': '/?mobile_oauth=1' },
    });
  }
});
```

**Server logs:**
```
🔐 Modified redirect to: https://recipe-app-web-xtnu.onrender.com/?mobile_oauth=1
GET / accessed, mobile_oauth param: undefined
```

**Why it failed:** Assigning to `c.res` doesn't work in Hono middleware. The original response was still being sent.

### Failed Attempt #4: Intercepting with return new Response
**What we tried:** Changed to `return new Response(...)` instead of assigning to `c.res`.

**Code:**
```typescript
app.use('/api/auth/callback/*', async (c, next) => {
  await next();
  
  const location = c.res.headers.get('Location');
  if (location === '/') {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/?mobile_oauth=1' },
    });
  }
});
```

**Why it failed:** The middleware runs AFTER Auth.js has already sent the response. By the time we intercept, it's too late.

### Successful Fix: User-Agent Detection + Fresh Session Check
Instead of trying to track state through the OAuth flow, we detect mobile OAuth completion at `GET /` by:
1. Checking if the request is from a mobile browser (User-Agent)
2. Checking if there's a valid session
3. Checking if the session is "fresh" (just created)

**Code:**
```typescript
app.get('/', verifyAuth(), async (c, next) => {
  const userAgent = c.req.header('User-Agent') || '';
  
  // Detect mobile browser/WebView
  const isMobile = userAgent.includes('Mobile') || 
                   userAgent.includes('iPhone') || 
                   userAgent.includes('iPad') ||
                   userAgent.includes('Android');
  
  const authUser = c.get('authUser');
  
  if (isMobile && authUser?.session && authUser?.user) {
    const { session, user } = authUser;
    
    // Check if session is fresh (created recently)
    // Session expires ~30 days from creation
    // If expires > 29 days from now, it was just created
    const expires = new Date(session.expires);
    const twentyNineDaysFromNow = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
    const isFreshSession = expires > twentyNineDaysFromNow;
    
    if (isFreshSession) {
      console.log('🔐 Mobile OAuth completion detected');
      
      const jwt = session.sessionToken || session.id;
      const userData = { id: user.id, email: user.email, name: user.name };
      
      const redirectUrl = `recipeapp://oauth/callback?jwt=${encodeURIComponent(jwt)}&user=${encodeURIComponent(JSON.stringify(userData))}`;
      return c.redirect(redirectUrl);
    }
  }
  
  return next();
});
```

**Why it works:**
1. Mobile OAuth always ends with a redirect to `/`
2. We can reliably detect mobile browsers via User-Agent
3. A fresh session (just created) indicates OAuth just completed
4. We redirect to the app scheme before the web page renders

---

## Issue #8: Apple User Name Shows as Private Relay Email

### When It Occurred
After successfully signing in with Apple, the app showed `7dkkpj7r8n@privaterelay.appleid.com` as the user's name instead of their real name.

### What The User Saw
```
Good morning,
7dkkpj7r8n@privaterelay.appleid.com
```

### What Was Happening
This is actually expected Apple Sign In behavior:
1. Apple lets users hide their real email (private relay)
2. Apple only sends the user's real name on the FIRST sign-in
3. Subsequent sign-ins only include the email

### Root Cause
Apple's privacy features:
- "Hide My Email" generates a random relay address
- Real name is only provided once (to prevent tracking)
- The relay email forwards to the user's real email

### This Is NOT A Bug
This is working as designed by Apple. The user chose to hide their email.

### Solutions

#### Option 1: User Edits Profile
The user can go to the Edit Profile screen in the app and change their display name.

#### Option 2: Reset Apple Sign In and Try Again
The user can:
1. Go to iPhone Settings → Apple ID → Password & Security → Apps Using Apple ID
2. Find the app and tap "Stop Using Apple ID"
3. Sign in again with Apple - this time the name will be sent

#### Option 3: Database Update
If the user confirms their identity:
```sql
UPDATE auth_users 
SET name = 'Actual Name' 
WHERE email = '7dkkpj7r8n@privaterelay.appleid.com';
```

---

## Issue #9: Google Login Logs In As Apple User

### When It Occurred
After successfully signing in with Apple, subsequent Google sign-in attempts (with DIFFERENT Google accounts) all logged in as the Apple user.

### What The User Saw
1. Signed in with Apple → App showed Apple user email
2. Logged out
3. Tried "Continue with Google" with a different email
4. App still showed the Apple user email

### Server Logs
```
[auth][debug]: adapter_getSessionAndUser {
  "args": ["75dc2261-700c-4524-ae20-3edcc7d29d45"]  // Same session ID!
}
[auth][debug]: adapter_linkAccount {
  "args": [{
    "providerAccountId": "110845129752172295460",
    "provider": "google",
    "userId": "e93f26f5-5f07-4e4b-acef-2c9f536f7264"  // Apple user's ID!
  }]
}
✅ Mobile OAuth complete - redirecting to app for user: 7dkkpj7r8n@privaterelay.appleid.com
```

### What Was Happening
1. User signed in with Apple → Server created session cookie
2. User logged out in the app → App cleared local storage
3. User tried Google sign-in → `expo-web-browser` opened with OLD session cookie
4. Server saw existing session → Linked Google to the Apple user
5. Redirect showed Apple user's email

### Root Cause
`expo-web-browser` uses `WebBrowser.openAuthSessionAsync()` which by default shares cookies with Safari. The session cookie from the Apple sign-in persisted in the browser.

### Failed Attempt: Clearing Safari Cookies
**What we tried:** User manually cleared Safari history and cookies from iPhone Settings.

**Why it failed:** The embedded browser used by `expo-web-browser` has its own cookie store that's separate from (or synced differently than) Safari's main cookies.

### Successful Fix
Use ephemeral (private) browser sessions that don't share cookies.

**File:** `apps/mobile/src/utils/auth/useOAuth.js`

**Code:**
```javascript
// Before
const result = await WebBrowser.openAuthSessionAsync(oauthUrl, appCallbackUrl);

// After
const result = await WebBrowser.openAuthSessionAsync(oauthUrl, appCallbackUrl, {
  preferEphemeralSession: true, // Use private session, no cookie sharing
});
```

**Why it works:**
- `preferEphemeralSession: true` tells iOS to use a private browser session
- Each OAuth flow starts with zero cookies
- No previous session can interfere

---

## Issue #10: Multiple OAuth Accounts Linked to Same User

### When It Occurred
Discovered after Issue #9 - checking the database revealed multiple OAuth accounts linked to one user.

### Database Query
```sql
SELECT * FROM auth_accounts;
```

### What The Database Showed
```
id | userId                               | provider | providerAccountId
---+--------------------------------------+----------+-------------------
 7 | e93f26f5-5f07-4e4b-acef-2c9f536f7264 | apple    | 001530.a0444c...
 8 | e93f26f5-5f07-4e4b-acef-2c9f536f7264 | google   | 110845129752172295460
 9 | e93f26f5-5f07-4e4b-acef-2c9f536f7264 | google   | 104458295745146608014
```

Three different OAuth accounts (1 Apple, 2 Google) all linked to the same user!

### Root Cause
This was caused by Issue #9. Before we fixed the session cookie issue, every Google sign-in was linking to the existing Apple user's account.

### Fix: Database Cleanup
```sql
-- Remove incorrectly linked Google accounts
DELETE FROM auth_accounts WHERE id IN (8, 9);
```

### Going Forward
With `preferEphemeralSession: true` in place, each OAuth sign-in will:
- Start with a clean session
- Create a new user (if email doesn't exist)
- Link to existing user only if same email exists AND `allowDangerousEmailAccountLinking` is true

---

## Database Cleanup Commands

### Connect to Database from Render Shell
```bash
psql $DATABASE_URL
```

### View All Users
```sql
SELECT id, name, email FROM auth_users;
```

### View All OAuth Accounts
```sql
SELECT id, "userId", provider, "providerAccountId" FROM auth_accounts;
```

### See Which Users Have Multiple OAuth Providers
```sql
SELECT u.id, u.name, u.email, a.provider 
FROM auth_users u 
JOIN auth_accounts a ON u.id = a."userId" 
ORDER BY u.id;
```

### Delete Specific OAuth Link
```sql
DELETE FROM auth_accounts WHERE id = <account_id>;
```

### Delete OAuth Links for a Provider
```sql
DELETE FROM auth_accounts WHERE provider = 'google' AND "userId" = '<user_id>';
```

### Update User Name/Email
```sql
UPDATE auth_users 
SET name = 'New Name', email = 'new@email.com' 
WHERE id = '<user_id>';
```

### Delete a User (and their accounts)
```sql
-- First delete their OAuth accounts
DELETE FROM auth_accounts WHERE "userId" = '<user_id>';
-- Then delete the user
DELETE FROM auth_users WHERE id = '<user_id>';
```

### Exit psql
```sql
\q
```

---

## Key Lessons Learned

### 1. Mobile OAuth is Different from Web OAuth
- Mobile embedded browsers have different cookie behavior
- `__Secure-` cookies may not persist
- Always test OAuth on actual mobile devices, not just simulators

### 2. Auth.js Requires POST for Sign-In
- GET requests to `/api/auth/signin/:provider` don't work
- Must POST with a CSRF token
- Create a bridge endpoint for mobile apps

### 3. PKCE and State Checks May Need to Be Disabled
- Mobile browsers often can't preserve the required cookies
- Set `checks: []` for mobile compatibility
- Accept the security trade-off

### 4. Session Cookies Can Persist Unexpectedly
- Even after "logout", cookies may persist in the browser
- Use `preferEphemeralSession: true` for clean OAuth sessions
- Each OAuth flow should be independent

### 5. Apple Sign In Has Privacy Features
- Users can hide their email
- Real name only sent on first sign-in
- Handle the private relay email gracefully

### 6. Database State Matters
- OAuth issues can leave bad data in the database
- Always check `auth_accounts` when debugging
- Clean up linked accounts when needed

### 7. Test Multiple Scenarios
- Test sign-in with new account
- Test sign-in with existing email
- Test switching between providers
- Test logout and re-login with different accounts

### 8. Debugging Checklist for OAuth Issues
1. Check server logs for Auth.js errors
2. Check database for existing accounts/links
3. Check if session cookies are persisting
4. Check User-Agent detection
5. Check redirect URLs
6. Check environment variables are set correctly

---

## Environment Variables Reference

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# Apple OAuth
APPLE_CLIENT_ID=com.yourcompany.app.web
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----

# Auth.js
AUTH_SECRET=your-random-secret-string
```

---

## Files Modified During OAuth Implementation

1. **`apps/web/src/auth.js`** - Auth configuration, providers, JWT generation
2. **`apps/web/src/server.ts`** - Custom OAuth endpoints, mobile detection
3. **`apps/mobile/src/utils/auth/useOAuth.js`** - Mobile OAuth hook
4. **`apps/mobile/app.json`** - URL scheme registration
5. **`apps/mobile/src/app/account/signin.jsx`** - OAuth buttons
6. **`apps/mobile/src/app/account/signup.jsx`** - OAuth buttons

---

*Document created: January 6, 2026*
*Last updated: January 6, 2026*



