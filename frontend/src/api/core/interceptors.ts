// src/api/core/interceptors.ts
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// Get the token from local storage
const getAccessToken = () => localStorage.getItem('access_token');

/**
 * Configure Axios interceptor to attach the Authorization header.
 * @param config The Axios request configuration object.
 * @returns The modified config object.
 */
export const authRequestInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  const token = getAccessToken();

  // If a token exists and the request is not explicitly marked as public (optional check)
  // and the URL is for our backend API, attach the Authorization header.
  if (token && config.url && config.url.startsWith('/api')) { 
    if (!config.headers) {
      config.headers = {};
    }
    // Set the standard Bearer token header
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
};

// You would typically add this interceptor during your app's initialization or
// directly within the generated API client's setup if possible.

// Example: If your API client uses a global Axios instance (often found in the generated 'core' folder):
// axios.interceptors.request.use(authRequestInterceptor);