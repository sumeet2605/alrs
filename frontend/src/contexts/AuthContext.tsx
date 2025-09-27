// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Body_user_login_api_login_post } from '../api/models/Body_user_login_api_login_post';// Generated types
import type { Token } from '../api/models/Token'; // Generated types
import { AuthenticationService } from '../api/services/AuthenticationService'; // Generated services
import { OpenAPI } from '../api/core/OpenAPI';

// 1. Define Context State Type
interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  userRole: string | null; // Placeholder: You'll need to decode the role from the token later
  login: (credentials: Body_user_login_api_login_post) => Promise<void>;
  logout: () => void;
  // refreshToken: () => Promise<void>; // Advanced: For future implementation
}

// 2. Create the Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Auth Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check storage on load
  useEffect(() => {
    const storedAccess = localStorage.getItem('access_token');
    const storedRefresh = localStorage.getItem('refresh_token');
    
    // NOTE: This is simplified. In a real app, you'd check token expiration here.
    if (storedAccess && storedRefresh) {
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      OpenAPI.TOKEN = storedAccess; // Ensure token is set for API requests
      (async () => {
        try {
          const user = await AuthenticationService.getCurrentUserApiMeGet();
          setUserRole(user.role.name);
        } catch (error) {
          setUserRole(null);
        }
      })();
    }
  }, []);

  const login = async (credentials: Body_user_login_api_login_post) => {
    try {
      // Call the generated API login function
      const tokenData: Token = await AuthenticationService.userLoginApiLoginPost(credentials);

      // Store tokens
      localStorage.setItem('access_token', tokenData.access_token);
      localStorage.setItem('refresh_token', tokenData.refresh_token);

      setAccessToken(tokenData.access_token);
      setRefreshToken(tokenData.refresh_token);
      OpenAPI.TOKEN = tokenData.access_token; // Ensure token is set for API requests
      const user = await AuthenticationService.getCurrentUserApiMeGet();

      setUserRole(user.role.name); // Update based on token decode

      // Success
      console.log("Login successful!");
    } catch (error) {
      // Throw error to be handled by the form component
      console.error("Login failed:", error);
      throw error; 
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUserRole(null);
    // Redirect logic will be handled by the consumer components
  };

  const value = {
    isAuthenticated: !!accessToken,
    accessToken,
    userRole,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 4. Custom Hook for easy context consumption
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};