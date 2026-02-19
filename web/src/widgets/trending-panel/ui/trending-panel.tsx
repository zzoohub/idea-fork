"use client";

import { mockTrendingKeywords } from "@/shared/mocks/data";
import { PLATFORM_CONFIG } from "@/shared/config/constants";
import type { Platform } from "@/shared/types";

interface TrendingPanelProps {
  activeKeyword: string | null;
  onKeywordClick: (keyword: string | null) => void;
}

export function TrendingPanel({
  activeKeyword,
  onKeywordClick,
}: TrendingPanelProps) {
  const grouped = mockTrendingKeywords.reduce(
    (acc, item) => {
      if (!acc[item.platform]) acc[item.platform] = [];
      acc[item.platform].push(item.keyword);
      return acc;
    },
    {} as Record<Platform, string[]>
  );

  return (
    <aside className="sticky top-20" aria-label="Trending keywords">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Trending
      </h2>
      <div className="space-y-4">
        {(Object.entries(grouped) as [Platform, string[]][]).map(
          ([platform, keywords]) => (
            <div key={platform}>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                {PLATFORM_CONFIG[platform].name}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() =>
                      onKeywordClick(
                        activeKeyword === keyword ? null : keyword
                      )
                    }
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors min-h-[28px] ${
                      activeKeyword === keyword
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    #{keyword}
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
