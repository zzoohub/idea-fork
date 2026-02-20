import { Card } from "@/src/shared/ui/card";
import { Chip } from "@/src/shared/ui/chip";
import { Icon } from "@/src/shared/ui/icon";

interface ProductCardProps {
  name: string;
  iconUrl?: string;
  category: string;
  isTrending: boolean;
  complaintCount: number;
  topIssue: string;
  tags: string[];
  slug: string;
}

export function ProductCard({
  name,
  iconUrl,
  category,
  isTrending,
  complaintCount,
  topIssue,
  tags,
  slug,
}: ProductCardProps) {
  return (
    <Card href={`/products/${slug}`} as="article">
      {/* Header: icon + name */}
      <div className="flex items-start gap-space-md">
        {/* Product icon / first-letter avatar */}
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            width={40}
            height={40}
            className="shrink-0 rounded-card object-cover"
          />
        ) : (
          <div
            className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-card bg-interactive/15 text-h3 font-bold text-interactive"
            aria-hidden="true"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-h3 font-semibold text-text-primary leading-[var(--leading-h3)] truncate">
            {name}
          </h3>
          <div className="mt-space-xs flex items-center gap-space-sm text-body-sm text-text-secondary">
            <span>{category}</span>
            {isTrending && (
              <>
                <span aria-hidden="true" className="text-text-tertiary">
                  &middot;
                </span>
                <span className="inline-flex items-center gap-space-xs text-positive font-semibold">
                  <Icon name="trending" size={14} />
                  Trending
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Complaint stats */}
      <div className="mt-space-md text-body-sm text-text-secondary leading-[var(--leading-body-sm)]">
        <span className="font-semibold text-text-primary tabular-nums">
          {complaintCount.toLocaleString()}
        </span>
        {" complaints"}
        <span aria-hidden="true" className="mx-space-xs text-text-tertiary">
          &middot;
        </span>
        {"Top issue: "}
        <span className="text-text-primary">&ldquo;{topIssue}&rdquo;</span>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-space-md flex flex-wrap gap-space-xs">
          {tags.map((tag) => (
            <Chip key={tag} variant="inactive" interactive={false}>
              {tag}
            </Chip>
          ))}
        </div>
      )}
    </Card>
  );
}
