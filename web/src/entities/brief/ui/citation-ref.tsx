"use client";

import { useState } from "react";
import { SourceSnippet } from "@/src/shared/ui/source-snippet";

interface Citation {
  source: string;
  sourceName: string;
  date: string;
  snippet: string;
  originalUrl: string;
}

interface CitationRefProps {
  number: number;
  citation: Citation;
}

export function CitationRef({ number, citation }: CitationRefProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <span className="inline">
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`Citation ${number}: ${citation.sourceName}`}
        onClick={() => setExpanded((prev) => !prev)}
        className="relative inline-flex cursor-pointer items-center justify-center align-super"
        style={{
          /* 44x44 tap target around small visual */
          minWidth: 44,
          minHeight: 44,
          margin: "-12px -8px",
          padding: "12px 8px",
        }}
      >
        <span className="text-caption font-semibold text-interactive hover:text-interactive-hover transition-colors">
          [{number}]
        </span>
      </button>

      {expanded && (
        <span
          className="block overflow-hidden"
          style={{
            animation: `citationExpand var(--duration-normal) var(--ease-out) forwards`,
          }}
        >
          <span className="block pt-space-sm pb-space-xs">
            <SourceSnippet
              source={citation.source}
              sourceName={citation.sourceName}
              date={citation.date}
              snippet={citation.snippet}
              originalUrl={citation.originalUrl}
            />
          </span>
        </span>
      )}
    </span>
  );
}
