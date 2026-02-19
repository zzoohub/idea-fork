"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3"
      role="alert"
    >
      <AlertTriangle size={16} className="text-destructive shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="shrink-0 min-h-[36px]"
        >
          <RefreshCw size={14} />
          Retry
        </Button>
      )}
    </div>
  );
}
