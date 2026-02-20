"use client";

import { MaterialIcon } from "@/src/shared/ui/material-icon";
import { CitationRef } from "./citation-ref";

/* ---------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

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
  suggestedDirections: Array<{ title: string; description: string }>;
}

interface PlatformBreakdown {
  name: string;
  color: string;
  percentage: number;
  postCount: number;
}

interface BriefBodyProps {
  content: BriefContent;
  citations: Citation[];
  platforms?: PlatformBreakdown[];
  className?: string;
}

/* ---------------------------------------------------------------------------
 * Volume Trend Bar Heights (10 bars, increasing with variance)
 * -------------------------------------------------------------------------- */
const VOLUME_BARS = [18, 24, 20, 32, 38, 35, 48, 56, 64, 80];

/* ---------------------------------------------------------------------------
 * BriefBody
 * -------------------------------------------------------------------------- */
export function BriefBody({
  content,
  citations,
  platforms = [],
  className,
}: BriefBodyProps) {
  const citationMap = new Map(citations.map((c) => [c.id, c]));

  return (
    <div
      className={["flex flex-col gap-8", className].filter(Boolean).join(" ")}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Problem Statement                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="rounded-xl bg-[#1a242d] border border-[#283039] p-6 sm:p-8"
        aria-labelledby="brief-problem-heading"
      >
        <div className="flex items-center gap-3 mb-5">
          <MaterialIcon
            name="report_problem"
            size={24}
            className="text-[#137fec] shrink-0"
          />
          <h2
            id="brief-problem-heading"
            className="text-xl font-bold text-white"
          >
            Problem Statement
          </h2>
        </div>
        <div className="text-slate-300 leading-relaxed text-lg">
          {renderTextWithCitations(content.problem, citationMap)}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Demand Signals                                                      */}
      {/* ------------------------------------------------------------------ */}
      {content.demandSignals.length > 0 && (
        <section
          className="rounded-xl bg-[#1a242d] border border-[#283039] p-6 sm:p-8"
          aria-labelledby="brief-demand-heading"
        >
          {/* Header row */}
          <div className="flex items-center gap-3 mb-6">
            <MaterialIcon
              name="monitoring"
              size={24}
              className="text-[#137fec] shrink-0"
            />
            <h2
              id="brief-demand-heading"
              className="text-xl font-bold text-white"
            >
              Demand Signals
            </h2>
            <span className="ml-auto text-xs text-slate-500 bg-slate-800 rounded-full px-3 py-1 font-medium">
              Data from last 30 days
            </span>
          </div>

          {/* Signal bullets */}
          <ul className="flex flex-col gap-3 mb-8">
            {content.demandSignals.map((signal, i) => (
              <li key={i} className="flex gap-3 text-slate-300 leading-relaxed">
                <span
                  className="mt-2 size-1.5 rounded-full bg-[#137fec] shrink-0"
                  aria-hidden="true"
                />
                <span>{signal}</span>
              </li>
            ))}
          </ul>

          {/* Two-column data: Platform Breakdown + Volume Trend */}
          {platforms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Platform Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Platform Breakdown
                </h3>
                <div className="flex flex-col gap-4">
                  {platforms.map((platform) => (
                    <PlatformBar key={platform.name} platform={platform} />
                  ))}
                </div>
              </div>

              {/* Right: Volume Trend */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Volume Trend
                </h3>
                <div
                  className="flex items-end gap-1.5 h-24"
                  role="img"
                  aria-label="Volume trend showing increasing activity over 30 days"
                >
                  {VOLUME_BARS.map((height, i) => {
                    const opacity = 0.2 + (i / (VOLUME_BARS.length - 1)) * 0.8;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-[#137fec]"
                        style={{
                          height: `${height}%`,
                          opacity,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[11px] text-slate-500">
                    30 days ago
                  </span>
                  <span className="text-[11px] text-slate-500">Today</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Suggested Solution Directions                                       */}
      {/* ------------------------------------------------------------------ */}
      {content.suggestedDirections.length > 0 && (
        <section
          className="relative rounded-xl bg-[#1a242d] border border-[#283039] p-6 sm:p-8 overflow-hidden"
          aria-labelledby="brief-directions-heading"
        >
          {/* Subtle background decoration */}
          <div
            className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-[#137fec]/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <MaterialIcon
                name="lightbulb"
                size={24}
                className="text-[#137fec] shrink-0"
              />
              <h2
                id="brief-directions-heading"
                className="text-xl font-bold text-white"
              >
                Suggested Solution Directions
              </h2>
            </div>

            <ol className="flex flex-col gap-6">
              {content.suggestedDirections.map((direction, i) => (
                <li key={i} className="flex gap-4">
                  {/* Styled number */}
                  <span
                    className="size-8 shrink-0 rounded-full bg-[#137fec]/10 text-[#137fec] flex items-center justify-center font-bold text-sm"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="text-white font-semibold text-lg">
                      {direction.title}
                    </span>
                    <span className="text-slate-400 leading-relaxed">
                      {renderTextWithCitations(
                        direction.description,
                        citationMap,
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * PlatformBar: A single platform row with colored progress bar
 * -------------------------------------------------------------------------- */
function PlatformBar({ platform }: { platform: PlatformBreakdown }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`size-2.5 rounded-full ${platform.color}`}
            aria-hidden="true"
          />
          <span className="text-sm text-slate-300 font-medium">
            {platform.name}
          </span>
        </div>
        <span className="text-sm text-slate-400 tabular-nums">
          {platform.percentage}%
          <span className="text-slate-500 ml-1.5 text-xs">
            ({platform.postCount})
          </span>
        </span>
      </div>
      {/* Progress bar track */}
      <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
        <div
          className={`h-full rounded-full ${platform.color}`}
          style={{ width: `${platform.percentage}%` }}
          role="progressbar"
          aria-valuenow={platform.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${platform.name}: ${platform.percentage}%`}
        />
      </div>
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
