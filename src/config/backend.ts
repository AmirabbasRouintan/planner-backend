// Centralized backend configuration
// This file provides a single source of truth for backend URL configuration

// Get backend URL from environment variable, proxy-config.json, or use default
export function getBackendUrl(): string {
  // Use the environment variable if available
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // In development, fallback to pythonanywhere backend
  if (import.meta.env.DEV) {
    return 'https://ixiflower32.pythonanywhere.com';
  }
  
  // In production, use the pythonanywhere backend
  return 'https://ixiflower32.pythonanywhere.com';
}

// Get API base URL
export const getApiBaseUrl = (): string => {
  const backendUrl = getBackendUrl();
  return `${backendUrl}/tickets/api`;
};

// Export as constants for convenience
export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = getApiBaseUrl();