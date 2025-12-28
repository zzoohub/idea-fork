/**
 * Authentication types
 */

// User subscription tiers
export type SubscriptionTier = "free" | "pro" | "enterprise";

/**
 * OAuth token response from backend
 */
export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * Authenticated user information
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
  generationCredits: number;
  isVerified: boolean;
}

/**
 * Response from Google OAuth authentication endpoint
 */
export interface AuthResponse {
  token: TokenResponse;
  user: AuthUser;
}

/**
 * Google OAuth login request payload
 */
export interface GoogleAuthRequest {
  code: string;
  redirectUri: string;
}

/**
 * Auth context state and actions
 */
export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (code: string, redirectUri: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export type AuthContextType = AuthState & AuthActions;
