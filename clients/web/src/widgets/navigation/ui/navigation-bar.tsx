"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/src/shared/i18n/navigation";
import { Icon } from "@/src/shared/ui";
import { SearchOverlay } from "@/src/features/search/ui/search-overlay";
import { gsap, useGSAP, useReducedMotion } from "@/src/shared/lib/gsap";

/* --------------------------------------------------------------------------
   Navigation items
   -------------------------------------------------------------------------- */
const NAV_ITEMS = [
  { labelKey: "feed", href: "/", icon: "house" },
  { labelKey: "briefs", href: "/briefs", icon: "sparkles" },
  { labelKey: "products", href: "/products", icon: "package" },
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const locale = useLocale();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const tNav = useTranslations("navigation");
  const tA11y = useTranslations("accessibility");
  const tSearch = useTranslations("search");
  const reducedMotion = useReducedMotion();
  const navLinkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const darkIconRef = useRef<HTMLSpanElement>(null);

  /* Sync desktop input with URL q param when on /search */
  useEffect(() => {
    if (pathname === "/search") {
      setSearchValue(searchParams.get("q") ?? "");
    } else {
      setSearchValue("");
    }
  }, [pathname, searchParams]);

  const handleSearchSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim().slice(0, 200);
      if (!trimmed) return;
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router],
  );

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const activeNavIndex = NAV_ITEMS.findIndex((item) => isActive(item.href));

  // Slide indicator to active nav link
  useGSAP(() => {
    const indicator = indicatorRef.current;
    const activeLink = navLinkRefs.current[activeNavIndex];
    if (!indicator || !activeLink) return;

    const parent = activeLink.parentElement;
    if (!parent) return;

    const linkRect = activeLink.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const left = linkRect.left - parentRect.left + 12; // px-3 = 12px padding
    const width = linkRect.width - 24; // minus both sides px-3

    if (reducedMotion) {
      gsap.set(indicator, { x: left, width, opacity: 1 });
    } else {
      gsap.to(indicator, { x: left, width, opacity: 1, duration: 0.25, ease: "power2.out" });
    }
  }, { dependencies: [activeNavIndex, reducedMotion] });

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
            aria-label={tA11y("homeLink")}
          >
            <span className="flex items-center justify-center size-8 rounded-lg bg-primary text-white">
              <Icon name="git-fork" size={20} />
            </span>
            <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              idea-fork
            </span>
          </Link>

          {/* Desktop nav links (hidden on mobile) */}
          <nav
            className="hidden md:flex items-center gap-1 relative"
            aria-label={tA11y("mainNavigation")}
          >
            {NAV_ITEMS.map((item, index) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  ref={(el) => { navLinkRefs.current[index] = el; }}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "relative px-3 py-1.5 text-[13px] leading-snug transition-colors duration-150",
                    active
                      ? "text-primary font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
                  ].join(" ")}
                >
                  {tNav(item.labelKey)}
                </Link>
              );
            })}
            {/* Persistent sliding indicator */}
            <span
              ref={indicatorRef}
              className="absolute bottom-0 left-0 h-[2px] bg-primary rounded-full"
              style={{ opacity: 0, width: 0 }}
              aria-hidden="true"
            />
          </nav>
        </div>

        {/* -- Right side: search, dark toggle, avatar -- */}
        <div className="flex items-center gap-2">
          {/* Desktop search input (hidden on mobile) */}
          <form
            role="search"
            className="hidden sm:flex items-center relative"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit(searchValue);
            }}
          >
            <Icon
              name="search"
              size={18}
              className="absolute left-2.5 text-slate-400 dark:text-slate-500 pointer-events-none"
            />
            <input
              type="search"
              placeholder={tSearch("placeholder")}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              maxLength={200}
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
              aria-label={tA11y("searchBriefsAndProducts")}
            />
          </form>

          {/* Mobile search trigger (visible only on mobile) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={[
              "flex sm:hidden items-center justify-center",
              "size-11 rounded-lg",
              "text-slate-500 dark:text-slate-400",
              "hover:bg-slate-100 dark:hover:bg-surface-dark",
              "transition-colors duration-150 cursor-pointer",
            ].join(" ")}
            aria-label={tA11y("openSearch")}
          >
            <Icon name="search" size={22} />
          </button>

          {/* Language toggle */}
          <button
            type="button"
            onClick={() => router.replace(pathname, { locale: locale === "en" ? "ko" : "en" })}
            className={[
              "flex items-center justify-center",
              "size-10 rounded-lg",
              "text-[13px] font-semibold",
              "text-slate-500 dark:text-slate-400",
              "hover:bg-slate-100 dark:hover:bg-surface-dark",
              "transition-colors duration-150 cursor-pointer",
            ].join(" ")}
            aria-label={locale === "en" ? tA11y("switchToKorean") : tA11y("switchToEnglish")}
          >
            {locale === "en" ? "한" : "EN"}
          </button>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={() => {
              toggleDark();
              if (!reducedMotion && darkIconRef.current) {
                gsap.fromTo(darkIconRef.current, { rotate: -90, scale: 0.5 }, { rotate: 0, scale: 1, duration: 0.35, ease: "back.out(2)" });
              }
            }}
            className={[
              "flex items-center justify-center",
              "size-10 rounded-lg",
              "text-slate-500 dark:text-slate-400",
              "hover:bg-slate-100 dark:hover:bg-surface-dark",
              "transition-colors duration-150 cursor-pointer",
            ].join(" ")}
            aria-label={isDark ? tA11y("switchToLightMode") : tA11y("switchToDarkMode")}
          >
            <span ref={darkIconRef} className="inline-flex">
              <Icon
                name={isDark ? "sun" : "moon"}
                size={20}
              />
            </span>
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
        aria-label={tA11y("mainNavigation")}
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
                  <Icon
                    name={item.icon}
                    size={22}
                    filled={active}
                  />
                  <span className="text-[11px] font-semibold leading-tight">
                    {tNav(item.labelKey)}
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
        onSubmit={handleSearchSubmit}
      />
    </>
  );
}
