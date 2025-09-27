// Shared backend configuration
// This file uses CommonJS format to work in both Node.js (Vite config) and browser environments

const getBackendUrl = () => {
  // Priority order for backend URL configuration:
  // 1. Environment variable VITE_BACKEND_URL
  // 2. proxy-config.json file
  // 3. Default fallback
  
  // Check environment variable first (works in both Node.js and Vite)
  const envBackendUrl = process.env.VITE_BACKEND_URL || process.env.VITE_BACKEND_URL;
  if (envBackendUrl) {
    console.log(`Using backend URL from environment: ${envBackendUrl}`);
    return envBackendUrl.replace(/\/$/, ''); // Remove trailing slash if present
  }
  
  // Check proxy-config.json file (Node.js only)
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync('./proxy-config.json', 'utf8'));
      const configUrl = config.target || config.backendUrl;
      if (configUrl) {
        console.log(`Using backend URL from proxy-config.json: ${configUrl}`);
        return configUrl;
      }
    } catch (error) {
      // File doesn't exist or is invalid, continue to default
    }
  }
  
  // Default fallback
  const defaultUrl = 'http://localhost:8000';
  console.log(`Using default backend URL: ${defaultUrl}`);
  return defaultUrl;
};

module.exports = { getBackendUrl };