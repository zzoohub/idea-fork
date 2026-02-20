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
        name="sort"
        size={16}
        className="pointer-events-none absolute left-space-md text-text-secondary"
      />
      <select
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={[
          "appearance-none rounded-card border border-border bg-bg-secondary py-space-sm pl-[36px] pr-[32px]",
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
        size={14}
        className="pointer-events-none absolute right-space-md text-text-secondary"
      />
    </div>
  );
}
