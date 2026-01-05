# OAuth Authentication Setup

Google and Apple OAuth authentication has been implemented. Follow these steps to complete the setup:

## Environment Variables

Add the following environment variables to your **Render web service** environment variables:

### Google OAuth
```
GOOGLE_CLIENT_ID=  
GOOGLE_CLIENT_SECRET= 
```

### Apple OAuth
```
APPLE_CLIENT_ID= 
APPLE_TEAM_ID= 
APPLE_KEY_ID= 
APPLE_PRIVATE_KEY=  
```

### Required for OAuth (Important!)
```
AUTH_URL=https://recipe-app-web-xtnu.onrender.com
```

**Important Notes:**
- The `APPLE_PRIVATE_KEY` must be on multiple lines (with line breaks)
- In Render, you can paste it as-is, or use `\n` for line breaks if needed
- The code automatically handles `\n` conversion in the private key

## How to Add to Render

1. Go to your Render dashboard
2. Select your web service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add each variable above
6. Save and redeploy

## Features Implemented

✅ Google OAuth provider configured
✅ Apple OAuth provider configured  
✅ OAuth buttons added to signin screen
✅ OAuth buttons added to signup screen
✅ Mobile OAuth flow using expo-web-browser
✅ Automatic user creation on first OAuth signin
✅ Session management after OAuth authentication

## Testing

After adding environment variables and redeploying:

1. **Web**: Navigate to `/account/signin` and click "Sign in with Google" or "Sign in with Apple"
2. **Mobile**: Tap the OAuth buttons on the signin/signup screens
3. Complete the OAuth flow
4. You should be authenticated and redirected to the app

## Troubleshooting

- If OAuth buttons don't appear: Check that environment variables are set correctly
- If OAuth fails: Check Render logs for authentication errors
- For Apple: Ensure the Service ID and redirect URLs are correctly configured in Apple Developer Console
- For Google: Ensure redirect URIs match in Google Cloud Console
