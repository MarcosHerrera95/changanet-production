/**
 * Global API Configuration for Changánet Frontend
 * Centralized backend URL configuration to avoid hardcoded URLs
 */

// Default backend URL - should match your backend server port
export const API_BASE_URL = import.meta.env.PROD
  ? 'https://changanet-production-backend.onrender.com'
  : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003');

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  return endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
};

// Authenticated fetch wrapper
export const authFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('changanet_token');
  const url = buildApiUrl(endpoint);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
  
  return response;
};

// Public fetch wrapper (for endpoints that don't require auth)
export const publicFetch = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

export default {
  API_BASE_URL,
  buildApiUrl,
  authFetch,
  publicFetch
};
