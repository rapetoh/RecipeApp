import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuthStore } from './store';

const callbackUrl = '/api/auth/token';
const callbackQueryString = `callbackUrl=${callbackUrl}`;

/**
 * This renders a WebView for authentication and handles both web and native platforms.
 */
export const AuthWebView = ({ mode, baseURL }) => {
  const [currentURI, setURI] = useState(`${baseURL}/account/${mode}?${callbackQueryString}`);
  const { auth, setAuth, isReady } = useAuthStore();
  const isAuthenticated = isReady ? !!auth : null;
  const iframeRef = useRef(null);
  
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    if (isAuthenticated) {
      router.back();
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    if (isAuthenticated) {
      return;
    }
    setURI(`${baseURL}/account/${mode}?${callbackQueryString}`);
  }, [mode, baseURL, isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }
    const handleMessage = (event) => {
      // Verify the origin for security
      if (event.origin !== baseURL) {
        return;
      }
      if (event.data.type === 'AUTH_SUCCESS') {
        setAuth({
          jwt: event.data.jwt,
          user: event.data.user,
        });
      } else if (event.data.type === 'AUTH_ERROR') {
        console.error('Auth error:', event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setAuth, baseURL]);

  if (Platform.OS === 'web') {
    const handleIframeError = () => {
      console.error('Failed to load auth iframe');
    };

    return (
      <iframe
        ref={iframeRef}
        title="Authentication"
        src={`${baseURL}/account/${mode}?callbackUrl=/api/auth/expo-web-success`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        onError={handleIframeError}
      />
    );
  }
  
  // Handle messages from WebView (for native mobile)
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 WebView message received:', data);
      
      if (data.type === 'AUTH_SUCCESS') {
        setAuth({
          jwt: data.jwt,
          user: data.user,
        });
      } else if (data.type === 'AUTH_ERROR') {
        console.error('Auth error:', data.error);
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err);
    }
  };

  // Inject JavaScript to intercept postMessage and forward to React Native
  const injectedJavaScript = `
    (function() {
      // Override window.postMessage to also send to React Native
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message, targetOrigin) {
        // Call original for iframe communication
        if (originalPostMessage) {
          originalPostMessage.call(window, message, targetOrigin);
        }
        
        // Also send to React Native WebView if available
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      };
      
      // Intercept all form submissions to prevent GET requests
      document.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, true);
    })();
    true; // Required for injected JavaScript
  `;

  return (
    <WebView
      sharedCookiesEnabled
      source={{
        uri: currentURI,
      }}
      injectedJavaScript={injectedJavaScript}
      onMessage={handleWebViewMessage}
      onShouldStartLoadWithRequest={(request) => {
        // Prevent navigation that would convert POST to GET
        if (request.url.includes('/api/auth/signin') || request.url.includes('/api/auth/signup')) {
          // These should be POST requests, not GET - block navigation
          return false;
        }
        
        if (request.url === `${baseURL}${callbackUrl}`) {
          // Handle callback URL
          fetch(request.url, { credentials: 'include' }).then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              setAuth({ jwt: data.jwt, user: data.user });
            }
          });
          return false;
        }
        if (request.url === currentURI) return true;

        // Add query string properly by checking if URL already has parameters
        const hasParams = request.url.includes('?');
        const separator = hasParams ? '&' : '?';
        if (request.url.endsWith(callbackUrl)) {
          setURI(request.url);
          return false;
        }
        setURI(`${request.url}${separator}${callbackQueryString}`);
        return false;
      }}
      style={{ flex: 1 }}
    />
  );
};

