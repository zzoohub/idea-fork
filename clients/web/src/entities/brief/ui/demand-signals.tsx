import { Icon } from "@/src/shared/ui/icon";

export interface DemandSignalData {
  complaintCount: number;
  timeRange: string | null;
  subreddits: string[];
  avgScore: number;
  avgCommentsPerPost: number;
  communityVerdictPct: number | null;
  freshness: string | null;
}

interface DemandSignalsProps {
  data: DemandSignalData;
  className?: string;
}

export function DemandSignals({ data, className }: DemandSignalsProps) {
  const {
    complaintCount,
    timeRange,
    subreddits,
    avgScore,
    avgCommentsPerPost,
    communityVerdictPct,
    freshness,
  } = data;

  const MAX_VISIBLE_SUBS = 3;
  const visibleSubs = subreddits.slice(0, MAX_VISIBLE_SUBS);
  const remaining = subreddits.length - MAX_VISIBLE_SUBS;

  const complaintLabel = timeRange
    ? `${complaintCount} complaints over ${timeRange}`
    : `${complaintCount} complaints`;

  const subredditLabel =
    visibleSubs.length > 0
      ? visibleSubs.join(", ") + (remaining > 0 ? ` + ${remaining} more` : "")
      : null;

  return (
    <div
      className={["flex flex-col gap-3", className].filter(Boolean).join(" ")}
    >
      <MetricLine icon="message-square-warning" text={complaintLabel} />
      {subredditLabel && (
        <MetricLine icon="globe" text={subredditLabel} />
      )}
      <MetricLine
        icon="trending-up"
        text={`avg ${Math.round(avgScore)} upvotes \u00b7 ${Math.round(avgCommentsPerPost)} comments per post`}
      />
      {communityVerdictPct != null && (
        <MetricLine
          icon="thumbs-up"
          text={`${Math.round(communityVerdictPct)}% of users rated this valuable`}
        />
      )}
      {freshness && (
        <MetricLine icon="clock" text={`Most recent: ${freshness}`} />
      )}
    </div>
  );
}

function MetricLine({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-slate-400 text-sm">
      <Icon name={icon} size={16} className="text-slate-500 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
