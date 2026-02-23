"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/src/shared/ui/icon";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";

interface ProductHeaderProps {
  name: string;
  iconUrl?: string;
  category: string;
  tagline?: string;
  description?: string;
  launchedAt?: string;
  websiteUrl?: string;
  className?: string;
}

export function ProductHeader({
  name,
  iconUrl,
  category,
  tagline,
  description,
  launchedAt,
  websiteUrl,
  className,
}: ProductHeaderProps) {
  const t = useTranslations("productHeader");

  return (
    <div
      className={[
        "flex flex-col sm:flex-row items-start gap-6",
        "p-6 rounded-2xl",
        "bg-white dark:bg-[#18212F]",
        "border border-slate-200 dark:border-[#283039]",
        "shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Product icon / letter avatar */}
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          width={96}
          height={96}
          className="size-24 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div
          className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-[#137fec]/10 text-4xl font-bold text-[#137fec]"
          aria-hidden="true"
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Center: name, status, description, metadata */}
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
          {name}
        </h1>

        {tagline && (
          <p className="text-base font-medium text-slate-600 dark:text-slate-300">
            {tagline}
          </p>
        )}

        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
            {description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Icon name="layout-grid" size={16} className="text-slate-400 dark:text-slate-500" />
            {category}
          </span>

          {launchedAt && (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Icon name="calendar" size={16} className="text-slate-400 dark:text-slate-500" />
              {t("launchedAt", { time: formatRelativeTime(launchedAt) })}
            </span>
          )}

          {websiteUrl && isSafeUrl(websiteUrl) && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#137fec] hover:text-[#0f6bca] transition-colors duration-150"
            >
              <Icon name="globe" size={16} />
              {new URL(websiteUrl).hostname.replace("www.", "")}
            </a>
          )}
        </div>
      </div>

      {/* Right: Share button */}
      <div className="shrink-0 self-center sm:self-start">
        <ShareButton />
      </div>
    </div>
  );
}

function ShareButton() {
  const t = useTranslations("productHeader");
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={[
        "inline-flex items-center gap-2",
        "px-5 py-2.5 rounded-xl",
        "text-sm font-semibold",
        "transition-colors duration-150",
        "cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137fec]",
        copied
          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
          : "bg-[#137fec] text-white shadow-lg shadow-[#137fec]/20 hover:bg-[#0f6bca] active:bg-[#0d5eaf]",
      ].join(" ")}
    >
      <Icon name={copied ? "check" : "link"} size={18} />
      {copied ? t("copied") : t("share")}
    </button>
  );
}
