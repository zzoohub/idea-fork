"use client";

import { GoogleOAuthProvider as GoogleProvider } from "@react-oauth/google";
import type { ReactNode } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleOAuthProviderProps {
  children: ReactNode;
}

/**
 * Google OAuth provider wrapper
 * Wraps the application with Google OAuth context for authentication
 */
export function GoogleOAuthProvider({ children }: GoogleOAuthProviderProps) {
  // In development, warn about missing client ID but don't block rendering
  if (!GOOGLE_CLIENT_ID) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[GoogleOAuthProvider] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. " +
          "Google authentication will not work."
      );
    }
    // Return children without provider - login will fail gracefully
    return <>{children}</>;
  }

  return <GoogleProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleProvider>;
}
