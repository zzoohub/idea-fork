import { sql } from "../client";
import { decodeCursor, encodeCursor } from "../pagination";
import type { ApiResponse, Post, PostTag } from "@/src/shared/api/types";

interface QueryPostsParams {
  tag?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
  source?: string;
  sentiment?: string;
  post_type?: string;
  q?: string;
}

const SORT_COLUMN_MAP: Record<string, string> = {
  "-external_created_at": "p.external_created_at",
  "-score": "p.score",
  "-num_comments": "p.num_comments",
};

const SORT_ATTR_MAP: Record<string, string> = {
  "-external_created_at": "external_created_at",
  "-score": "score",
  "-num_comments": "num_comments",
};

export async function queryPosts(
  params?: QueryPostsParams,
): Promise<ApiResponse<Post[]>> {
  const sort = params?.sort || "-external_created_at";
  const limit = params?.limit || 20;
  const sortCol = SORT_COLUMN_MAP[sort] || "p.external_created_at";

  const conditions: string[] = ["p.deleted_at IS NULL"];
  const values: unknown[] = [];
  let paramIdx = 0;

  const nextParam = () => `$${++paramIdx}`;

  // Tag filter (join post_tag + tag)
  let joinClause = "";
  if (params?.tag) {
    const slugs = params.tag.split(",").map((s) => s.trim());
    joinClause +=
      " JOIN post_tag pt ON pt.post_id = p.id JOIN tag t ON t.id = pt.tag_id";
    conditions.push(`t.slug = ANY(${nextParam()})`);
    values.push(slugs);
  }

  if (params?.source) {
    conditions.push(`p.source = ${nextParam()}`);
    values.push(params.source);
  }

  if (params?.sentiment) {
    conditions.push(`p.sentiment = ${nextParam()}`);
    values.push(params.sentiment);
  }

  if (params?.post_type) {
    conditions.push(`p.post_type = ${nextParam()}`);
    values.push(params.post_type);
  }

  if (params?.q) {
    conditions.push(
      `to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.body, '')) @@ plainto_tsquery('english', ${nextParam()})`,
    );
    values.push(params.q);
  }

  // Cursor pagination
  if (params?.cursor) {
    const cv = decodeCursor(params.cursor);
    const cursorVal = cv.v;
    const cursorId = cv.id;
    if (cursorVal !== undefined && cursorId !== undefined) {
      const pv = nextParam();
      const pid = nextParam();
      conditions.push(
        `(${sortCol} < ${pv} OR (${sortCol} = ${pv} AND p.id < ${pid}))`,
      );
      values.push(cursorVal, cursorId);
    }
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const query = `
    SELECT p.id, p.title, p.body, p.source, p.subreddit, p.external_url,
           p.external_created_at, p.score, p.num_comments, p.post_type, p.sentiment
    FROM post p
    ${joinClause}
    ${whereClause}
    ORDER BY ${sortCol} DESC, p.id DESC
    LIMIT ${nextParam()}
  `;
  values.push(limit + 1);

  const rows = await sql(query, values);

  // Load tags for all posts in one query
  const postIds = rows.map((r) => r.id as number);
  const tagsMap: Record<number, PostTag[]> = {};
  if (postIds.length > 0) {
    const tagRows = await sql(
      `SELECT pt.post_id, tg.slug, tg.name
       FROM post_tag pt JOIN tag tg ON tg.id = pt.tag_id
       WHERE pt.post_id = ANY($1)`,
      [postIds],
    );
    for (const tr of tagRows) {
      const pid = tr.post_id as number;
      if (!tagsMap[pid]) tagsMap[pid] = [];
      tagsMap[pid].push({ slug: tr.slug as string, name: tr.name as string });
    }
  }

  const hasNext = rows.length > limit;
  const items = rows.slice(0, limit);

  const posts: Post[] = items.map((r) => ({
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
    tags: tagsMap[r.id as number] || [],
  }));

  let nextCursor: string | null = null;
  if (hasNext && items.length > 0) {
    const last = items[items.length - 1];
    const sortAttr = SORT_ATTR_MAP[sort] || "external_created_at";
    nextCursor = encodeCursor({ v: last[sortAttr], id: last.id });
  }

  return {
    data: posts,
    meta: { has_next: hasNext, next_cursor: nextCursor },
  };
}

export async function queryPost(id: number): Promise<ApiResponse<Post>> {
  const rows = await sql(
    `SELECT p.id, p.title, p.body, p.source, p.subreddit, p.external_url,
            p.external_created_at, p.score, p.num_comments, p.post_type, p.sentiment
     FROM post p
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id],
  );

  if (rows.length === 0) {
    throw new Error("Post not found");
  }

  const r = rows[0];
  const tagRows = await sql(
    `SELECT tg.slug, tg.name
     FROM post_tag pt JOIN tag tg ON tg.id = pt.tag_id
     WHERE pt.post_id = $1`,
    [id],
  );

  return {
    data: {
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
      tags: tagRows.map((t) => ({
        slug: t.slug as string,
        name: t.name as string,
      })),
    },
  };
}
