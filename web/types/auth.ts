/**
 * Authentication types
 */

// User subscription tiers
export type SubscriptionTier = "free" | "pro" | "enterprise";

/**
 * OAuth token response from backend
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Authenticated user information
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  generation_credits: number;
  is_verified: boolean;
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
  redirect_uri: string;
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
