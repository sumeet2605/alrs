// src/api/core/interceptors.ts
import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';

const ACCESS_KEY = 'access_token';
const REFRESH_ENDPOINT = '/api/refresh';
const LOGIN_ENDPOINT = '/api/login';
const LOGOUT_ENDPOINT = '/api/logout';

// --- simple helpers ---
const getAccessToken = () => {
  try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
};
const setAccessToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(ACCESS_KEY, token);
    else localStorage.removeItem(ACCESS_KEY);
  } catch {}
};

// --- Request interceptor: attach Authorization header for API calls (skip refresh/login) ---
export const authRequestInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  // Only attach for our API prefix and not for refresh/login endpoints
  try {
    const token = getAccessToken();
    const url = config.url ?? '';
    if (token && url.startsWith('/api') && !url.startsWith(REFRESH_ENDPOINT) && !url.startsWith(LOGIN_ENDPOINT)) {
      if (!config.headers) config.headers = {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
};

// --- Response interceptor with refresh & queueing ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
  config: AxiosRequestConfig;
}> = [];

const processQueue = (error: any | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) reject(error);
    else {
      // attach new token and retry
      if (token) {
        if (!config.headers) config.headers = {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      resolve(axios(config));
    }
  });
  failedQueue = [];
};

export const initAuthInterceptors = (onLogout?: () => void) => {
  // Add request interceptor
  axios.interceptors.request.use(authRequestInterceptor, (err) => Promise.reject(err));

  // Add response interceptor
  axios.interceptors.response.use(
    (res) => res,
    async (err: AxiosError) => {
      const originalConfig = err.config as AxiosRequestConfig & { _retry?: boolean };
      // If no response or no config, forward error
      if (!err.response || !originalConfig) return Promise.reject(err);

      const status = err.response.status;

      // If 401 and not already retried
      if (status === 401 && !originalConfig._retry) {
        // Don't attempt refresh for refresh endpoint itself or logout endpoint
        if (originalConfig.url && (originalConfig.url.startsWith(REFRESH_ENDPOINT) || originalConfig.url.startsWith(LOGOUT_ENDPOINT))) {
          // Let it fail and call logout callback
          if (onLogout) onLogout();
          return Promise.reject(err);
        }

        // Mark the request as retried to avoid loops
        originalConfig._retry = true;

        if (isRefreshing) {
          // Queue request until refresh finished
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalConfig });
          });
        }

        isRefreshing = true;

        try {
          // Call refresh endpoint. Use fetch style via axios but ensure cookies are sent.
          const refreshResponse = await axios.post(
            REFRESH_ENDPOINT,
            {}, // body empty - cookie-based refresh expected
            { withCredentials: true } // pass cookies
          );

          // Expect payload: { access_token: '...' } or similar
          const newAccess = refreshResponse.data?.access_token ?? refreshResponse.data?.accessToken ?? null;
          if (!newAccess) {
            // no token in response -> treat as failure
            throw new Error('No access_token in refresh response');
          }

          // Save and set global header
          setAccessToken(newAccess);
          axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;

          // Process queued requests
          processQueue(null, newAccess);

          // Retry the original request with new token
          if (!originalConfig.headers) originalConfig.headers = {};
          originalConfig.headers['Authorization'] = `Bearer ${newAccess}`;
          isRefreshing = false;
          return axios(originalConfig);
        } catch (refreshError) {
          // Refresh failed -> clear queue and optionally call logout handler
          processQueue(refreshError, null);
          isRefreshing = false;
          setAccessToken(null);

          // allow caller to trigger logout UI
          if (onLogout) onLogout();
          return Promise.reject(refreshError);
        }
      }

      // For other statuses, just forward
      return Promise.reject(err);
    }
  );
};
