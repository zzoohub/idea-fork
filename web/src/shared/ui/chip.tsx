"use client";

import { type ButtonHTMLAttributes, type HTMLAttributes, type Ref } from "react";

const VARIANT_CLASSES = {
  active: "bg-interactive text-white border border-transparent",
  inactive: "bg-transparent text-text-secondary border border-border",
} as const;

type ChipBaseProps = {
  variant?: keyof typeof VARIANT_CLASSES;
  interactive?: boolean;
  ref?: Ref<HTMLButtonElement | HTMLSpanElement>;
  className?: string;
  children: React.ReactNode;
};

type InteractiveChipProps = ChipBaseProps & {
  interactive?: true;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ChipBaseProps>;

type StaticChipProps = ChipBaseProps & {
  interactive: false;
} & Omit<HTMLAttributes<HTMLSpanElement>, keyof ChipBaseProps>;

type ChipProps = InteractiveChipProps | StaticChipProps;

export function Chip({
  variant = "inactive",
  interactive = true,
  ref,
  className,
  children,
  ...props
}: ChipProps) {
  const sharedClasses = [
    "inline-flex items-center justify-center",
    "min-h-[32px] px-space-md",
    "rounded-full",
    "text-body-sm font-semibold",
    "transition-colors",
    VARIANT_CLASSES[variant],
    interactive && variant === "inactive" && "hover:bg-bg-tertiary",
    interactive && variant === "active" && "hover:bg-interactive-hover",
    interactive && "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const transitionStyle = {
    transitionDuration: "var(--duration-fast)",
    transitionTimingFunction: "var(--ease-out)",
  };

  if (!interactive) {
    return (
      <span
        ref={ref as Ref<HTMLSpanElement>}
        className={sharedClasses}
        style={transitionStyle}
        {...(props as HTMLAttributes<HTMLSpanElement>)}
      >
        {children}
      </span>
    );
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      className={sharedClasses}
      style={transitionStyle}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
