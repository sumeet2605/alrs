// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Body_user_login_api_login_post } from '../api/models/Body_user_login_api_login_post';
import type { Token } from '../api/models/Token';
import { AuthenticationService } from '../api/services/AuthenticationService';
import { OpenAPI } from '../api/core/OpenAPI';
import axios from 'axios';

// --- 1. Define Context State Type ---
interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  userRole: string | null;
  isRefreshing: boolean;
  login: (credentials: Body_user_login_api_login_post) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  authorizedFetch: <T>(serviceCall: () => Promise<T>) => Promise<T>;
}

// --- 2. Create the Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Helpers ---
const ACCESS_KEY = 'access_token';

// set OpenAPI token helper
function setOpenApiToken(token: string | null) {
  if (token) {
    OpenAPI.TOKEN = token;
  } else {
    // @ts-ignore
    OpenAPI.TOKEN = undefined;
  }
}

// --- 3. Auth Provider Component ---
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  /**
   * Queue of pending requests while refresh is in progress.
   * Each item is a function that, when called, will retry the original request and resolve/reject the waiting promise.
   */
  const pendingQueue = useRef<Array<{ 
    retry: () => Promise<any>, 
    resolve: (v: any) => void, 
    reject: (err: any) => void 
  }>>([]);

  // --- Utilities ---
   const clearTokensLocal = useCallback(() => {
      try {
        localStorage.removeItem(ACCESS_KEY);
      } catch {}
      setAccessToken(null);
      setOpenApiToken(null);
      // also clear axios global header if set
      try {
        // require dynamically to avoid bundler ordering issues in some setups
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        // @ts-ignore
        const axios = require('axios');
          if (axios && axios.defaults && axios.defaults.headers?.common) {
            delete axios.defaults.headers.common['Authorization'];
          }
      } catch {}
    }, []);

  const logout = useCallback(() => {
    // Keep same behavior: clear tokens client-side and OpenAPI
    clearTokensLocal();
    setUserRole(null);
    console.log('Logged out. Tokens cleared.');
  }, [clearTokensLocal]);

  const storeTokens = useCallback((access: string | null) => {
    if (access) {
      try { localStorage.setItem(ACCESS_KEY, access); } catch {}
      setAccessToken(access);
      setOpenApiToken(access);
      // set global axios header so other code/interceptor sees it immediately
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        // @ts-ignore
        const axios = require('axios');
        if (axios && axios.defaults && axios.defaults.headers) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        }
      } catch {}
    } else {
      try { localStorage.removeItem(ACCESS_KEY); } catch {}
      setAccessToken(null);
      setOpenApiToken(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        // @ts-ignore
        const axios = require('axios');
        if (axios && axios.defaults && axios.defaults.headers?.common) {
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch {}
    }
  }, []);

  /**
   * refreshAccessToken:
   * - Uses cookie-based refresh: calls the backend refresh endpoint which reads the httpOnly cookie.
   * - If the backend returns a new access_token, we store it. Any refresh_token returned by the backend is ignored client-side.
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    // If already refreshing, return a promise that resolves when refresh finishes
    if (isRefreshing) {
      return new Promise<boolean>((resolve) => {
        pendingQueue.current.push({
          retry: async () => true,
          resolve: (v: any) => resolve(!!v),
          reject: () => resolve(false)
        });
      });
    }

    // If there's no access token at all, still attempt cookie refresh (server may issue new access)
    setIsRefreshing(true);
    try {
      // Cookie-based refresh: ensure credentials are sent
      const tokenData: Token = await AuthenticationService.refreshTokenApiRefreshPost(undefined, { withCredentials: true });
      if (tokenData && tokenData.access_token) {
        storeTokens(tokenData.access_token);
        // flush pending queue: retry all queued requests
        const queue = pendingQueue.current.splice(0);
        for (const item of queue) {
          try {
            const result = await item.retry();
            item.resolve(result);
          } catch (e) {
            item.reject(e);
          }
        }
        setIsRefreshing(false);
        return true;
      } else {
        setIsRefreshing(false);
        const queue = pendingQueue.current.splice(0);
        for (const item of queue) item.reject(new Error('Invalid refresh response'));
        logout();
        return false;
      }
    } catch (err) {
      setIsRefreshing(false);
      const queue = pendingQueue.current.splice(0);
      for (const item of queue) item.reject(err);
      logout();
      return false;
    }
  }, [isRefreshing, logout, storeTokens]);

  /**
   * authorizedFetch:
   * Wraps a call and on 401 attempts refresh and retry once.
   * Queues concurrent callers while refresh is in progress.
   */
  const authorizedFetch = useCallback(async <T,>(serviceCall: () => Promise<T>): Promise<T> => {
    try {
      return await serviceCall();
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status ?? null;
      if (status !== 401) {
        throw err; // not an auth error
      }

      // If refresh is in progress, enqueue this request and return promise that will be resolved/rejected after retry
      if (isRefreshing) {
        return new Promise<T>((resolve, reject) => {
          pendingQueue.current.push({
            retry: async () => {
              // when called, retry the original service call and return result
              return await serviceCall();
            },
            resolve,
            reject
          });
        });
      }

      // Attempt refresh (cookie-based)
      const ok = await refreshAccessToken();
      if (!ok) {
        // refresh failed and logout executed
        throw err;
      }

      // retry original call once after refresh
      return await serviceCall();
    }
  }, [isRefreshing, refreshAccessToken, logout]);

  // --- Core Context Logic: login (keep same except we DO NOT store refresh token) ---
  const login = useCallback(async (credentials: Body_user_login_api_login_post) => {
    try {
      const tokenData: Token = await AuthenticationService.userLoginApiLoginPost(credentials);

      // Store only access token client-side. The backend should set refresh token as an httpOnly cookie.
      try {
        if (tokenData.access_token) localStorage.setItem(ACCESS_KEY, tokenData.access_token);
      } catch {}
      setAccessToken(tokenData.access_token ?? null);
      setOpenApiToken(tokenData.access_token ?? null);

      // Fetch user data and role using the new token
      const user = await AuthenticationService.getCurrentUserApiMeGet();
      setUserRole(user.role.name);

      console.log("Login successful!");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  // --- Initial Load Effect ---
  useEffect(() => {
    const storedAccess = (() => { try { return localStorage.getItem(ACCESS_KEY); } catch { return null; } })();

    const initialize = async () => {
      if (storedAccess) {
        setAccessToken(storedAccess);
        setOpenApiToken(storedAccess);
        try {
          const user = await authorizedFetch(() => AuthenticationService.getCurrentUserApiMeGet());
          setUserRole(user?.role?.name ?? null);
        } catch {
          // if validation fails, attempt refresh (this may logout on failure)
          const ok = await refreshAccessToken();
          if (ok) {
            try {
              const user = await AuthenticationService.getCurrentUserApiMeGet();
              setUserRole(user?.role?.name ?? null);
            } catch {}
          }
        }
      } else {
        // No access token stored — attempt cookie-based refresh (server may issue a new access token)
        const ok = await refreshAccessToken();
        if (ok) {
          try {
            const user = await AuthenticationService.getCurrentUserApiMeGet();
            setUserRole(user?.role?.name ?? null);
          } catch {}
        } else {
          logout();
        }
      }
      setInitializing(false);
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run on mount only

  const value: AuthContextType = {
    isAuthenticated: !!accessToken,
    accessToken,
    userRole,
    isRefreshing,
    login,
    logout,
    refreshAccessToken,
    authorizedFetch
  };

  if (initializing) {
    // Optionally, show a spinner or blank screen while initializing
    return <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>Loading...</span></div>;
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- 4. Custom Hook for easy context consumption ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
