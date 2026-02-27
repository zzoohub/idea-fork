import { sql } from "../client";
import { decodeCursor, encodeCursor } from "../pagination";
import type {
  ApiResponse,
  ProductListItem,
  ProductDetail,
  ProductPost,
  ProductMetrics,
  RelatedBrief,
  Tag,
} from "@/src/shared/api/types";

interface QueryProductsParams {
  category?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
  period?: string;
  q?: string;
}

const SORT_COLUMN_MAP: Record<string, string> = {
  "-trending_score": "trending_score",
  "-signal_count": "signal_count",
  "-launched_at": "launched_at",
};

const NULLABLE_SORT_COLS = new Set(["launched_at"]);
const PERIOD_INTERVALS: Record<string, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export async function queryProducts(
  params?: QueryProductsParams,
): Promise<ApiResponse<ProductListItem[]>> {
  const sort = params?.sort || "-trending_score";
  const limit = params?.limit || 20;
  const sortCol = SORT_COLUMN_MAP[sort] || "trending_score";
  const nullable = NULLABLE_SORT_COLS.has(sortCol);
  const nullsLast = nullable ? " NULLS LAST" : "";

  // Inner WHERE for grouped query
  const innerConditions: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 0;
  const nextParam = () => `$${++paramIdx}`;

  if (params?.q) {
    const p = nextParam();
    innerConditions.push(
      `(name ILIKE ${p} OR tagline ILIKE ${p} OR description ILIKE ${p})`,
    );
    values.push(`%${params.q}%`);
  }

  if (params?.category) {
    innerConditions.push(`category = ${nextParam()}`);
    values.push(params.category);
  }

  if (params?.period && params.period in PERIOD_INTERVALS) {
    innerConditions.push(
      `created_at >= now() - interval '${PERIOD_INTERVALS[params.period]}'`,
    );
  }

  const innerWhere = innerConditions.length
    ? `WHERE ${innerConditions.join(" AND ")}`
    : "";

  // Cursor for wrapper
  let cursorClause = "";
  if (params?.cursor) {
    const cv = decodeCursor(params.cursor);
    const cursorVal = cv.v;
    const cursorId = cv.id;
    if (cursorVal !== undefined && cursorId !== undefined) {
      const pv = nextParam();
      const pid = nextParam();
      cursorClause = `WHERE (g.${sortCol} < ${pv} OR (g.${sortCol} = ${pv} AND g.id < ${pid}))`;
      values.push(cursorVal, cursorId);
    } else if (nullable && cursorId !== undefined) {
      const pid = nextParam();
      cursorClause = `WHERE (g.${sortCol} IS NULL AND g.id < ${pid})`;
      values.push(cursorId);
    }
  }

  const limitParam = nextParam();
  values.push(limit + 1);

  const query = `
    SELECT g.id, g.name, g.slug, g.source, g.tagline, g.description,
           g.url, g.image_url, g.category, g.launched_at,
           g.signal_count, g.trending_score,
           (SELECT array_agg(DISTINCT p2.source)
            FROM product p2
            WHERE lower(p2.name) = lower(g.name)) AS sources
    FROM (
      SELECT DISTINCT ON (lower(name))
          id, name, slug, source, tagline, description,
          url, image_url, category, launched_at,
          signal_count, trending_score, created_at
      FROM product
      ${innerWhere}
      ORDER BY lower(name), ${sortCol} DESC${nullsLast}, id DESC
    ) g
    ${cursorClause}
    ORDER BY g.${sortCol} DESC${nullsLast}, g.id DESC
    LIMIT ${limitParam}
  `;

  const rows = await sql(query, values);
  const hasNext = rows.length > limit;
  const items = rows.slice(0, limit);

  // Load tags for all product IDs in one query
  const productIds = items.map((r) => r.id as number);
  const tagsMap: Record<number, Tag[]> = {};
  if (productIds.length > 0) {
    const tagRows = await sql(
      `SELECT pt.product_id, tg.id, tg.slug, tg.name
       FROM product_tag pt JOIN tag tg ON tg.id = pt.tag_id
       WHERE pt.product_id = ANY($1)`,
      [productIds],
    );
    for (const tr of tagRows) {
      const pid = tr.product_id as number;
      if (!tagsMap[pid]) tagsMap[pid] = [];
      tagsMap[pid].push({
        id: tr.id as number,
        slug: tr.slug as string,
        name: tr.name as string,
      });
    }
  }

  const products: ProductListItem[] = items.map((r) => ({
    id: r.id as number,
    slug: r.slug as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    tagline: (r.tagline as string) ?? null,
    url: (r.url as string) ?? null,
    image_url: (r.image_url as string) ?? null,
    category: (r.category as string) ?? null,
    source: (r.source as string) ?? null,
    sources: r.sources ? (r.sources as string[]) : [r.source as string],
    launched_at: r.launched_at ? String(r.launched_at) : null,
    signal_count: r.signal_count as number,
    trending_score: Number(r.trending_score),
    tags: tagsMap[r.id as number] || [],
  }));

  let nextCursor: string | null = null;
  if (hasNext && items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = encodeCursor({ v: last[sortCol], id: last.id });
  }

  return {
    data: products,
    meta: { has_next: hasNext, next_cursor: nextCursor },
  };
}

export async function queryProduct(
  slug: string,
): Promise<ApiResponse<ProductDetail>> {
  // Get product
  const prodRows = await sql(
    `SELECT id, slug, name, source, tagline, description, url, image_url,
            category, launched_at, signal_count, trending_score
     FROM product WHERE slug = $1`,
    [slug],
  );
  if (prodRows.length === 0) throw new Error("Product not found");
  const r = prodRows[0];
  const productId = r.id as number;

  // Sources aggregation
  const srcRows = await sql(
    `SELECT array_agg(DISTINCT source) AS sources FROM product WHERE lower(name) = lower($1)`,
    [r.name],
  );
  const sources =
    srcRows[0]?.sources ? (srcRows[0].sources as string[]) : [r.source as string];

  // Tags
  const tagRows = await sql(
    `SELECT tg.id, tg.slug, tg.name
     FROM product_tag pt JOIN tag tg ON tg.id = pt.tag_id
     WHERE pt.product_id = $1`,
    [productId],
  );

  // Posts (via product tags → post_tag)
  const postsLimit = 10;
  const postRows = await sql(
    `SELECT DISTINCT p.id, p.title, p.body, p.source, p.subreddit, p.external_url,
            p.external_created_at, p.score, p.post_type, p.sentiment
     FROM post p
     JOIN post_tag ptag ON ptag.post_id = p.id
     JOIN product_tag prtag ON prtag.tag_id = ptag.tag_id
     WHERE prtag.product_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.id DESC
     LIMIT $2`,
    [productId, postsLimit + 1],
  );

  const postsHasNext = postRows.length > postsLimit;
  const postItems = postRows.slice(0, postsLimit);

  // Metrics
  const metricsRows = await sql(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE p.sentiment = 'negative')::int AS negative,
       COUNT(*) FILTER (WHERE p.sentiment = 'positive')::int AS positive
     FROM post p
     JOIN post_tag ptag ON ptag.post_id = p.id
     JOIN product_tag prtag ON prtag.tag_id = ptag.tag_id
     WHERE prtag.product_id = $1 AND p.deleted_at IS NULL`,
    [productId],
  );
  const m = metricsRows[0];
  const total = (m?.total as number) ?? 0;
  const negative = (m?.negative as number) ?? 0;
  const positive = (m?.positive as number) ?? 0;
  const sentimentScore = Math.round(
    (positive / Math.max(positive + negative, 1)) * 100,
  );

  // Related briefs
  const briefRows = await sql(
    `SELECT DISTINCT b.id, b.slug, b.title, b.summary, b.source_count
     FROM brief b
     JOIN brief_source bs ON bs.brief_id = b.id
     JOIN product_post pp ON pp.post_id = bs.post_id
     WHERE pp.product_id = $1 AND b.status = 'published'
     ORDER BY b.source_count DESC
     LIMIT 3`,
    [productId],
  );

  const posts: ProductPost[] = postItems.map((p) => ({
    id: p.id as number,
    title: p.title as string,
    body: (p.body as string) ?? null,
    source: p.source as string,
    subreddit: (p.subreddit as string) ?? null,
    external_url: p.external_url as string,
    external_created_at: String(p.external_created_at),
    score: p.score as number,
    post_type: (p.post_type as string) ?? null,
    sentiment: (p.sentiment as string) ?? null,
  }));

  const metrics: ProductMetrics = {
    total_mentions: total,
    negative_count: negative,
    sentiment_score: sentimentScore,
  };

  const relatedBriefs: RelatedBrief[] = briefRows.map((b) => ({
    id: b.id as number,
    slug: b.slug as string,
    title: b.title as string,
    summary: b.summary as string,
    source_count: b.source_count as number,
  }));

  return {
    data: {
      id: r.id as number,
      slug: r.slug as string,
      name: r.name as string,
      description: (r.description as string) ?? null,
      tagline: (r.tagline as string) ?? null,
      url: (r.url as string) ?? null,
      image_url: (r.image_url as string) ?? null,
      category: (r.category as string) ?? null,
      source: (r.source as string) ?? null,
      sources,
      launched_at: r.launched_at ? String(r.launched_at) : null,
      signal_count: r.signal_count as number,
      trending_score: Number(r.trending_score),
      tags: tagRows.map((t) => ({
        id: t.id as number,
        slug: t.slug as string,
        name: t.name as string,
      })),
      metrics,
      posts,
      related_briefs: relatedBriefs,
    },
    meta: {
      has_next: postsHasNext,
      next_cursor: null,
    },
  };
}
