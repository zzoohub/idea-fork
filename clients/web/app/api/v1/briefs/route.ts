import { type NextRequest } from "next/server";
import { queryBriefs } from "@/src/shared/db/queries/briefs";
import { jsonResponse, errorResponse } from "../_lib/response";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const result = await queryBriefs({
      sort: sp.get("sort") ?? undefined,
      cursor: sp.get("cursor") ?? undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    });
    return jsonResponse(result);
  } catch (e) {
    return errorResponse(500, "Error", (e as Error).message);
  }
}
