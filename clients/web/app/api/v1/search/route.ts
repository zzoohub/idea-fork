import { type NextRequest } from "next/server";
import { querySearch } from "@/src/shared/db/queries/search";
import { jsonResponse, errorResponse } from "../_lib/response";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    if (!q) {
      return jsonResponse({ posts: [], briefs: [], products: [] });
    }
    const limit = Number(
      request.nextUrl.searchParams.get("limit") ?? "10",
    );
    const result = await querySearch(q, limit);
    return jsonResponse(result);
  } catch (e) {
    return errorResponse(500, "Error", (e as Error).message);
  }
}
