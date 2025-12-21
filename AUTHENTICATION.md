# Mobile Authentication Implementation

## Overview

This document describes the implementation of native React Native authentication screens for the mobile app, replacing the previous WebView-based approach.

## Problem Statement

The original implementation used a WebView to load web-based signin/signup pages. This approach had several issues:
- WebView converted POST form submissions to GET requests with query parameters
- React Router intercepted form submissions on the web side
- Complex postMessage communication between WebView and React Native
- Poor user experience with web pages in a mobile context

## Solution

Implemented native React Native authentication screens that:
- Call the same API endpoints directly
- Provide native mobile UI/UX
- Eliminate WebView dependencies
- Simplify the authentication flow

## Architecture

### Authentication Flow

```
User Action → Native Screen → API Call → Database → Response → SecureStore
```

1. **User taps "Sign In"** → Navigates to native signin screen
2. **User fills form** → Submits via `fetch` POST request
3. **API validates** → Checks credentials against database
4. **On success** → Returns session token and user data
5. **Mobile app saves** → Stores in Expo SecureStore
6. **User navigated back** → Authenticated state updated

### Credential Storage

#### Passwords
- **Location**: PostgreSQL database
- **Table**: `auth_accounts`
- **Column**: `password` (TEXT)
- **Format**: Hashed with argon2 (never plain text)
- **Reference**: `database/schema.sql` line 69

#### Session Tokens

**Mobile App:**
- **Location**: Device secure storage
- **Storage**: Expo SecureStore (encrypted)
- **Key**: `'recipe-app-jwt'`
- **Format**: `{ jwt: sessionToken, user: { id, email, name, image } }`
- **Reference**: `apps/mobile/src/utils/auth/store.js`

**Web App:**
- **Location**: HTTP-only cookie
- **Cookie Name**: `authjs.session-token`
- **Attributes**: `HttpOnly`, `SameSite=Lax`, `Max-Age=2592000` (30 days)

**Database:**
- **Location**: PostgreSQL database
- **Table**: `auth_sessions`
- **Columns**: `sessionToken`, `userId`, `expires`

## Files Created

### 1. Native Signin Screen
**File**: `apps/mobile/src/app/account/signin.jsx`

**Features:**
- Email and password input fields
- Form validation
- Error handling and display
- Loading states
- Direct API calls to `/api/auth/signin`
- Matches mobile app styling patterns
- Keyboard avoiding view for better UX

**Key Functions:**
- `handleSubmit()`: Validates form, makes POST request, saves auth data, navigates back

### 2. Native Signup Screen
**File**: `apps/mobile/src/app/account/signup.jsx`

**Features:**
- Name, email, and password input fields
- Form validation
- Error handling and display
- Loading states
- Direct API calls to `/api/auth/signup`
- Matches mobile app styling patterns
- Keyboard avoiding view for better UX

**Key Functions:**
- `handleSubmit()`: Validates form, makes POST request, saves auth data, navigates back

## Files Modified

### 1. Authentication Hook
**File**: `apps/mobile/src/utils/auth/useAuth.js`

**Changes:**
- `signIn()`: Changed from opening modal to navigating to `/account/signin`
- `signUp()`: Changed from opening modal to navigating to `/account/signup`
- `signOut()`: Removed modal close call (no longer needed)
- `useRequireAuth()`: Updated to use navigation instead of modal

**Before:**
```javascript
const signIn = useCallback(() => {
  open({ mode: 'signin' });
}, [open]);
```

**After:**
```javascript
const signIn = useCallback(() => {
  router.push('/account/signin');
}, [router]);
```

### 2. App Layout
**File**: `apps/mobile/src/app/_layout.jsx`

**Changes:**
- Removed `AuthModal` component import and usage
- Added routes for `account/signin` and `account/signup` screens

**Before:**
```javascript
import { AuthModal } from "@/utils/auth/useAuthModal";
// ...
<AuthModal />
```

**After:**
```javascript
<Stack.Screen name="account/signin" />
<Stack.Screen name="account/signup" />
```

## API Endpoints

### POST /api/auth/signin
**Request:**
- Method: POST
- Body: FormData with `email`, `password`, `callbackUrl`
- Headers: Content-Type: multipart/form-data

**Response (Success):**
```json
{
  "success": true,
  "sessionToken": "base64url-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "image": null
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password."
}
```

### POST /api/auth/signup
**Request:**
- Method: POST
- Body: FormData with `name` (optional), `email`, `password`, `callbackUrl`
- Headers: Content-Type: multipart/form-data

**Response (Success):**
```json
{
  "success": true,
  "sessionToken": "base64url-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "image": null
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "USER_EXISTS",
  "message": "User with this email already exists."
}
```

## Error Handling

### Error Messages
Defined constants for consistent error handling:
- `MISSING_FIELDS`: "Please fill in all required fields"
- `INVALID_CREDENTIALS`: "Invalid email or password"
- `USER_EXISTS`: "An account with this email already exists"
- `SERVER_ERROR`: "An error occurred. Please try again."
- `NETWORK_ERROR`: "Network error. Please check your connection."

### Error Display
Errors are displayed in a red-bordered container above the form with clear messaging.

## Security Considerations

1. **Password Hashing**: All passwords are hashed with argon2 before storage
2. **Secure Storage**: Session tokens stored in Expo SecureStore (encrypted)
3. **HTTP-only Cookies**: Web app uses HTTP-only cookies for session tokens
4. **No Plain Text**: Passwords never stored in plain text
5. **Session Expiration**: Sessions expire after 30 days

## Styling

The native screens follow the mobile app's design system:
- **Colors**: Primary orange (#FF9F1C), white backgrounds, gray text
- **Typography**: Inter font family (400, 500, 600, 700 weights)
- **Spacing**: Consistent padding and margins
- **Components**: Rounded corners (12px), proper touch targets
- **Inputs**: Gray background (#F8F8F8), border styling
- **Buttons**: Primary orange background, white text

## Testing

To test the authentication flow:

1. **Sign Up:**
   - Navigate to signup screen
   - Fill in name, email, password
   - Submit form
   - Verify user is created and authenticated
   - Check SecureStore for saved token

2. **Sign In:**
   - Navigate to signin screen
   - Enter email and password
   - Submit form
   - Verify authentication success
   - Check SecureStore for saved token

3. **Error Cases:**
   - Try signin with wrong password
   - Try signup with existing email
   - Try submitting empty form
   - Verify error messages display correctly

## Migration Notes

### Deprecated Components
The following components are no longer used but remain in the codebase:
- `apps/mobile/src/utils/auth/AuthWebView.jsx`
- `apps/mobile/src/utils/auth/useAuthModal.jsx`

These can be removed in a future cleanup if desired.

### Backward Compatibility
The web authentication pages remain unchanged and continue to work for web users. The mobile app now uses native screens instead of loading these web pages in a WebView.

## Future Improvements

1. **Password Reset**: Add forgot password functionality
2. **Email Verification**: Implement email verification flow
3. **Biometric Auth**: Add Face ID / Touch ID support
4. **Remember Me**: Add option to extend session duration
5. **Social Auth**: Add OAuth providers (Google, Apple, etc.)

## References

- Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/
- React Native TextInput: https://reactnative.dev/docs/textinput
- Expo Router: https://docs.expo.dev/router/introduction/
- Argon2: https://github.com/ranisalt/node-argon2

## Implementation Date

**Date**: December 2024  
**Status**: ✅ Complete





