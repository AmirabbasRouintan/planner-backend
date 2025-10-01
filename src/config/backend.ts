// Centralized backend configuration
// This file provides a single source of truth for backend URL configuration

// Get backend URL from environment variable, proxy-config.json, or use default
export function getBackendUrl(): string {
  // In development, use the environment variable or fallback to localhost
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  }
  
  // In production, use the current host as the backend
  return window.location.origin;
}

// Get API base URL
export const getApiBaseUrl = (): string => {
  const backendUrl = getBackendUrl();
  return `${backendUrl}/tickets/api`;
};

// Export as constants for convenience
export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = getApiBaseUrl();