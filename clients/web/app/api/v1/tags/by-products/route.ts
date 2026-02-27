import { type NextRequest } from "next/server";
import { queryProductTags } from "@/src/shared/db/queries/tags";
import { jsonResponse, errorResponse } from "../../_lib/response";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const days = Number(sp.get("days") ?? "7");
    const limit = Number(sp.get("limit") ?? "20");
    const tags = await queryProductTags(days, limit);
    return jsonResponse(tags);
  } catch (e) {
    return errorResponse(500, "Error", (e as Error).message);
  }
}
