import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
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
      const callbackUrl = `${apiUrl}/api/auth/token`;
      
      // Use custom OAuth endpoint that handles CSRF token and form submission
      // Auth.js requires POST with CSRF token, this endpoint bridges GET to POST
      const oauthUrl = `${apiUrl}/api/auth/oauth/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      
      // Open browser for OAuth flow
      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, callbackUrl);
      
      if (result.type === 'success') {
        // After OAuth callback, fetch the token
        const response = await fetch(callbackUrl, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setAuth({
            jwt: data.jwt,
            user: data.user,
          });
          router.replace('/');
        } else {
          throw new Error('Failed to get authentication token');
        }
      }
      // If cancelled, do nothing
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

