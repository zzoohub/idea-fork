import { sql } from "../client";
import type {
  Post,
  BriefListItem,
  ProductListItem,
  Tag,
} from "@/src/shared/api/types";

interface SearchResult {
  posts: Post[];
  briefs: BriefListItem[];
  products: ProductListItem[];
}

export async function querySearch(
  q: string,
  limit: number = 10,
): Promise<SearchResult> {
  // Search posts via full-text search
  const postRows = await sql(
    `SELECT p.id, p.title, p.body, p.source, p.subreddit, p.external_url,
            p.external_created_at, p.score, p.num_comments, p.post_type, p.sentiment
     FROM post p
     WHERE p.deleted_at IS NULL
       AND to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.body, '')) @@ plainto_tsquery('english', $1)
     ORDER BY p.external_created_at DESC
     LIMIT $2`,
    [q, limit],
  );

  // Load tags for posts
  const postIds = postRows.map((r) => r.id as number);
  const postTagsMap: Record<number, { slug: string; name: string }[]> = {};
  if (postIds.length > 0) {
    const tagRows = await sql(
      `SELECT pt.post_id, tg.slug, tg.name
       FROM post_tag pt JOIN tag tg ON tg.id = pt.tag_id
       WHERE pt.post_id = ANY($1)`,
      [postIds],
    );
    for (const tr of tagRows) {
      const pid = tr.post_id as number;
      if (!postTagsMap[pid]) postTagsMap[pid] = [];
      postTagsMap[pid].push({
        slug: tr.slug as string,
        name: tr.name as string,
      });
    }
  }

  const posts: Post[] = postRows.map((r) => ({
    id: r.id as number,
    title: r.title as string,
    body: (r.body as string) ?? null,
    source: r.source as string,
    subreddit: (r.subreddit as string) ?? null,
    external_url: r.external_url as string,
    external_created_at: String(r.external_created_at),
    score: r.score as number,
    num_comments: r.num_comments as number,
    post_type: (r.post_type as string) ?? null,
    sentiment: (r.sentiment as string) ?? null,
    tags: postTagsMap[r.id as number] || [],
  }));

  // Search briefs via ILIKE
  const briefRows = await sql(
    `SELECT id, slug, title, summary, status, published_at,
            source_count, upvote_count, downvote_count, demand_signals
     FROM brief
     WHERE status = 'published'
       AND (title ILIKE $1 OR summary ILIKE $1)
     ORDER BY published_at DESC
     LIMIT $2`,
    [`%${q}%`, limit],
  );

  const briefs: BriefListItem[] = briefRows.map((r) => ({
    id: r.id as number,
    slug: r.slug as string,
    title: r.title as string,
    summary: r.summary as string,
    status: r.status as string,
    published_at: r.published_at ? String(r.published_at) : null,
    source_count: r.source_count as number,
    upvote_count: r.upvote_count as number,
    downvote_count: r.downvote_count as number,
    demand_signals: (r.demand_signals as Record<string, unknown>) ?? {},
  }));

  // Search products via ILIKE
  const productRows = await sql(
    `SELECT DISTINCT ON (lower(name))
            id, slug, name, source, tagline, description, url, image_url,
            category, launched_at, signal_count, trending_score
     FROM product
     WHERE name ILIKE $1 OR tagline ILIKE $1 OR description ILIKE $1
     ORDER BY lower(name), trending_score DESC, id DESC
     LIMIT $2`,
    [`%${q}%`, limit],
  );

  // Load tags + sources for products
  const prodIds = productRows.map((r) => r.id as number);
  const prodTagsMap: Record<number, Tag[]> = {};
  if (prodIds.length > 0) {
    const ptRows = await sql(
      `SELECT pt.product_id, tg.id, tg.slug, tg.name
       FROM product_tag pt JOIN tag tg ON tg.id = pt.tag_id
       WHERE pt.product_id = ANY($1)`,
      [prodIds],
    );
    for (const tr of ptRows) {
      const pid = tr.product_id as number;
      if (!prodTagsMap[pid]) prodTagsMap[pid] = [];
      prodTagsMap[pid].push({
        id: tr.id as number,
        slug: tr.slug as string,
        name: tr.name as string,
      });
    }
  }

  const products: ProductListItem[] = productRows.map((r) => ({
    id: r.id as number,
    slug: r.slug as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    tagline: (r.tagline as string) ?? null,
    url: (r.url as string) ?? null,
    image_url: (r.image_url as string) ?? null,
    category: (r.category as string) ?? null,
    source: (r.source as string) ?? null,
    sources: [r.source as string],
    launched_at: r.launched_at ? String(r.launched_at) : null,
    signal_count: r.signal_count as number,
    trending_score: Number(r.trending_score),
    tags: prodTagsMap[r.id as number] || [],
  }));

  return { posts, briefs, products };
}
