/**
 * API Configuration
 * 
 * For local testing, create apps/mobile/src/config/api.local.js with:
 * export const LOCAL_API_URL = 'http://100.111.160.80:5173';
 * 
 * This file is gitignored, so you can change it without affecting the repo.
 * 
 * IMPORTANT: Local override ONLY works in development mode (__DEV__ === true).
 * Production builds will always use environment variables or build-time config.
 */

let localOverride = null;

// Try to load local override (ONLY in development)
if (__DEV__) {
  try {
    const localConfig = require('./api.local.js');
    localOverride = localConfig.LOCAL_API_URL;
  } catch (e) {
    // Local config doesn't exist, use defaults
  }
}

export const getApiUrl = () => {
  // Local override ONLY in development mode (prevents accidental use in production)
  if (__DEV__ && localOverride) {
    return localOverride;
  }
  // Then check environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Fallback to localhost
  return 'http://localhost:5173';
};

