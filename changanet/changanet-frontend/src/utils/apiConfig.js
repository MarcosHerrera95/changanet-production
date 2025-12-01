/**
 * API Configuration utility
 * Centralizes backend URL configuration for all API calls
 */

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';
};

/**
 * Standardized fetch wrapper for API calls
 */
export const apiFetch = async (endpoint, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  return response;
};
