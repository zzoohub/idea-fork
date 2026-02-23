"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Chip } from "@/src/shared/ui";

/* --------------------------------------------------------------------------
   FilterChipBar
   Horizontal scrollable chip row with icon support and overflow "+N" dropdown.
   -------------------------------------------------------------------------- */

interface FilterChipBarProps {
  tags: Array<{ label: string; value: string; icon?: string }>;
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  visibleCount?: number;
}

export function FilterChipBar({
  tags,
  activeTag,
  onTagChange,
  visibleCount = 6,
}: FilterChipBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tCommon = useTranslations("common");
  const tA11y = useTranslations("accessibility");

  const visibleTags = tags.slice(0, visibleCount);
  const overflowTags = tags.slice(visibleCount);
  const hasOverflow = overflowTags.length > 0;

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!overflowOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOverflowOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOverflowOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [overflowOpen]);

  const handleTagClick = useCallback(
    (tag: string | null) => {
      /* Tapping active chip deselects -> null (= All) */
      if (tag === activeTag) {
        onTagChange(null);
      } else {
        onTagChange(tag);
      }
      setOverflowOpen(false);
    },
    [activeTag, onTagChange],
  );

  /* Is a tag in the overflow set currently active? */
  const overflowHasActive =
    activeTag !== null &&
    overflowTags.some((t) => t.value === activeTag);

  return (
    <div
      className="relative"
      role="group"
      aria-label={tA11y("filterByCategory")}
    >
      {/* Scrollable chip row */}
      <div
        className={[
          "flex items-center gap-2",
          "overflow-x-auto",
          /* Hide scrollbar across browsers */
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {/* "All" chip - always first */}
        <Chip
          variant={activeTag === null ? "active" : "inactive"}
          aria-pressed={activeTag === null}
          onClick={() => handleTagClick(null)}
        >
          {tCommon("all")}
        </Chip>

        {/* Visible category tags */}
        {visibleTags.map((tag) => (
          <Chip
            key={tag.value}
            variant={activeTag === tag.value ? "active" : "inactive"}
            aria-pressed={activeTag === tag.value}
            icon={tag.icon}
            onClick={() => handleTagClick(tag.value)}
          >
            {tag.label}
          </Chip>
        ))}

        {/* Overflow "+N" trigger */}
        {hasOverflow && (
          <Chip
            ref={triggerRef}
            variant={overflowHasActive ? "active" : "inactive"}
            aria-expanded={overflowOpen}
            aria-haspopup="true"
            onClick={() => setOverflowOpen((prev) => !prev)}
          >
            +{overflowTags.length}
          </Chip>
        )}

      </div>

      {/* Overflow dropdown */}
      {hasOverflow && overflowOpen && (
        <div
          ref={dropdownRef}
          className={[
            "absolute right-0 top-full mt-1.5 z-50",
            "flex flex-wrap gap-1.5",
            "bg-white dark:bg-[#1b2531] border border-slate-200 dark:border-[#283039] rounded-xl",
            "p-3 shadow-lg",
            "min-w-[180px] max-w-[320px]",
          ].join(" ")}
          role="menu"
        >
          {overflowTags.map((tag) => (
            <Chip
              key={tag.value}
              variant={activeTag === tag.value ? "active" : "inactive"}
              aria-pressed={activeTag === tag.value}
              icon={tag.icon}
              onClick={() => handleTagClick(tag.value)}
              role="menuitem"
            >
              {tag.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
