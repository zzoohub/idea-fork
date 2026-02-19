"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mockBriefs, mockCycles } from "@/shared/mocks/data";
import { BriefCard } from "@/entities/brief";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";

export function BriefsListClient() {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [briefs, setBriefs] = useState(mockBriefs);
  const cycle = mockCycles[cycleIndex];

  const handleBookmarkToggle = useCallback((briefId: string) => {
    setBriefs((prev) =>
      prev.map((b) =>
        b.id === briefId ? { ...b, isBookmarked: !b.isBookmarked } : b
      )
    );
    toast("Bookmark updated");
  }, []);

  const sortedBriefs = [...briefs].sort(
    (a, b) => b.opportunityScore - a.opportunityScore
  );

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Briefs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-generated opportunity assessments from clustered user needs
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCycleIndex((i) => Math.min(i + 1, mockCycles.length - 1))
              }
              disabled={cycleIndex >= mockCycles.length - 1}
              aria-label="Previous cycle"
              className="h-9 w-9"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {new Date(cycle.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCycleIndex((i) => Math.max(i - 1, 0))}
              disabled={cycleIndex <= 0}
              aria-label="Next cycle"
              className="h-9 w-9"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Brief cards */}
      <div className="space-y-3">
        {sortedBriefs.map((brief) => (
          <BriefCard
            key={brief.id}
            brief={brief}
            onBookmarkToggle={handleBookmarkToggle}
          />
        ))}
      </div>
    </>
  );
}
