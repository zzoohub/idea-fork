"use client";

import { BriefCard } from "@/src/entities/brief/ui";
import { mapBriefToCardData } from "@/src/entities/brief/lib/mappers";
import { ProductCard } from "@/src/entities/product/ui";
import { PostCard } from "@/src/entities/post/ui";
import { computeHeatLevel } from "@/src/shared/lib/compute-heat-level";
import { formatRelativeTime } from "@/src/shared/lib/format-relative-time";
import { mapSource, mapSourceName } from "@/src/shared/lib/post-source";
import type { BriefListItem, ProductListItem, Post } from "@/src/shared/api";

/* --------------------------------------------------------------------------
   Client-side filter helpers
   -------------------------------------------------------------------------- */

export function filterBriefs(
  briefs: BriefListItem[],
  query: string,
): BriefListItem[] {
  const q = query.toLowerCase();
  return briefs.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.summary.toLowerCase().includes(q),
  );
}

/* --------------------------------------------------------------------------
   Card wrappers — map API data → entity card props
   -------------------------------------------------------------------------- */

export function BriefCardItem({ brief }: { brief: BriefListItem }) {
  return <BriefCard {...mapBriefToCardData(brief)} />;
}

export function ProductCardItem({ product }: { product: ProductListItem }) {
  return (
    <ProductCard
      name={product.name}
      slug={product.slug}
      iconUrl={product.image_url ?? undefined}
      productUrl={product.url ?? undefined}
      category={product.category ?? "Uncategorized"}
      heatLevel={computeHeatLevel({
        postCount: product.signal_count,
        newestPostAt: product.launched_at,
      })}
      signalCount={product.signal_count}
      tagline={product.tagline ?? product.description ?? ""}
      source={product.source ?? undefined}
      tags={product.tags ?? []}
    />
  );
}

export function PostCardItem({ post }: { post: Post }) {
  return (
    <PostCard
      source={mapSource(post.source)}
      sourceName={mapSourceName(post)}
      date={formatRelativeTime(post.external_created_at)}
      title={post.title}
      snippet={post.body ?? ""}
      postType={post.post_type ?? undefined}
      tags={post.tags.map((t) => ({ label: t.name, value: t.slug }))}
      upvotes={post.score}
      commentCount={post.num_comments}
      originalUrl={post.external_url}
    />
  );
}
