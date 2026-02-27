import { sql } from "../client";
import { decodeCursor, encodeCursor } from "../pagination";
import type {
  ApiResponse,
  BriefListItem,
  BriefDetail,
} from "@/src/shared/api/types";

interface QueryBriefsParams {
  sort?: string;
  cursor?: string;
  limit?: number;
}

const SORT_COLUMN_MAP: Record<string, string> = {
  "-published_at": "published_at",
  "-upvote_count": "upvote_count",
  "-source_count": "source_count",
};

export async function queryBriefs(
  params?: QueryBriefsParams,
): Promise<ApiResponse<BriefListItem[]>> {
  const sort = params?.sort || "-published_at";
  const limit = params?.limit || 20;
  const sortCol = SORT_COLUMN_MAP[sort] || "published_at";

  const conditions: string[] = ["status = 'published'"];
  const values: unknown[] = [];
  let paramIdx = 0;

  const nextParam = () => `$${++paramIdx}`;

  if (params?.cursor) {
    const cv = decodeCursor(params.cursor);
    const cursorVal = cv.v;
    const cursorId = cv.id;
    if (cursorVal !== undefined && cursorId !== undefined) {
      const pv = nextParam();
      const pid = nextParam();
      conditions.push(
        `(${sortCol} < ${pv} OR (${sortCol} = ${pv} AND id < ${pid}))`,
      );
      values.push(cursorVal, cursorId);
    }
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const query = `
    SELECT id, slug, title, summary, status, published_at,
           source_count, upvote_count, downvote_count, demand_signals
    FROM brief
    ${whereClause}
    ORDER BY ${sortCol} DESC, id DESC
    LIMIT ${nextParam()}
  `;
  values.push(limit + 1);

  const rows = await sql(query, values);
  const hasNext = rows.length > limit;
  const items = rows.slice(0, limit);

  const briefs: BriefListItem[] = items.map((r) => ({
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

  let nextCursor: string | null = null;
  if (hasNext && items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = encodeCursor({ v: last[sortCol], id: last.id });
  }

  return {
    data: briefs,
    meta: { has_next: hasNext, next_cursor: nextCursor },
  };
}

export async function queryBrief(
  slug: string,
): Promise<ApiResponse<BriefDetail>> {
  const rows = await sql(
    `SELECT id, slug, title, summary, status, published_at,
            source_count, upvote_count, downvote_count, demand_signals,
            problem_statement, opportunity, solution_directions, source_snapshots
     FROM brief
     WHERE slug = $1 AND status = 'published'`,
    [slug],
  );

  if (rows.length === 0) {
    throw new Error("Brief not found");
  }

  const r = rows[0];
  return {
    data: {
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
      problem_statement: r.problem_statement as string,
      opportunity: r.opportunity as string,
      solution_directions: (r.solution_directions as string[]) ?? [],
      source_snapshots:
        (r.source_snapshots as Record<string, unknown>[]) ?? [],
    },
  };
}
