"use client";

import { CitationRef } from "./citation-ref";

interface Citation {
  id: number;
  source: string;
  sourceName: string;
  date: string;
  snippet: string;
  originalUrl: string;
}

interface BriefContent {
  problem: string;
  demandSignals: string[];
  suggestedDirections: string[];
}

interface BriefBodyProps {
  content: BriefContent;
  citations: Citation[];
  className?: string;
}

/**
 * Full brief content renderer with sections and inline citation refs.
 */
export function BriefBody({ content, citations, className }: BriefBodyProps) {
  const citationMap = new Map(citations.map((c) => [c.id, c]));

  return (
    <div
      className={["flex flex-col gap-space-xl", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Problem section */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary leading-[var(--leading-h2)]">
          Problem
        </h2>
        <div className="mt-space-md text-body text-text-primary leading-[var(--leading-body)]">
          {renderTextWithCitations(content.problem, citationMap)}
        </div>
      </section>

      {/* Demand Signals section */}
      {content.demandSignals.length > 0 && (
        <section>
          <h2 className="text-h2 font-semibold text-text-primary leading-[var(--leading-h2)]">
            Demand Signals
          </h2>
          <ul className="mt-space-md flex flex-col gap-space-sm">
            {content.demandSignals.map((signal, i) => (
              <li
                key={i}
                className="flex gap-space-sm text-body text-text-primary leading-[var(--leading-body)]"
              >
                <span
                  aria-hidden="true"
                  className="mt-[2px] shrink-0 text-text-tertiary"
                >
                  &bull;
                </span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Suggested Directions section */}
      {content.suggestedDirections.length > 0 && (
        <section>
          <h2 className="text-h2 font-semibold text-text-primary leading-[var(--leading-h2)]">
            Suggested Directions
          </h2>
          <ol className="mt-space-md flex flex-col gap-space-sm">
            {content.suggestedDirections.map((direction, i) => (
              <li
                key={i}
                className="flex gap-space-sm text-body text-text-primary leading-[var(--leading-body)]"
              >
                <span className="shrink-0 tabular-nums text-text-tertiary font-semibold">
                  {i + 1}.
                </span>
                <span>{direction}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Utility: renders text that may contain [1], [2] citation markers
 * and replaces them with interactive CitationRef components.
 * -------------------------------------------------------------------------- */
function renderTextWithCitations(
  text: string,
  citationMap: Map<number, Citation>,
) {
  const parts = text.split(/(\[\d+\])/g);

  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const citation = citationMap.get(num);
      if (citation) {
        return <CitationRef key={i} number={num} citation={citation} />;
      }
    }
    return <span key={i}>{part}</span>;
  });
}
