"use client";

import { cn } from "@/shared/lib/utils";

interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortDropdownProps<T extends string> {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SortDropdown<T extends string>({
  options,
  value,
  onChange,
  className,
}: SortDropdownProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        "rounded-md border bg-background px-3 py-1.5 text-sm min-h-11 sm:min-h-0",
        className
      )}
      aria-label="Sort by"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
