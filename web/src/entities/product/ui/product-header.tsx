import { Icon } from "@/src/shared/ui/icon";
import { isSafeUrl } from "@/src/shared/lib/sanitize-url";

interface ProductHeaderProps {
  name: string;
  iconUrl?: string;
  category: string;
  websiteUrl?: string;
  className?: string;
}

export function ProductHeader({
  name,
  iconUrl,
  category,
  websiteUrl,
  className,
}: ProductHeaderProps) {
  return (
    <div
      className={["flex items-start gap-space-lg", className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Product icon / first-letter avatar */}
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          width={56}
          height={56}
          className="shrink-0 rounded-card object-cover"
        />
      ) : (
        <div
          className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-card bg-interactive/15 text-h1 font-bold text-interactive"
          aria-hidden="true"
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="text-h1 font-bold text-text-primary leading-[var(--leading-h1)]">
          {name}
        </h1>
        <div className="mt-space-xs flex flex-wrap items-center gap-space-sm text-body-sm text-text-secondary">
          <span>{category}</span>
          {websiteUrl && isSafeUrl(websiteUrl) && (
            <>
              <span aria-hidden="true" className="text-text-tertiary">
                &middot;
              </span>
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-space-xs text-interactive hover:text-interactive-hover transition-colors"
                style={{
                  transitionDuration: "var(--duration-fast)",
                  transitionTimingFunction: "var(--ease-out)",
                }}
              >
                Website
                <Icon name="external-link" size={14} />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
