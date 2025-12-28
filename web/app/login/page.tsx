"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { LogoIcon, GoogleIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";

/**
 * Loading spinner component
 */
function LoadingSpinner({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div
      className={`${className} animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent`}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Error message display component
 */
function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400"
    >
      {message}
    </div>
  );
}

/**
 * Google sign-in button component
 */
interface GoogleSignInButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

function GoogleSignInButton({ onClick, isLoading }: GoogleSignInButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      type="button"
      className="group flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-[var(--color-border)] bg-white px-5 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
          role="status"
          aria-label="Signing in"
        />
      ) : (
        <>
          <GoogleIcon />
          <span className="text-base font-bold tracking-[0.015em] text-gray-700">
            Sign in with Google
          </span>
        </>
      )}
    </button>
  );
}

/**
 * Background gradient effects
 */
function BackgroundGradients() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-[10%] -top-[20%] h-[60%] w-[60%] animate-pulse rounded-full bg-[var(--color-primary)] opacity-10 blur-[120px]" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[60%] w-[60%] rounded-full bg-[var(--color-primary)] opacity-5 blur-[100px]" />
    </div>
  );
}

/**
 * Login page header with logo
 */
function LoginHeader() {
  return (
    <header className="absolute left-0 top-0 z-20 flex w-full items-center gap-3 px-6 py-5 md:px-10">
      <LogoIcon className="h-8 w-8 text-[var(--color-primary)]" />
      <h2 className="text-xl font-bold text-white">Idea Fork</h2>
    </header>
  );
}

/**
 * Login page footer with legal links
 */
function LoginFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <p className="mt-8 text-center text-xs text-[var(--color-text-secondary)]">
      {currentYear} Idea Fork. All rights reserved.{" "}
      <br className="md:hidden" />
      <a
        href="/privacy"
        className="transition-colors hover:text-[var(--color-text-primary)]"
      >
        Privacy Policy
      </a>{" "}
      {" "}
      <a
        href="/terms"
        className="transition-colors hover:text-[var(--color-text-primary)]"
      >
        Terms of Service
      </a>
    </p>
  );
}

/**
 * Formats error message for display
 */
function formatErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}

/**
 * Login page with Google OAuth authentication
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLoginSuccess = useCallback(
    async (code: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const redirectUri = window.location.origin;
        await login(code, redirectUri);
        router.push("/");
      } catch (err) {
        setError(formatErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [login, router]
  );

  const handleLoginError = useCallback(() => {
    setError("Google login failed. Please try again.");
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: (response) => handleLoginSuccess(response.code),
    onError: handleLoginError,
    flow: "auth-code",
  });

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--color-background)]">
      <BackgroundGradients />
      <LoginHeader />

      {/* Login card */}
      <div className="relative z-10 my-10 w-full max-w-[440px] px-4">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl backdrop-blur-sm md:p-10">
          {/* Top gradient line */}
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50" />

          <div className="flex flex-col gap-6">
            {/* Title */}
            <div className="flex flex-col gap-2 pb-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Welcome back
              </h1>
              <p className="text-sm font-normal leading-normal text-[var(--color-text-secondary)] md:text-base">
                Log in to access your AI-generated PRDs and refinement tools.
              </p>
            </div>

            {/* Error message */}
            {error && <ErrorMessage message={error} />}

            {/* Google Sign In Button */}
            <GoogleSignInButton
              onClick={() => googleLogin()}
              isLoading={isSubmitting}
            />
          </div>
        </div>

        <LoginFooter />
      </div>
    </div>
  );
}
