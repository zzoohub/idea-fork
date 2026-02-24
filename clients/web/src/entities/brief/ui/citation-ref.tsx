"use client";

import { useState, useRef, useCallback } from "react";
import { SourceSnippet } from "@/src/shared/ui/source-snippet";
import { gsap, useReducedMotion, DURATION, EASE } from "@/src/shared/lib/gsap";

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
  const contentRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  const toggle = useCallback(() => {
    if (expanded) {
      // Collapse — set state immediately so content unmounts
      setExpanded(false);
    } else {
      // Expand
      setExpanded(true);
      if (!reducedMotion) {
        // Wait for React to render content, then animate from 0 to auto
        requestAnimationFrame(() => {
          const el = contentRef.current;
          if (!el) return;
          gsap.fromTo(
            el,
            { height: 0, opacity: 0 },
            { height: "auto", opacity: 1, duration: DURATION.slow, ease: EASE.out },
          );
        });
      }
    }
  }, [expanded, reducedMotion]);

  return (
    <span className="inline">
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`Citation ${number}: ${citation.sourceName}`}
        onClick={toggle}
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
          ref={contentRef}
          className="block overflow-hidden"
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
