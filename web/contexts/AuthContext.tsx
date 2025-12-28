"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import type {
  AuthContextType,
  AuthResponse,
  AuthUser,
  GoogleAuthRequest,
} from "@/types/auth";

const ACCESS_TOKEN_KEY = "access_token";

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Storage utilities for token management
 */
const tokenStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  set: (token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  remove: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenStorage.get();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await api.get<AuthUser>("/auth/me");
        setUser(userData);
      } catch (err) {
        // Only clear token on auth errors, not network errors
        if (err instanceof ApiError && err.isUnauthorized) {
          tokenStorage.remove();
        }
        // Silently fail - user will be redirected to login if needed
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (code: string, redirectUri: string) => {
    setError(null);

    const payload: GoogleAuthRequest = { code, redirectUri };
    const response = await api.post<AuthResponse>("/auth/google", payload, {
      skipAuth: true,
    });

    tokenStorage.set(response.token.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.remove();
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      error,
      login,
      logout,
      clearError,
    }),
    [user, isLoading, error, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
