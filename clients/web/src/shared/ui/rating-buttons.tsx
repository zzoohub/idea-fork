"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "./icon";
import { gsap, useReducedMotion, PRESET } from "@/src/shared/lib/gsap";

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
  const tA11y = useTranslations("accessibility");
  const reducedMotion = useReducedMotion();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, rating: RatingValue) => {
      if (!reducedMotion) {
        gsap.fromTo(e.currentTarget, ...PRESET.scalePress.keyframes);
      }
      onChange?.(value === rating ? null : rating);
    },
    [reducedMotion, onChange, value],
  );

  return (
    <div
      className={["inline-flex items-center gap-space-xs", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={tA11y("rateContent")}
    >
      <button
        type="button"
        aria-label={tA11y("helpful")}
        aria-pressed={value === "up"}
        onClick={(e) => handleClick(e, "up")}
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
        aria-label={tA11y("notHelpful")}
        aria-pressed={value === "down"}
        onClick={(e) => handleClick(e, "down")}
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
