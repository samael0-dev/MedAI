import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, LoginCredentials, RegisterCredentials } from '../types';
import { loginUser, registerUser, fetchCurrentUser, logoutUser } from '../api/client';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

const DEFAULT_DEMO_USER: AuthUser = {
  id: 1,
  email: 'alan.mitchell@medai-hospital.org',
  full_name: 'Dr. Alan Mitchell',
  role: 'radiologist',
  department: 'Chief Radiologist',
  is_active: true,
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('medai_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem('medai_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return DEFAULT_DEMO_USER;
      }
    }
    return DEFAULT_DEMO_USER;
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
          // Token expired or server restarted; retain cached demo user
          console.info('[Auth] Using cached session');
        }
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
    } catch (err) {
      throw err;
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
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    logoutUser().catch(() => {});
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
