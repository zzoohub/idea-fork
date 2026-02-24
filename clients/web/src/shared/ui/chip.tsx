"use client";

import { type ButtonHTMLAttributes, type HTMLAttributes, type Ref, useCallback } from "react";
import { Icon } from "./icon";
import { gsap, useReducedMotion, PRESET } from "@/src/shared/lib/gsap";

const VARIANT_CLASSES = {
  active:
    "bg-primary text-white shadow-lg shadow-primary/20 border border-transparent",
  inactive:
    "bg-white dark:bg-[#1b2531] border border-slate-200 dark:border-[#283039] text-text-secondary",
} as const;

type ChipBaseProps = {
  variant?: keyof typeof VARIANT_CLASSES;
  interactive?: boolean;
  icon?: string;
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
  icon,
  ref,
  className,
  children,
  ...props
}: ChipProps) {
  const sharedClasses = [
    "inline-flex items-center justify-center gap-1.5",
    "h-9 px-3.5",
    "rounded-full whitespace-nowrap",
    "text-body-sm font-semibold",
    "transition-colors",
    VARIANT_CLASSES[variant],
    interactive && variant === "inactive" && "hover:bg-slate-100 dark:hover:bg-[#232b36]",
    interactive && variant === "active" && "hover:bg-interactive-hover",
    interactive && "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && (
        <Icon name={icon} size={16} aria-hidden />
      )}
      {children}
    </>
  );

  const reducedMotion = useReducedMotion();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!reducedMotion) {
        gsap.fromTo(e.currentTarget, ...PRESET.scalePop.keyframes);
      }
      const onClick = (props as ButtonHTMLAttributes<HTMLButtonElement>).onClick;
      onClick?.(e);
    },
    [reducedMotion, props],
  );

  if (!interactive) {
    return (
      <span
        ref={ref as Ref<HTMLSpanElement>}
        className={sharedClasses}
        {...(props as HTMLAttributes<HTMLSpanElement>)}
      >
        {content}
      </span>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onClick: _onClick, ...buttonProps } = props as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      className={sharedClasses}
      onClick={handleClick}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
