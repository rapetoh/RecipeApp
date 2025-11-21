import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo, useEffect } from "react";

const ERROR_MESSAGES = {
  MISSING_FIELDS: 'Please fill in all fields',
  INVALID_CREDENTIALS: 'Invalid email or password',
  SERVER_ERROR: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
};

export default function SignInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detect if we're in a mobile WebView
  const isInWebView = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.parent !== window || callbackUrl === '/api/auth/token';
  }, [callbackUrl]);

  // Inject JavaScript to intercept form submissions at DOM level (for WebView)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // This script intercepts form submissions before React Router can
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        // Intercept all form submissions
        document.addEventListener('submit', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }, true); // Use capture phase to run before React Router
        
        // Also prevent any button clicks that might trigger navigation
        document.addEventListener('click', function(e) {
          const target = e.target;
          if (target.tagName === 'BUTTON' && target.type === 'submit') {
            const form = target.closest('form');
            if (form) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }, true);
      })();
    `;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    
    console.log('🔐 Signin handleSubmit called', { email: email.substring(0, 3) + '...', hasPassword: !!password });
    
    setError(null);
    setLoading(true);

    // Basic validation
    if (!email.trim() || !password) {
      setError(ERROR_MESSAGES.MISSING_FIELDS);
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('callbackUrl', callbackUrl);

      console.log('📤 Making POST request to /api/auth/signin');
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('📥 Response received:', response.status, response.statusText);
      const data = await response.json();
      console.log('📦 Response data:', { success: data.success, hasUser: !!data.user });

      if (!response.ok || !data.success) {
        const errorMessage = ERROR_MESSAGES[data.error] || data.message || ERROR_MESSAGES.SERVER_ERROR;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Handle mobile WebView
      if (isInWebView || data.isMobileCallback) {
        console.log('📱 WebView detected, sending postMessage');
        const message = {
          type: 'AUTH_SUCCESS',
          jwt: data.sessionToken,
          user: data.user,
        };
        console.log('📨 Posting message:', message);
        
        // Try multiple methods to ensure message gets through
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(message, '*');
        }
        
        // Also try React Native WebView postMessage
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
        
        // Fallback: post to current window
        window.postMessage(message, '*');
        return;
      }

      // Web: Use React Router navigation
      console.log('🌐 Web navigation to:', data.redirect || callbackUrl);
      navigate(data.redirect || callbackUrl, { replace: true });

    } catch (err) {
      console.error('❌ Signin error:', err);
      setError(ERROR_MESSAGES.NETWORK_ERROR);
      setLoading(false);
    }
  }, [email, password, callbackUrl, navigate, isInWebView]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
        noValidate
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600 mt-2">
            Sign in to your RecipeApp account
          </p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-[#FF9F1C] focus-within:ring-1 focus-within:ring-[#FF9F1C]">
              <input
                required
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                className="w-full bg-transparent text-lg outline-none disabled:opacity-50"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 focus-within:border-[#FF9F1C] focus-within:ring-1 focus-within:ring-[#FF9F1C]">
              <input
                required
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg bg-transparent text-lg outline-none disabled:opacity-50"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-[#FF9F1C] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#E8900F] focus:outline-none focus:ring-2 focus:ring-[#FF9F1C] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a
              href={`/account/signup${
                typeof window !== "undefined" ? window.location.search : ""
              }`}
              className="text-[#FF9F1C] hover:text-[#E8900F] font-medium"
            >
              Sign up
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
