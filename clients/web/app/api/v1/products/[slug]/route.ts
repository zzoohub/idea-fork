import { queryProduct } from "@/src/shared/db/queries/products";
import { jsonResponse, errorResponse } from "../../_lib/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const result = await queryProduct(slug);
    return jsonResponse(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Product not found")
      return errorResponse(404, "Not Found", msg);
    return errorResponse(500, "Error", msg);
  }
}
