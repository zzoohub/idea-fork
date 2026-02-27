import { type NextRequest } from "next/server";
import { queryTrendingTags } from "@/src/shared/db/queries/tags";
import { jsonResponse, errorResponse } from "../../_lib/response";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "60");
    const tags = await queryTrendingTags(limit);
    return jsonResponse(tags);
  } catch (e) {
    return errorResponse(500, "Error", (e as Error).message);
  }
}
