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
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary">
        <Icon name="search" size={18} />
      </div>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={[
          "w-full rounded-xl",
          "border border-transparent bg-slate-100 dark:bg-[#1b2531]",
          "py-2.5 pl-10",
          value ? "pr-10" : "pr-4",
          "text-body text-text-primary placeholder:text-text-tertiary",
          "outline-none",
          "focus:border-primary focus:ring-2 focus:ring-primary/25",
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
            "absolute right-2 flex items-center justify-center",
            "h-7 w-7 rounded-full",
            "text-text-tertiary hover:text-text-secondary hover:bg-slate-200 dark:hover:bg-[#232b36]",
            "transition-colors cursor-pointer",
          ].join(" ")}
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
          aria-label="Clear search"
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
