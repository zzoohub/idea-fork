"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { SearchInput, Icon } from "@/src/shared/ui";
import { gsap, useReducedMotion, DURATION, EASE } from "@/src/shared/lib/gsap";

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
  const overlayRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const reducedMotion = useReducedMotion();
  const tSearch = useTranslations("search");
  const tA11y = useTranslations("accessibility");

  /* GSAP open/close animation */
  useEffect(() => {
    const overlay = overlayRef.current;
    const form = formRef.current;
    if (!overlay) return;

    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      if (reducedMotion) {
        gsap.set(overlay, { opacity: 1, y: 0 });
      } else {
        const tl = gsap.timeline();
        tl.fromTo(
          overlay,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: DURATION.normal, ease: EASE.out },
        );
        if (form) {
          tl.fromTo(
            form,
            { opacity: 0, y: -10 },
            { opacity: 1, y: 0, duration: DURATION.fast, ease: EASE.out },
            "-=0.1",
          );
        }
      }

      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      if (reducedMotion) {
        gsap.set(overlay, { opacity: 0, y: 8 });
      } else {
        gsap.to(overlay, {
          opacity: 0, y: 8,
          duration: DURATION.fast, ease: EASE.out,
        });
      }

      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen, reducedMotion]);

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
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={tA11y("searchDialog")}
      className="fixed inset-0 z-[100] bg-bg-primary flex flex-col"
      style={{ opacity: isOpen ? undefined : 0, transform: isOpen ? undefined : "translateY(8px)", pointerEvents: isOpen ? "auto" : "none" }}
      aria-hidden={!isOpen}
    >
      {/* Header: input + close button */}
      <form
        ref={formRef}
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
