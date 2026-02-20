"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/src/shared/ui";
import { SearchOverlay } from "@/src/features/search/ui/search-overlay";

/* --------------------------------------------------------------------------
   Navigation items
   -------------------------------------------------------------------------- */
const NAV_ITEMS = [
  { label: "Feed", href: "/", icon: "home" },
  { label: "Briefs", href: "/briefs", icon: "auto_awesome" },
  { label: "Products", href: "/products", icon: "inventory_2" },
] as const;

/* --------------------------------------------------------------------------
   useDarkMode
   Reads and toggles .dark class on <html>. Persists to localStorage.
   -------------------------------------------------------------------------- */
function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
  }, []);

  const toggle = useCallback(() => {
    const html = document.documentElement;
    const next = !html.classList.contains("dark");
    html.classList.toggle("dark", next);
    html.classList.toggle("light", !next);
    setIsDark(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  return { isDark, toggle };
}

/* --------------------------------------------------------------------------
   NavigationBar
   Responsive global navigation:
   - Desktop (>=768 px): sticky top bar with logo, links, search, dark toggle, avatar
   - Mobile  (<768 px): sticky top bar with logo + icons, fixed bottom tab bar
   -------------------------------------------------------------------------- */
export function NavigationBar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { isDark, toggle: toggleDark } = useDarkMode();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ----------------------------------------------------------------
          Top bar — shared across breakpoints, items hide/show via sm:
          ---------------------------------------------------------------- */}
      <header
        className={[
          "sticky top-0 z-50",
          "flex items-center justify-between",
          "h-14 px-4 sm:px-6",
          "bg-white/95 dark:bg-[#111418]/95 backdrop-blur-md",
          "border-b border-slate-200 dark:border-[#283039]",
        ].join(" ")}
      >
        {/* -- Left side: Logo + desktop nav links -- */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0"
            aria-label="idea-fork home"
          >
            <span className="flex items-center justify-center size-8 rounded-lg bg-primary text-white">
              <MaterialIcon name="fork_right" size={20} />
            </span>
            <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              idea-fork
            </span>
          </Link>

          {/* Desktop nav links (hidden on mobile) */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "relative px-3 py-1.5 text-[13px] leading-snug transition-colors duration-150",
                    active
                      ? "text-primary font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
                  ].join(" ")}
                >
                  {item.label}
                  {/* Active indicator: bottom border */}
                  {active && (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* -- Right side: search, dark toggle, avatar -- */}
        <div className="flex items-center gap-2">
          {/* Desktop search input (hidden on mobile) */}
          <div className="hidden sm:flex items-center relative">
            <MaterialIcon
              name="search"
              size={18}
              className="absolute left-2.5 text-slate-400 dark:text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search for pain points..."
              className={[
                "w-56 lg:w-64 h-9 pl-9 pr-3",
                "rounded-lg",
                "bg-slate-100 dark:bg-surface-dark",
                "text-[13px] text-slate-900 dark:text-slate-100",
                "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                "border border-transparent",
                "focus:border-primary focus:ring-1 focus:ring-primary/30",
                "outline-none transition-all duration-150",
              ].join(" ")}
              aria-label="Search for pain points"
            />
          </div>

          {/* Mobile search trigger (visible only on mobile) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={[
              "flex sm:hidden items-center justify-center",
              "size-10 rounded-lg",
              "text-slate-500 dark:text-slate-400",
              "hover:bg-slate-100 dark:hover:bg-surface-dark",
              "transition-colors duration-150 cursor-pointer",
            ].join(" ")}
            aria-label="Open search"
          >
            <MaterialIcon name="search" size={22} />
          </button>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggleDark}
            className={[
              "flex items-center justify-center",
              "size-10 rounded-lg",
              "text-slate-500 dark:text-slate-400",
              "hover:bg-slate-100 dark:hover:bg-surface-dark",
              "transition-colors duration-150 cursor-pointer",
            ].join(" ")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <MaterialIcon
              name={isDark ? "light_mode" : "dark_mode"}
              size={20}
            />
          </button>

          {/* User avatar (hidden on mobile) */}
          <button
            type="button"
            className={[
              "hidden sm:flex items-center justify-center",
              "size-8 rounded-full",
              "bg-primary/10 text-primary",
              "hover:bg-primary/20",
              "transition-colors duration-150 cursor-pointer",
            ].join(" ")}
            aria-label="User menu"
          >
            <MaterialIcon name="person" size={18} />
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------
          Mobile bottom tab bar (hidden on desktop)
          ---------------------------------------------------------------- */}
      <nav
        className={[
          "flex md:hidden",
          "fixed bottom-0 left-0 right-0 z-50",
          "h-14",
          "bg-white/95 dark:bg-[#111418]/95 backdrop-blur-md",
          "border-t border-slate-200 dark:border-[#283039]",
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
                    "flex flex-col items-center justify-center gap-0.5",
                    "h-full py-1.5",
                    "transition-colors duration-150",
                    active
                      ? "text-primary"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300",
                  ].join(" ")}
                >
                  <MaterialIcon
                    name={item.icon}
                    size={22}
                    filled={active}
                  />
                  <span className="text-[11px] font-semibold leading-tight">
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
