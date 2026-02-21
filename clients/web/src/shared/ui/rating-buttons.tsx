"use client";

import { Icon } from "./icon";

type RatingValue = "up" | "down" | null;

interface RatingButtonsProps {
  value?: RatingValue;
  onChange?: (rating: RatingValue) => void;
  className?: string;
}

export function RatingButtons({
  value = null,
  onChange,
  className,
}: RatingButtonsProps) {
  return (
    <div
      className={["inline-flex items-center gap-space-xs", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label="Rate this content"
    >
      <button
        type="button"
        aria-label="Helpful"
        aria-pressed={value === "up"}
        onClick={
          onChange ? () => onChange(value === "up" ? null : "up") : undefined
        }
        className={[
          "inline-flex items-center justify-center",
          "min-w-[48px] min-h-[48px] rounded-card",
          "transition-colors cursor-pointer",
          value === "up"
            ? "bg-positive/15 text-positive"
            : "text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary",
        ].join(" ")}
        style={{
          transitionDuration: "var(--duration-fast)",
          transitionTimingFunction: "var(--ease-out)",
        }}
      >
        <Icon name="thumbs-up" size={20} />
      </button>
      <button
        type="button"
        aria-label="Not helpful"
        aria-pressed={value === "down"}
        onClick={
          onChange
            ? () => onChange(value === "down" ? null : "down")
            : undefined
        }
        className={[
          "inline-flex items-center justify-center",
          "min-w-[48px] min-h-[48px] rounded-card",
          "transition-colors cursor-pointer",
          value === "down"
            ? "bg-negative/15 text-negative"
            : "text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary",
        ].join(" ")}
        style={{
          transitionDuration: "var(--duration-fast)",
          transitionTimingFunction: "var(--ease-out)",
        }}
      >
        <Icon name="thumbs-down" size={20} />
      </button>
    </div>
  );
}
