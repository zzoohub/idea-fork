import { apiFetch } from "@/src/shared/api";
import type { Rating } from "@/src/shared/api";

const useDirectDB = process.env.DATA_SOURCE === "neon";

interface CreateRatingBody {
  is_positive: boolean;
  feedback?: string | null;
}

interface UpdateRatingBody {
  is_positive: boolean;
  feedback?: string | null;
}

export async function createRating(briefId: number, body: CreateRatingBody) {
  if (!Number.isInteger(briefId) || briefId <= 0) throw new Error("Invalid brief ID");

  if (useDirectDB) {
    const { mutateCreateRating } = await import("@/src/shared/db/queries/ratings");
    return mutateCreateRating({
      briefId,
      sessionId: getSessionId(),
      isPositive: body.is_positive,
      feedback: body.feedback,
    });
  }

  return apiFetch<Rating>(`/briefs/${briefId}/ratings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateRating(briefId: number, body: UpdateRatingBody) {
  if (!Number.isInteger(briefId) || briefId <= 0) throw new Error("Invalid brief ID");

  if (useDirectDB) {
    const { mutateUpdateRating } = await import("@/src/shared/db/queries/ratings");
    return mutateUpdateRating({
      briefId,
      sessionId: getSessionId(),
      isPositive: body.is_positive,
      feedback: body.feedback,
    });
  }

  return apiFetch<Rating>(`/briefs/${briefId}/ratings`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  const key = "idea_fork_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
