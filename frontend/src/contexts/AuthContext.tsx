import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Body_user_login_api_login_post } from '../api/models/Body_user_login_api_login_post';
import type { Token } from '../api/models/Token';
// Assuming AuthenticationService and OpenAPI are generated from your backend schema
import { AuthenticationService } from '../api/services/AuthenticationService'; 
import { OpenAPI } from '../api/core/OpenAPI'; 

// --- 1. Define Context State Type ---
interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  userRole: string | null;
  isRefreshing: boolean;
  login: (credentials: Body_user_login_api_login_post) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  /**
   * Wrapper for making authenticated API calls. 
   * Handles 401 interception, token refresh, and retry logic automatically.
   */
  authorizedFetch: <T>(serviceCall: () => Promise<T>) => Promise<T>;
}

// --- 2. Create the Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- 3. Auth Provider Component ---
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Ref to hold pending requests while a token refresh is in progress
  const failedQueue = useRef<(() => void)[]>([]);

  // --- Utility Functions (useCallback for stability) ---

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUserRole(null);
    OpenAPI.TOKEN = undefined;
    console.log("Logged out. Tokens cleared.");
  }, []);

  /**
   * Handles the actual call to the /refresh endpoint.
   * Returns true on success, false on failure (and logs user out).
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) {
      console.error("Cannot refresh: No refresh token available.");
      logout();
      return false;
    }
    if (isRefreshing) return false; // Already refreshing

    setIsRefreshing(true);
    
    // Temporarily set the refresh token for the refresh call itself
    // NOTE: This assumes the generated client uses OpenAPI.TOKEN for the Authorization header.
    // In a real scenario, you might need a dedicated, raw fetch for this endpoint.
    const originalToken = OpenAPI.TOKEN;
    OpenAPI.TOKEN = refreshToken; 

    try {
      const tokenData: Token = await AuthenticationService.refreshTokenApiRefreshPost();
      
      // Success: Store new tokens
      localStorage.setItem('access_token', tokenData.access_token);
      localStorage.setItem('refresh_token', tokenData.refresh_token);
      setAccessToken(tokenData.access_token);
      setRefreshToken(tokenData.refresh_token);
      OpenAPI.TOKEN = tokenData.access_token; // Set the new access token globally

      setIsRefreshing(false);
      // Process the queue of failed requests
      failedQueue.current.forEach(resolve => resolve());
      failedQueue.current = [];
      return true;

    } catch (error) {
      console.error("Refresh token failed:", error);
      // Failure: Log the user out
      logout();
      setIsRefreshing(false);
      // Restore original token if failure occurred before new tokens were set
      OpenAPI.TOKEN = originalToken; 
      return false;
    }
  }, [refreshToken, isRefreshing, logout]);

  /**
   * Wrapper function to intercept 401 errors, refresh the token, and retry the request.
   */
  const authorizedFetch = useCallback(async <T,>(serviceCall: () => Promise<T>): Promise<T> => {
    try {
      // 1. Attempt the original API call
      return await serviceCall();
    } catch (error: any) {
      // Check if the error is a 401 Unauthorized error
      if (error?.status !== 401) {
        throw error; // Not a 401, re-throw
      }

      // If no refresh token exists, we can't refresh. Force logout.
      if (!refreshToken) {
        logout();
        throw error;
      }
      
      // 2. 401 occurred. Handle token refresh/queueing.
      
      // If a refresh is already in progress, queue the current request and wait.
      if (isRefreshing) {
        return new Promise<T>((resolve) => {
          failedQueue.current.push(async () => {
            // Once refresh is done, retry the original service call
            resolve(await serviceCall());
          });
        });
      }

      // 3. Initiate the refresh process
      const refreshSuccess = await refreshAccessToken();
      
      if (refreshSuccess) {
        // 4. Refresh successful, retry the original request
        return await serviceCall();
      } else {
        // 5. Refresh failed (user is now logged out)
        throw error;
      }
    }
  }, [refreshToken, isRefreshing, refreshAccessToken, logout]);


  // --- Core Context Logic ---

  const login = useCallback(async (credentials: Body_user_login_api_login_post) => {
    try {
      const tokenData: Token = await AuthenticationService.userLoginApiLoginPost(credentials);

      // Store tokens
      localStorage.setItem('access_token', tokenData.access_token);
      localStorage.setItem('refresh_token', tokenData.refresh_token);

      setAccessToken(tokenData.access_token);
      setRefreshToken(tokenData.refresh_token);
      OpenAPI.TOKEN = tokenData.access_token; // Set access token globally

      // Fetch user data and role using the new token
      const user = await AuthenticationService.getCurrentUserApiMeGet();
      setUserRole(user.role.name); 

      console.log("Login successful!");
    } catch (error) {
      console.error("Login failed:", error);
      throw error; 
    }
  }, [authorizedFetch]);


  // --- Initial Load Effect ---
  useEffect(() => {
    const storedAccess = localStorage.getItem('access_token');
    const storedRefresh = localStorage.getItem('refresh_token');
    
    if (storedAccess && storedRefresh) {
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      OpenAPI.TOKEN = storedAccess; 
      
      // Fetch user data/role using authorizedFetch to handle immediate token expiry
      authorizedFetch(() => AuthenticationService.getCurrentUserApiMeGet())
        .then(user => {
          setUserRole(user.role.name);
        })
        .catch(error => {
          console.error("Initial token validation failed:", error);
          // If token fails to validate (even after refresh attempt), force logout
          logout();
        });
    } else {
      // Clear any leftover global token
      OpenAPI.TOKEN = undefined;
    }
  }, [logout, authorizedFetch]); // Only runs on component mount

  const value = {
    isAuthenticated: !!accessToken,
    accessToken,
    userRole,
    isRefreshing,
    login,
    logout,
    refreshAccessToken,
    authorizedFetch,
  };

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
