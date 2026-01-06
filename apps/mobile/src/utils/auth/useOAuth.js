import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from './useAuth';
import { getApiUrl } from '../api';

// Complete the web browser authentication session
WebBrowser.maybeCompleteAuthSession();

/**
 * Hook to handle OAuth authentication (Google, Apple, etc.)
 */
export function useOAuth() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const signInWithOAuth = useCallback(async (provider) => {
    try {
      const apiUrl = getApiUrl();
      // The server will redirect to our app scheme with the token
      const callbackUrl = `${apiUrl}/api/auth/token`;
      
      // The app scheme URL that the server will redirect to
      const appCallbackUrl = 'recipeapp://oauth/callback';
      
      // Use custom OAuth endpoint that handles CSRF token and form submission
      const oauthUrl = `${apiUrl}/api/auth/oauth/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      
      console.log('🔐 Starting OAuth flow:', oauthUrl);
      console.log('🔐 App callback URL:', appCallbackUrl);
      
      // Open browser for OAuth flow
      // The server will redirect to recipeapp://oauth/callback?jwt=...&user=...
      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, appCallbackUrl);
      
      console.log('🔐 OAuth result:', result.type);
      
      if (result.type === 'success' && result.url) {
        console.log('🔐 Received callback URL:', result.url);
        
        // Parse the token and user from the redirect URL
        const url = new URL(result.url);
        const params = new URLSearchParams(url.search);
        
        // Check for errors
        const error = params.get('error');
        if (error) {
          console.error('🔐 OAuth error:', error);
          throw new Error(`OAuth failed: ${error}`);
        }
        
        // Get token and user data
        const jwt = params.get('jwt');
        const userJson = params.get('user');
        
        if (!jwt || !userJson) {
          throw new Error('Missing jwt or user in callback');
        }
        
        const user = JSON.parse(decodeURIComponent(userJson));
        
        console.log('🔐 OAuth success for user:', user.email);
        
        // Set auth state
        setAuth({
          jwt,
          user,
        });
        
        // Navigate to home
        router.replace('/');
      } else if (result.type === 'cancel') {
        console.log('🔐 OAuth cancelled by user');
      }
    } catch (error) {
      console.error(`OAuth signin error (${provider}):`, error);
      throw error;
    }
  }, [setAuth, router]);

  return {
    signInWithGoogle: () => signInWithOAuth('google'),
    signInWithApple: () => signInWithOAuth('apple'),
  };
}

