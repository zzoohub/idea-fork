"use client";

import { Lock } from "lucide-react";
import { Button } from "@/shared/ui/button";
import Link from "next/link";

interface BlurredOverlayProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}

export function BlurredOverlay({
  children,
  title = "Upgrade to Pro",
  description = "Get full access to all analysis and insights.",
  ctaLabel = "Upgrade to Pro — $9/mo",
  ctaHref = "/pricing",
  onCtaClick,
}: BlurredOverlayProps) {
  return (
    <div className="relative">
      <div className="select-none blur-sm pointer-events-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
        <div className="flex flex-col items-center gap-3 max-w-xs text-center p-6">
          <div className="rounded-full bg-muted p-3">
            <Lock size={20} className="text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {onCtaClick ? (
            <Button onClick={onCtaClick} className="mt-2">
              {ctaLabel}
            </Button>
          ) : (
            <Button asChild className="mt-2">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
