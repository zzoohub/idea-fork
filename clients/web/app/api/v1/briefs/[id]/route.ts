import { queryBrief } from "@/src/shared/db/queries/briefs";
import { jsonResponse, errorResponse } from "../../_lib/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await queryBrief(id);
    return jsonResponse(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Brief not found") return errorResponse(404, "Not Found", msg);
    return errorResponse(500, "Error", msg);
  }
}
