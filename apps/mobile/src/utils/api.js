import { getApiUrl as getApiUrlFromConfig } from '../config/api';

/**
 * Get the API base URL from environment variables
 * Falls back to localhost for development
 */
export const getApiUrl = getApiUrlFromConfig;

/**
 * Helper to make API calls with the correct base URL
 */
export const apiFetch = async (endpoint, options = {}) => {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};
