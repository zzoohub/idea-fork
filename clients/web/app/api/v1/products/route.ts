import { type NextRequest } from "next/server";
import { queryProducts } from "@/src/shared/db/queries/products";
import { jsonResponse, errorResponse } from "../_lib/response";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const result = await queryProducts({
      category: sp.get("category") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      cursor: sp.get("cursor") ?? undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
      period: sp.get("period") ?? undefined,
      q: sp.get("q") ?? undefined,
    });
    return jsonResponse(result);
  } catch (e) {
    return errorResponse(500, "Error", (e as Error).message);
  }
}
