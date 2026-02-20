interface ComplaintTheme {
  name: string;
  count: number;
}

interface ComplaintSummaryProps {
  totalCount: number;
  platformCount: number;
  themes: ComplaintTheme[];
  className?: string;
}

export function ComplaintSummary({
  totalCount,
  platformCount,
  themes,
  className,
}: ComplaintSummaryProps) {
  /* Find max count for relative bar width */
  const maxCount = themes.length > 0 ? Math.max(...themes.map((t) => t.count)) : 1;

  return (
    <div
      className={["flex flex-col gap-space-lg", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Summary stats */}
      <div className="flex items-center gap-space-lg text-body-sm text-text-secondary">
        <div>
          <span className="text-h2 font-bold text-text-primary tabular-nums">
            {totalCount.toLocaleString()}
          </span>
          <span className="ml-space-xs">complaints</span>
        </div>
        <span aria-hidden="true" className="text-text-tertiary">
          &middot;
        </span>
        <div>
          <span className="font-semibold text-text-primary tabular-nums">
            {platformCount}
          </span>
          <span className="ml-space-xs">
            {platformCount === 1 ? "platform" : "platforms"}
          </span>
        </div>
      </div>

      {/* Complaint themes ranked list */}
      {themes.length > 0 && (
        <div className="flex flex-col gap-space-md" role="list" aria-label="Complaint themes">
          {themes.map((theme, i) => {
            const widthPercent = Math.max((theme.count / maxCount) * 100, 4);
            return (
              <div key={theme.name} className="flex flex-col gap-space-xs" role="listitem">
                <div className="flex items-baseline justify-between gap-space-md">
                  <span className="text-body-sm text-text-primary">
                    <span className="text-text-tertiary tabular-nums mr-space-sm">
                      {i + 1}.
                    </span>
                    {theme.name}
                  </span>
                  <span className="shrink-0 text-body-sm text-text-secondary tabular-nums">
                    {theme.count.toLocaleString()}
                  </span>
                </div>
                {/* Visual bar */}
                <div className="h-[4px] w-full rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-interactive transition-all"
                    style={{
                      width: `${widthPercent}%`,
                      transitionDuration: "var(--duration-slow)",
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
