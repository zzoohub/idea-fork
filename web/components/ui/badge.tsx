import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
        teal:
          "bg-[var(--color-badge-teal-bg)] text-[var(--color-badge-teal)]",
        orange:
          "bg-[var(--color-badge-orange-bg)] text-[var(--color-badge-orange)]",
        indigo:
          "bg-[var(--color-badge-indigo-bg)] text-[var(--color-badge-indigo)]",
        secondary:
          "bg-[var(--color-input)] text-[var(--color-text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

/**
 * Badge color variants matching the design system
 */
export type BadgeVariant = "primary" | "teal" | "orange" | "indigo" | "secondary";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
