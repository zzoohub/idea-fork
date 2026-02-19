"use client";

import { useUser } from "@/entities/user";
import { BlurredOverlay } from "@/shared/ui/blurred-overlay";

interface BriefSectionProps {
  title: string;
  children: React.ReactNode;
  requiresPro?: boolean;
}

export function BriefSection({
  title,
  children,
  requiresPro = false,
}: BriefSectionProps) {
  const { tier } = useUser();
  const isLocked = requiresPro && tier !== "pro";

  const content = (
    <section className="rounded-lg border p-4 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        {title}
      </h2>
      {children}
    </section>
  );

  if (isLocked) {
    return (
      <BlurredOverlay
        title="Upgrade to Pro"
        description="See the full analysis including source evidence, competitive landscape, and opportunity assessment."
        ctaLabel="Upgrade to Pro — $9/mo"
        ctaHref="/pricing"
      >
        {content}
      </BlurredOverlay>
    );
  }

  return content;
}
