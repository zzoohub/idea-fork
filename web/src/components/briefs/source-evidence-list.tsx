import { ExternalLink } from "lucide-react";
import type { SourcePost } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";
import { formatRelativeTime, formatNumber, sanitizeExternalUrl } from "@/lib/utils";

interface SourceEvidenceListProps {
  sources: SourcePost[];
}

export function SourceEvidenceList({ sources }: SourceEvidenceListProps) {
  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <a
          key={source.id}
          href={sanitizeExternalUrl(source.sourceUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-md p-2 -mx-2 hover:bg-accent transition-colors group min-h-11"
          aria-label={`"${source.excerpt}" on ${source.platformSubSource} (opens in new tab)`}
        >
          <PlatformIcon platform={source.platform} size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed line-clamp-1">
              &ldquo;{source.excerpt}&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{source.platformSubSource}</span>
              {source.upvotes != null && source.upvotes > 0 && (
                <span>{formatNumber(source.upvotes)} upvotes</span>
              )}
              {source.helpfulVotes != null && source.helpfulVotes > 0 && (
                <span>{formatNumber(source.helpfulVotes)} helpful</span>
              )}
              <span>{formatRelativeTime(source.createdAt)}</span>
            </div>
          </div>
          <ExternalLink
            size={14}
            className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors mt-1"
            aria-hidden="true"
          />
        </a>
      ))}
    </div>
  );
}
