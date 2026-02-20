"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/src/shared/ui";
import { SearchOverlay } from "@/src/features/search/ui/search-overlay";

/* --------------------------------------------------------------------------
   Navigation items
   -------------------------------------------------------------------------- */
const NAV_ITEMS = [
  { label: "Feed", href: "/", icon: "tag" },
  { label: "Briefs", href: "/briefs", icon: "trending" },
  { label: "Products", href: "/products", icon: "sort" },
] as const;

/* --------------------------------------------------------------------------
   NavigationBar
   Responsive global navigation:
   - Desktop (>=768px): horizontal top bar with logo + links
   - Mobile (<768px): top bar with logo + search, fixed bottom tab bar
   -------------------------------------------------------------------------- */
export function NavigationBar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ----------------------------------------------------------------
          Desktop top bar (hidden on mobile)
          ---------------------------------------------------------------- */}
      <header
        className={[
          "hidden md:flex",
          "fixed top-0 left-0 right-0 z-50",
          "items-center justify-between",
          "h-[56px] px-layout-xs",
          "bg-bg-secondary/80 backdrop-blur-md",
          "border-b border-border",
        ].join(" ")}
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-h3 font-bold text-text-primary hover:text-interactive transition-colors"
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
          aria-label="idea-fork home"
        >
          idea-fork
        </Link>

        {/* Desktop nav links */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-space-xl" role="list">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "relative inline-flex items-center",
                      "py-space-sm text-body-sm transition-colors",
                      active
                        ? "text-text-primary font-semibold"
                        : "text-text-secondary hover:text-text-primary",
                    ].join(" ")}
                    style={{
                      transitionDuration: "var(--duration-fast)",
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                  >
                    {item.label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-interactive rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* ----------------------------------------------------------------
          Mobile top bar (hidden on desktop)
          ---------------------------------------------------------------- */}
      <header
        className={[
          "flex md:hidden",
          "sticky top-0 z-50",
          "items-center justify-between",
          "h-[48px] px-layout-xs",
          "bg-bg-secondary/80 backdrop-blur-md",
          "border-b border-border",
        ].join(" ")}
      >
        {/* Logo */}
        <Link
          href="/"
          className="text-h3 font-bold text-text-primary"
          aria-label="idea-fork home"
        >
          idea-fork
        </Link>

        {/* Search trigger */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={[
            "flex items-center justify-center",
            "w-[44px] h-[44px]",
            "text-text-secondary hover:text-text-primary",
            "cursor-pointer transition-colors",
          ].join(" ")}
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
          aria-label="Open search"
        >
          <Icon name="search" size={22} />
        </button>
      </header>

      {/* ----------------------------------------------------------------
          Mobile bottom tab bar (hidden on desktop)
          ---------------------------------------------------------------- */}
      <nav
        className={[
          "flex md:hidden",
          "fixed bottom-0 left-0 right-0 z-50",
          "h-[56px]",
          "bg-bg-secondary/80 backdrop-blur-md",
          "border-t border-border",
          /* Safe area for notched devices */
          "pb-[env(safe-area-inset-bottom)]",
        ].join(" ")}
        aria-label="Main navigation"
      >
        <ul className="flex items-center justify-around w-full" role="list">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex flex-col items-center justify-center gap-[2px]",
                    "h-full py-space-xs",
                    "transition-colors",
                    active
                      ? "text-interactive"
                      : "text-text-tertiary hover:text-text-secondary",
                  ].join(" ")}
                  style={{
                    transitionDuration: "var(--duration-fast)",
                    transitionTimingFunction: "var(--ease-out)",
                  }}
                >
                  <Icon name={item.icon} size={24} />
                  <span className="text-caption font-semibold">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ----------------------------------------------------------------
          Search overlay (mobile)
          ---------------------------------------------------------------- */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        value={searchValue}
        onChange={setSearchValue}
        onClear={() => setSearchValue("")}
      />
    </>
  );
}
