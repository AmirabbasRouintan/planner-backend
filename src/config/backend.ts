// Centralized backend configuration
// This file provides a single source of truth for backend URL configuration

// Get backend URL from environment variable, proxy-config.json, or use default
export const getBackendUrl = (): string => {
  // In Vite, environment variables are available via import.meta.env
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // Remove trailing slash if present
  }
  
  // Check if we have access to the shared config (in development/build)
  if (typeof window !== 'undefined' && (window as any).backendConfig) {
    return (window as any).backendConfig.getBackendUrl();
  }
  
  // Default fallback
  return 'http://localhost:8000';
};

// Get API base URL (includes /tickets/api suffix)
export const getApiBaseUrl = (): string => {
  const backendUrl = getBackendUrl();
  return `${backendUrl}/tickets/api`;
};

// Export as constants for convenience
export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = getApiBaseUrl();