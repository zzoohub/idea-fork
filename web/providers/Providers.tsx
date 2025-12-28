"use client";

import type { ReactNode } from "react";
import { GoogleOAuthProvider } from "./GoogleOAuthProvider";
import { AuthProvider } from "@/contexts/AuthContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GoogleOAuthProvider>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
}
