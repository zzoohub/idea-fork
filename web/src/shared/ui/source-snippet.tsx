import { isSafeUrl } from "@/src/shared/lib/sanitize-url";
import { Icon } from "./icon";

interface SourceSnippetProps {
  source: string;
  sourceName: string;
  date: string;
  snippet: string;
  originalUrl: string;
  className?: string;
}

export function SourceSnippet({
  source,
  sourceName,
  date,
  snippet,
  originalUrl,
  className,
}: SourceSnippetProps) {
  return (
    <div
      className={[
        "rounded-card border border-border bg-bg-tertiary p-space-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-space-sm text-body-sm text-text-secondary">
        <Icon name={source} size={16} />
        <span>{sourceName}</span>
        <span aria-hidden="true" className="text-text-tertiary">
          &middot;
        </span>
        <time className="text-text-tertiary">{date}</time>
      </div>
      <p className="mt-space-xs text-body-sm text-text-primary leading-[var(--leading-body-sm)] line-clamp-2">
        {snippet}
      </p>
      {isSafeUrl(originalUrl) ? (
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-space-sm inline-flex items-center gap-space-xs text-body-sm text-interactive hover:text-interactive-hover transition-colors"
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          View original
          <Icon name="external-link" size={14} />
        </a>
      ) : (
        <span className="mt-space-sm inline-flex items-center gap-space-xs text-body-sm text-text-tertiary">
          View original
        </span>
      )}
    </div>
  );
}
