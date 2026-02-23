"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { SearchInput, Icon } from "@/src/shared/ui";

/* --------------------------------------------------------------------------
   SearchOverlay
   Mobile full-screen search overlay with auto-focused input.
   -------------------------------------------------------------------------- */

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit?: (value: string) => void;
}

export function SearchOverlay({
  isOpen,
  onClose,
  value,
  onChange,
  onClear,
  onSubmit,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const tSearch = useTranslations("search");
  const tA11y = useTranslations("accessibility");

  /* Auto-focus input on open, restore focus on close */
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      /* Delay focus to after transition starts */
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  /* Escape key closes */
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  /* Lock body scroll when open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tA11y("openSearch")}
      className={[
        "fixed inset-0 z-[100]",
        "bg-bg-primary",
        "flex flex-col",
        "transition-all",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-[8px] pointer-events-none",
      ].join(" ")}
      style={{
        transitionDuration: "var(--duration-normal)",
        transitionTimingFunction: "var(--ease-out)",
      }}
      /* Prevent underlying interaction when open */
      aria-hidden={!isOpen}
    >
      {/* Header: input + close button */}
      <form
        className="flex items-center gap-space-sm p-layout-xs"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && onSubmit) {
            onSubmit(value);
            onClose();
          }
        }}
      >
        <SearchInput
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tSearch("placeholder")}
          className="flex-1"
          aria-label={tA11y("searchBriefsAndProducts")}
        />
        <button
          type="button"
          onClick={onClose}
          className={[
            "flex items-center justify-center",
            "w-[44px] h-[44px] shrink-0",
            "rounded-card",
            "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary",
            "cursor-pointer transition-colors",
          ].join(" ")}
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
          aria-label={tA11y("closeSearch")}
        >
          <Icon name="close" size={20} />
        </button>
      </form>

      {/* Body: future search results would render here */}
      <div className="flex-1 px-layout-xs pt-space-lg">
        {value.length === 0 && (
          <p className="text-body-sm text-text-tertiary text-center mt-space-xl">
            {tSearch("helpText")}
          </p>
        )}
      </div>
    </div>
  );
}
