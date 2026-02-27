import { type NextRequest } from "next/server";
import { queryPosts } from "@/src/shared/db/queries/posts";
import { jsonResponse, errorResponse } from "../_lib/response";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const result = await queryPosts({
      tag: sp.get("tag") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      cursor: sp.get("cursor") ?? undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
      source: sp.get("source") ?? undefined,
      sentiment: sp.get("sentiment") ?? undefined,
      post_type: sp.get("post_type") ?? undefined,
      q: sp.get("q") ?? undefined,
    });
    return jsonResponse(result);
  } catch (e) {
    return errorResponse(500, "Error", (e as Error).message);
  }
}
