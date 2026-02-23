"use client";

import { useTranslations } from "next-intl";
import { Button } from "./button";
import { Icon } from "./icon";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const t = useTranslations("errorState");
  const tCommon = useTranslations("common");

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
      <p className="text-body text-text-secondary max-w-[320px]">
        {message ?? t("default")}
      </p>
      {onRetry && (
        <div className="mt-space-lg">
          <Button variant="ghost" onClick={onRetry}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      )}
    </div>
  );
}
