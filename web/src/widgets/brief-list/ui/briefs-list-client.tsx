"use client";

import { useState, useMemo } from "react";
import type { BriefSortMode } from "@/shared/types";
import { mockBriefs } from "@/shared/mocks/data";
import { BriefCard } from "@/entities/brief";
import { SortDropdown } from "@/shared/ui/sort-dropdown";

const SORT_OPTIONS: { value: BriefSortMode; label: string }[] = [
  { value: "evidence", label: "Most Evidence" },
  { value: "recent", label: "Recent" },
  { value: "trending", label: "Trending" },
];

export function BriefsListClient() {
  const [sortMode, setSortMode] = useState<BriefSortMode>("evidence");

  const sortedBriefs = useMemo(() => {
    const briefs = [...mockBriefs];
    if (sortMode === "evidence") {
      briefs.sort((a, b) => b.postCount - a.postCount);
    }
    return briefs;
  }, [sortMode]);

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Briefs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Synthesized product opportunities from real user complaints.
            </p>
          </div>
          <SortDropdown
            options={SORT_OPTIONS}
            value={sortMode}
            onChange={setSortMode}
            className="shrink-0"
          />
        </div>
      </div>

      {/* Brief cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedBriefs.map((brief) => (
          <BriefCard key={brief.id} brief={brief} />
        ))}
      </div>
    </>
  );
}
