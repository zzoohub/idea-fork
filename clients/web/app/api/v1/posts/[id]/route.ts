import { queryPost } from "@/src/shared/db/queries/posts";
import { jsonResponse, errorResponse } from "../../_lib/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) {
      return errorResponse(400, "Bad Request", "Invalid post ID");
    }
    const result = await queryPost(numId);
    return jsonResponse(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Post not found") return errorResponse(404, "Not Found", msg);
    return errorResponse(500, "Error", msg);
  }
}
