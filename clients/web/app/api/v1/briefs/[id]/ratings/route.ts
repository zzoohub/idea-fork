import { type NextRequest } from "next/server";
import { mutateCreateRating, mutateUpdateRating } from "@/src/shared/db/queries/ratings";
import { jsonResponse, errorResponse } from "../../../_lib/response";

function getSessionId(request: NextRequest): string {
  return request.headers.get("x-session-id") ?? "anonymous";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const briefId = Number(id);
    if (!Number.isInteger(briefId) || briefId <= 0) {
      return errorResponse(400, "Bad Request", "Invalid brief ID");
    }
    const body = await request.json();
    const result = await mutateCreateRating({
      briefId,
      sessionId: getSessionId(request),
      isPositive: body.is_positive,
      feedback: body.feedback ?? null,
    });
    return jsonResponse(result, 201);
  } catch (e) {
    return errorResponse(500, "Error", (e as Error).message);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const briefId = Number(id);
    if (!Number.isInteger(briefId) || briefId <= 0) {
      return errorResponse(400, "Bad Request", "Invalid brief ID");
    }
    const body = await request.json();
    const result = await mutateUpdateRating({
      briefId,
      sessionId: getSessionId(request),
      isPositive: body.is_positive,
      feedback: body.feedback ?? null,
    });
    return jsonResponse(result);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Rating not found") return errorResponse(404, "Not Found", msg);
    return errorResponse(500, "Error", msg);
  }
}
