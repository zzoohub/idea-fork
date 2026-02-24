"use client";

import { Button } from "./button";
import { useStaggerReveal } from "@/src/shared/lib/gsap";

interface EmptyStateProps {
  message: string;
  suggestion?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  message,
  suggestion,
  action,
  className,
}: EmptyStateProps) {
  const containerRef = useStaggerReveal({ stagger: 0.1 });

  return (
    <div
      ref={containerRef}
      className={[
        "flex flex-col items-center justify-center py-layout-lg text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-body text-text-secondary">{message}</p>
      {suggestion && (
        <p className="mt-space-sm text-body-sm text-text-tertiary max-w-[320px]">
          {suggestion}
        </p>
      )}
      {action && (
        <div className="mt-space-lg">
          <Button variant="ghost" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
