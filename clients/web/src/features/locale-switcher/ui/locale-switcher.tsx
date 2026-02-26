"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "next-intl";
import { useRouter, usePathname } from "@/src/shared/i18n/navigation";
import { routing } from "@/src/shared/i18n/routing";
import { Icon } from "@/src/shared/ui";

const LOCALE_META: Record<string, { label: string; flag: string }> = {
  en: { label: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  es: { label: "Espanol", flag: "\u{1F1EA}\u{1F1F8}" },
  "pt-BR": { label: "Portugues", flag: "\u{1F1E7}\u{1F1F7}" },
  id: { label: "Bahasa", flag: "\u{1F1EE}\u{1F1E9}" },
  ja: { label: "日本語", flag: "\u{1F1EF}\u{1F1F5}" },
  ko: { label: "한국어", flag: "\u{1F1F0}\u{1F1F7}" },
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const tA11y = useTranslations("accessibility");

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const handleSelect = useCallback(
    (nextLocale: Locale) => {
      router.replace(pathname, { locale: nextLocale });
      setOpen(false);
    },
    [router, pathname],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  // Focus first item when opening
  useEffect(() => {
    if (open && menuRef.current) {
      const first = menuRef.current.querySelector<HTMLButtonElement>(
        "[role=menuitem]",
      );
      first?.focus();
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={tA11y("switchLanguage")}
        className={[
          "flex items-center justify-center gap-1",
          "h-10 px-2 rounded-lg",
          "text-[13px] font-semibold",
          "text-slate-500 dark:text-slate-400",
          "hover:bg-slate-100 dark:hover:bg-surface-dark",
          "transition-colors duration-150 cursor-pointer",
        ].join(" ")}
      >
        <span className="text-base leading-none" aria-hidden="true">{LOCALE_META[locale]?.flag}</span>
        <span>{LOCALE_META[locale]?.label ?? locale}</span>
        <Icon name="chevron-down" size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <ul
          ref={menuRef}
          role="menu"
          className={[
            "absolute right-0 top-full mt-1 z-50",
            "min-w-[140px] py-1",
            "rounded-lg border",
            "bg-white dark:bg-[#1a1f25]",
            "border-slate-200 dark:border-[#283039]",
            "shadow-lg",
          ].join(" ")}
        >
          {routing.locales.map((loc) => (
            <li key={loc} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSelect(loc)}
                className={[
                  "flex items-center gap-2 w-full px-3 py-2",
                  "text-[13px] text-left",
                  "transition-colors duration-100",
                  loc === locale
                    ? "text-primary font-semibold bg-primary/5"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#283039]",
                  "cursor-pointer",
                ].join(" ")}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {LOCALE_META[loc]?.flag}
                </span>
                <span>{LOCALE_META[loc]?.label ?? loc}</span>
                {loc === locale && (
                  <Icon name="check" size={14} className="ml-auto text-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
