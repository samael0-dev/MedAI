import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, LoginCredentials, RegisterCredentials, GoogleAuthPayload, OtpResponseData } from '../types';
import {
  loginUser,
  registerUser,
  fetchCurrentUser,
  logoutUser,
  loginWithGoogle as apiLoginWithGoogle,
  sendLoginOtp,
  verifyLoginOtp,
} from '../api/client';
import { authClient } from '../lib/auth-client';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  loginWithGoogle: (payload: GoogleAuthPayload) => Promise<void>;
  sendOtp: (email: string) => Promise<OtpResponseData>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('medai_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem('medai_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Validate stored session on startup
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('medai_token');
      if (storedToken) {
        try {
          const profile = await fetchCurrentUser();
          setUser(profile);
          localStorage.setItem('medai_user', JSON.stringify(profile));
        } catch {
          // Token expired or invalid
          setUser(null);
          localStorage.removeItem('medai_token');
          localStorage.removeItem('medai_user');
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await loginUser(credentials);
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('medai_token', response.access_token);
      localStorage.setItem('medai_user', JSON.stringify(response.user));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      await registerUser(credentials);
      // Automatically log in after registration
      await login({ email: credentials.email, password: credentials.password });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (payload: GoogleAuthPayload) => {
    setIsLoading(true);
    try {
      const response = await apiLoginWithGoogle(payload);
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('medai_token', response.access_token);
      localStorage.setItem('medai_user', JSON.stringify(response.user));
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string) => {
    // Try Better Auth client first if available, fallback to api client
    try {
      if (authClient.emailOtp?.sendVerificationOtp) {
        authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' }).catch(() => {});
      }
    } catch {
      // ignore
    }
    return await sendLoginOtp(email);
  };

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      // Also notify Better Auth client if available
      try {
        if (authClient.signIn?.emailOtp) {
          authClient.signIn.emailOtp({ email, otp }).catch(() => {});
        }
      } catch {
        // ignore
      }
      const response = await verifyLoginOtp(email, otp);
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('medai_token', response.access_token);
      localStorage.setItem('medai_user', JSON.stringify(response.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    logoutUser().catch(() => {});
    authClient.signOut().catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('medai_token');
    localStorage.removeItem('medai_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        sendOtp,
        verifyOtp,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
