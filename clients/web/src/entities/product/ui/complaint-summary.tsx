import { useTranslations } from "next-intl";
import { Icon } from "@/src/shared/ui/icon";
import { Badge } from "@/src/shared/ui/badge";

export interface ComplaintTheme {
  name: string;
  count: number;
}

interface ComplaintSummaryProps {
  totalMentions: number;
  mentionsTrend?: number;
  criticalComplaints: number;
  criticalTrend?: number;
  frustrationRate: number | null;
  themes: ComplaintTheme[];
  className?: string;
}

function TrendBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <Badge variant={isPositive ? "positive" : "negative"}>
      <span className="inline-flex items-center gap-0.5">
        <Icon
          name={isPositive ? "trending-up" : "trending-down"}
          size={14}
        />
        {isPositive ? "+" : ""}
        {value}%
      </span>
    </Badge>
  );
}

export function ComplaintSummary({
  totalMentions,
  mentionsTrend,
  criticalComplaints,
  criticalTrend,
  frustrationRate,
  themes,
  className,
}: ComplaintSummaryProps) {
  const t = useTranslations("complaintSummary");

  // Find top theme for subtitle display
  const topTheme = themes.length > 0 ? themes[0] : null;

  return (
    <div
      className={[
        "grid grid-cols-1 sm:grid-cols-3 gap-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="region"
      aria-label={t("totalMentions")}
    >
      {/* Total Mentions Card */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#18212F] border border-slate-200 dark:border-[#283039]">
        <div className="absolute -right-2 -top-2 opacity-10" aria-hidden="true">
          <Icon name="messages-square" size={64} className="text-blue-500" />
        </div>
        <div className="relative">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("totalMentions")}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
              {totalMentions.toLocaleString()}
            </span>
            {mentionsTrend != null && <TrendBadge value={mentionsTrend} />}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {t("acrossAllPlatforms")}
          </p>
        </div>
      </div>

      {/* Critical Complaints Card */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#18212F] border border-slate-200 dark:border-[#283039]">
        <div className="absolute -right-2 -top-2 opacity-10" aria-hidden="true">
          <Icon name="triangle-alert" size={64} className="text-orange-500" />
        </div>
        <div className="relative">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("criticalComplaints")}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
              {criticalComplaints.toLocaleString()}
            </span>
            {criticalTrend != null && <TrendBadge value={criticalTrend} />}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {topTheme
              ? t("topIssue", { name: topTheme.name })
              : t("requiresAttention")}
          </p>
        </div>
      </div>

      {/* Frustration Rate Card */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#18212F] border border-slate-200 dark:border-[#283039]">
        <div className="absolute -right-2 -top-2 opacity-10" aria-hidden="true">
          <Icon name="chart-line" size={64} className="text-orange-500" />
        </div>
        <div className="relative">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("frustrationRate")}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            {frustrationRate != null ? (
              <>
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {frustrationRate}%
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-slate-400 dark:text-slate-500">
                {t("noData")}
              </span>
            )}
          </div>
          {/* Progress bar */}
          {frustrationRate != null ? (
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(Math.max(frustrationRate, 0), 100)}%` }}
                role="progressbar"
                aria-valuenow={frustrationRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("frustrationAriaLabel", { rate: frustrationRate })}
              />
            </div>
          ) : (
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700/50" />
          )}
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {frustrationRate != null
              ? t("negativeOfTotal", { rate: frustrationRate })
              : t("noData")}
          </p>
        </div>
      </div>
    </div>
  );
}
