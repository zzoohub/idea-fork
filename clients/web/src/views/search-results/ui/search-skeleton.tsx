"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/src/shared/i18n/navigation";
import { Skeleton } from "@/src/shared/ui";

/* --------------------------------------------------------------------------
   No results state
   -------------------------------------------------------------------------- */

export function NoResults({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-layout-lg text-center">
      <p className="text-body text-text-secondary">
        {t("empty.message", { query })}
      </p>
      <p className="mt-space-sm text-body-sm text-text-tertiary max-w-[320px]">
        {t("empty.suggestion")}
      </p>
      <div className="mt-space-lg flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2 text-sm font-medium rounded-lg text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {tCommon("clearSearch")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/briefs")}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("empty.browseBriefs")}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading skeleton
   -------------------------------------------------------------------------- */

export function SearchSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-20 md:pb-10"
      aria-busy="true"
      aria-label="Loading search results"
    >
      {/* Header skeleton */}
      <div className="flex items-baseline justify-between">
        <Skeleton variant="text" className="h-8 w-64" />
        <Skeleton variant="text" className="h-4 w-20" />
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-[#283039]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-3 pb-2.5 pt-1">
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Section: Briefs skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" className="h-6 w-16" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-72" />
          ))}
        </div>
      </div>

      {/* Section: Products skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" className="h-6 w-20" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-72" />
          ))}
        </div>
      </div>

      {/* Section: Posts skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton variant="text" className="h-6 w-14" />
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-36" />
          ))}
        </div>
      </div>
    </div>
  );
}
