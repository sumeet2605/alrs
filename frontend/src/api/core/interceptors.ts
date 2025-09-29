// src/api/core/interceptors.ts
import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig, AxiosInstance } from 'axios';

const ACCESS_KEY = 'access_token';
const REFRESH_ENDPOINT = '/api/refresh';
const LOGIN_ENDPOINT = '/api/login';
const LOGOUT_ENDPOINT = '/api/logout';

// Ensure axios sends cookies by default (can be overridden per-request)
axios.defaults.withCredentials = true;

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

// Robust URL matcher that works for absolute and relative URLs
const urlMatches = (configUrl: string | undefined, endpoint: string) => {
  if (!configUrl) return false;
  try {
    const parsed = new URL(configUrl, window.location.origin);
    const path = parsed.pathname;
    return path === endpoint || path.endsWith(endpoint) || path.includes(endpoint);
  } catch {
    // fallback for non-URL strings
    return configUrl === endpoint || configUrl.endsWith(endpoint) || configUrl.includes(endpoint);
  }
};

// --- Request interceptor: attach Authorization header for API calls (skip refresh/login) ---
export const authRequestInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  try {
    const token = getAccessToken();
    const url = config.url ?? '';
    if (token && !urlMatches(url, REFRESH_ENDPOINT) && !urlMatches(url, LOGIN_ENDPOINT)) {
      if (!config.headers) config.headers = {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
    console.error('authRequestInterceptor error', e);
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
  // Add request interceptor to global axios
  axios.interceptors.request.use(authRequestInterceptor, (err) => Promise.reject(err));

  // Add response interceptor to global axios
  axios.interceptors.response.use(
    (res) => res,
    async (err: AxiosError) => {
      const originalConfig = err.config as AxiosRequestConfig & { _retry?: boolean };

      // If no response or no config, forward error
      if (!err.response || !originalConfig) {
        console.debug('[interceptor] no response or config', err);
        return Promise.reject(err);
      }

      const status = err.response.status;
      const reqUrl = originalConfig.url ?? '<unknown>';

      // Debug log
      console.debug(`[interceptor] response error ${status} for ${reqUrl}`);

      // If 401 and not already retried
      if (status === 401 && !originalConfig._retry) {
        // Don't attempt refresh for refresh endpoint itself or logout endpoint
        if (urlMatches(reqUrl, REFRESH_ENDPOINT) || urlMatches(reqUrl, LOGOUT_ENDPOINT)) {
          console.warn('[interceptor] 401 from refresh/logout endpoint; invoking onLogout if provided');
          if (onLogout) onLogout();
          return Promise.reject(err);
        }

        //Mark the request as retried to avoid loops
        originalConfig._retry = true;

        if (isRefreshing) {
          // Queue request until refresh finished
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalConfig });
          });
        }

        isRefreshing = true;
        console.debug('[interceptor] starting token refresh');

        try {
          // Call refresh endpoint. withCredentials true ensures cookies are sent.
          const refreshResponse = await axios.post(
            REFRESH_ENDPOINT,
            {}, // body empty - cookie-based refresh expected
            { withCredentials: true } // ensure cookies included (redundant because of defaults)
          );

          // Expect payload: { access_token: '...' } or similar
          const newAccess = refreshResponse.data?.access_token ?? refreshResponse.data?.accessToken ?? null;
          if (!newAccess) {
            console.error('[interceptor] refresh response missing access_token', refreshResponse.data);
            throw new Error('No access_token in refresh response');
          }

          // Save and set global header
          setAccessToken(newAccess);
          axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;

          console.debug('[interceptor] refresh succeeded, retrying queued requests');

          // Process queued requests
          processQueue(null, newAccess);

          // Retry the original request with new token
          if (!originalConfig.headers) originalConfig.headers = {};
          originalConfig.headers['Authorization'] = `Bearer ${newAccess}`;
          isRefreshing = false;
          return axios(originalConfig);
        } catch (refreshError) {
          console.error('[interceptor] refresh failed', refreshError);
          // Refresh failed -> clear queue and optionally call logout handler
          processQueue(refreshError, null);
          isRefreshing = false;
          setAccessToken(null);

          if (onLogout) onLogout();
          return Promise.reject(refreshError);
        }
      }

      // For other statuses, just forward
      return Promise.reject(err);
    }
  );
};

// Attach the same interceptors to a custom axios instance if you use one
export const attachToInstance = (instance: AxiosInstance, onLogout?: () => void) => {
  instance.defaults.withCredentials = true;
  instance.interceptors.request.use(authRequestInterceptor, (err) => Promise.reject(err));
  instance.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => Promise.reject(err) // you can copy the response logic above if needed for per-instance handling
  );
};
