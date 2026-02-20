"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Chip } from "@/src/shared/ui";
import { MaterialIcon } from "@/src/shared/ui";

/* --------------------------------------------------------------------------
   FilterChipBar
   Horizontal scrollable chip row with icon support, type filter divider,
   and overflow "+N" dropdown.
   -------------------------------------------------------------------------- */

interface FilterChipBarProps {
  tags: Array<{ label: string; icon?: string }>;
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  typeFilters?: Array<{ label: string; icon?: string; color?: string }>;
  visibleCount?: number;
}

export function FilterChipBar({
  tags,
  activeTag,
  onTagChange,
  typeFilters,
  visibleCount = 6,
}: FilterChipBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    overflowTags.some((t) => t.label === activeTag);

  return (
    <div
      className="relative"
      role="group"
      aria-label="Filter by category"
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
          All
        </Chip>

        {/* Visible category tags */}
        {visibleTags.map((tag) => (
          <Chip
            key={tag.label}
            variant={activeTag === tag.label ? "active" : "inactive"}
            aria-pressed={activeTag === tag.label}
            icon={tag.icon}
            onClick={() => handleTagClick(tag.label)}
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

        {/* Vertical divider between categories and type filters */}
        {typeFilters && typeFilters.length > 0 && (
          <div
            className="w-px h-6 bg-slate-300 dark:bg-[#283039] shrink-0 mx-1"
            aria-hidden="true"
          />
        )}

        {/* Type filter chips */}
        {typeFilters?.map((filter) => (
          <Chip
            key={filter.label}
            variant={activeTag === filter.label ? "active" : "inactive"}
            aria-pressed={activeTag === filter.label}
            onClick={() => handleTagClick(filter.label)}
          >
            {filter.icon && (
              <MaterialIcon
                name={filter.icon}
                size={16}
                className={filter.color}
              />
            )}
            {filter.label}
          </Chip>
        ))}
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
              key={tag.label}
              variant={activeTag === tag.label ? "active" : "inactive"}
              aria-pressed={activeTag === tag.label}
              icon={tag.icon}
              onClick={() => handleTagClick(tag.label)}
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
