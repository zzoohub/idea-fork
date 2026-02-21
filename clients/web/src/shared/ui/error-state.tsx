"use client";

import { Button } from "./button";
import { Icon } from "./icon";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center py-layout-lg text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="alert"
    >
      <div className="mb-space-md text-warning">
        <Icon name="warning" size={32} />
      </div>
      <p className="text-body text-text-secondary max-w-[320px]">{message}</p>
      {onRetry && (
        <div className="mt-space-lg">
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
