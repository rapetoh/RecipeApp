import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect } from 'react';
import { useAuthStore, authKey } from './store';


/**
 * This hook provides authentication functionality.
 */
export const useAuth = () => {
  const router = useRouter();
  const { isReady, auth, setAuth } = useAuthStore();

  const initiate = useCallback(() => {
    SecureStore.getItemAsync(authKey).then((auth) => {
      useAuthStore.setState({
        auth: auth ? JSON.parse(auth) : null,
        isReady: true,
      });
    });
  }, []);

  useEffect(() => {}, []);

  const signIn = useCallback(() => {
    router.push('/account/signin');
  }, [router]);
  const signUp = useCallback(() => {
    router.push('/account/signup');
  }, [router]);

  const signOut = useCallback(() => {
    setAuth(null);
  }, [setAuth]);

  return {
    isReady,
    isAuthenticated: isReady ? !!(auth && auth.jwt) : null,
    signIn,
    signOut,
    signUp,
    auth,
    setAuth,
    initiate,
  };
};

/**
 * This hook will automatically navigate to signin if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady, signIn } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      signIn();
    }
  }, [isAuthenticated, isReady, signIn]);
};

export default useAuth;

