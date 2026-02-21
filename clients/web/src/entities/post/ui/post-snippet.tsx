import { Icon } from "@/src/shared/ui/icon";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";

interface PostSnippetProps {
  source: "reddit" | "appstore";
  sourceName: string;
  date: string;
  snippet: string;
  originalUrl: string;
  className?: string;
}

export function PostSnippet({
  source,
  sourceName,
  date,
  snippet,
  originalUrl,
  className,
}: PostSnippetProps) {
  const iconName = source === "reddit" ? "reddit" : "app-store";

  return (
    <div
      className={["flex flex-col gap-space-xs", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Source line */}
      <div className="flex items-center gap-space-sm text-body-sm text-text-secondary">
        <Icon name={iconName} size={14} className="shrink-0" />
        <span>{sourceName}</span>
        <span aria-hidden="true" className="text-text-tertiary">
          &middot;
        </span>
        <time className="text-text-tertiary">{date}</time>
      </div>

      {/* Snippet text */}
      <p className="text-body-sm text-text-primary leading-[var(--leading-body-sm)] line-clamp-2">
        {snippet}
      </p>

      {/* View original link */}
      {isSafeUrl(originalUrl) ? (
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-space-xs text-body-sm text-interactive hover:text-interactive-hover transition-colors"
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          View original
          <Icon name="external-link" size={12} />
        </a>
      ) : (
        <span className="inline-flex items-center gap-space-xs text-body-sm text-text-tertiary">
          View original
        </span>
      )}
    </div>
  );
}
