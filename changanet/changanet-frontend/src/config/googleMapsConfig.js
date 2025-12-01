/**
 * Google Maps API Configuration for Changánet Frontend
 * Centralized configuration for Google Maps API key and settings
 */

// Google Maps API Key - configured for allowed domains
export const GOOGLE_MAPS_API_KEY = 'AIzaSyC109U8i3zXQTsKetuqLlQKgl4BEkiFf6k';

// Google Maps API configuration
export const GOOGLE_MAPS_CONFIG = {
  apiKey: GOOGLE_MAPS_API_KEY,
  version: 'weekly',
  libraries: ['places', 'geometry', 'routes'],
  region: 'AR', // Argentina
  language: 'es' // Spanish
};

// Allowed domains for API key (as configured in Google Cloud Console)
export const ALLOWED_DOMAINS = [
  'http://localhost:5174',
  'https://localhost:5174',
  'http://localhost:5175',
  'https://localhost:5175',
  'http://localhost:5176',
  'https://localhost:5176',
  'https://app.changanet.com.ar',
  'https://www.changanet.com.ar'
];

export default {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_CONFIG,
  ALLOWED_DOMAINS
};
