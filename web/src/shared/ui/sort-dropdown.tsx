"use client";

import { Icon } from "./icon";

interface SortOption {
  label: string;
  value: string;
}

interface SortDropdownProps {
  options: SortOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SortDropdown({
  options,
  value,
  onChange,
  className = "",
}: SortDropdownProps) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Icon
        name="arrow-up-down"
        size={16}
        className="pointer-events-none absolute left-3 text-text-secondary"
      />
      <select
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={[
          "appearance-none rounded-lg",
          "border border-slate-200 dark:border-[#283039]",
          "bg-white dark:bg-[#283039]",
          "py-2 pl-9 pr-8",
          "text-body-sm text-text-primary",
          "transition-colors cursor-pointer",
          "hover:border-border-active",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        ].join(" ")}
        aria-label="Sort by"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute right-2 text-text-secondary"
      />
    </div>
  );
}
