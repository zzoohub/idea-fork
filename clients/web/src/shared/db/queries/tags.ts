import { sql } from "../client";
import type { ApiResponse, Tag } from "@/src/shared/api/types";

export async function queryTrendingTags(
  limit: number = 60,
): Promise<ApiResponse<Tag[]>> {
  const rows = await sql(
    `SELECT tg.id, tg.slug, tg.name, COUNT(pt.post_id) AS post_count
     FROM tag tg
     JOIN post_tag pt ON pt.tag_id = tg.id
     JOIN post p ON p.id = pt.post_id
     WHERE p.external_created_at >= now() - interval '7 days'
       AND p.deleted_at IS NULL
     GROUP BY tg.id
     ORDER BY COUNT(pt.post_id) DESC
     LIMIT $1`,
    [limit],
  );

  return {
    data: rows.map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      name: r.name as string,
    })),
  };
}

export async function queryProductTags(
  days: number = 7,
  limit: number = 20,
): Promise<ApiResponse<Tag[]>> {
  const rows = await sql(
    `SELECT tg.id, tg.slug, tg.name, COUNT(prt.product_id) AS product_count
     FROM tag tg
     JOIN product_tag prt ON prt.tag_id = tg.id
     JOIN product pr ON pr.id = prt.product_id
     WHERE pr.created_at >= now() - interval '1 day' * $1
     GROUP BY tg.id
     ORDER BY COUNT(prt.product_id) DESC
     LIMIT $2`,
    [days, limit],
  );

  return {
    data: rows.map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      name: r.name as string,
    })),
  };
}
