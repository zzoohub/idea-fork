import { Card } from "@/src/shared/ui/card";
import { Chip } from "@/src/shared/ui/chip";
import { DemandSignals } from "./demand-signals";

interface BriefCardProps {
  title: string;
  postCount: number;
  platformCount: number;
  recency: string;
  snippet: string;
  tags: string[];
  slug: string;
}

export function BriefCard({
  title,
  postCount,
  platformCount,
  recency,
  snippet,
  tags,
  slug,
}: BriefCardProps) {
  return (
    <Card href={`/briefs/${slug}`} as="article">
      {/* Title */}
      <h3 className="text-h3 font-semibold text-text-primary leading-[var(--leading-h3)]">
        {title}
      </h3>

      {/* Demand signals */}
      <div className="mt-space-sm">
        <DemandSignals
          postCount={postCount}
          platformCount={platformCount}
          recency={recency}
        />
      </div>

      {/* Snippet */}
      <p className="mt-space-md text-body-sm text-text-secondary leading-[var(--leading-body-sm)] line-clamp-3">
        &ldquo;{snippet}&rdquo;
      </p>

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
