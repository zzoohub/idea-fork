"use client";

import { type InputHTMLAttributes, type Ref } from "react";
import { Icon } from "./icon";

interface SearchInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  ref,
  placeholder = "Search...",
  className,
  ...props
}: SearchInputProps) {
  return (
    <div
      className={["relative flex items-center", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-space-md text-text-tertiary">
        <Icon name="search" size={18} />
      </div>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={[
          "w-full rounded-card border border-border bg-bg-secondary",
          "py-space-sm pl-[40px]",
          value ? "pr-[40px]" : "pr-space-md",
          "text-body text-text-primary placeholder:text-text-tertiary",
          "outline-none",
          "focus:border-border-active focus:ring-2 focus:ring-focus/25",
          "transition-[border-color,box-shadow]",
        ].join(" ")}
        style={{
          transitionDuration: "var(--duration-fast)",
          transitionTimingFunction: "var(--ease-out)",
        }}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className={[
            "absolute right-space-sm flex items-center justify-center",
            "w-[28px] h-[28px] rounded-full",
            "text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary",
            "transition-colors cursor-pointer",
          ].join(" ")}
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
          aria-label="Clear search"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
