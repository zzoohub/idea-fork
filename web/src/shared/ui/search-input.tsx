"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background pl-9 pr-9 py-2 text-sm min-h-11 sm:min-h-0 placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 hover:bg-accent min-h-[28px] min-w-[28px] flex items-center justify-center"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

interface MobileSearchToggleProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MobileSearchToggle({
  value,
  onChange,
  placeholder,
}: MobileSearchToggleProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full"
        aria-label="Open search"
      >
        <Search size={20} className="text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="absolute inset-x-0 top-0 z-50 flex h-14 items-center gap-2 bg-background px-4 border-b">
      <Search size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search..."}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <button
        type="button"
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full shrink-0"
        aria-label="Close search"
      >
        <X size={20} />
      </button>
    </div>
  );
}
