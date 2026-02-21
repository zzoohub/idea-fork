import { apiFetch } from "@/src/shared/api";
import type { Rating } from "@/src/shared/api";

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
  return apiFetch<Rating>(`/briefs/${briefId}/ratings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateRating(briefId: number, body: UpdateRatingBody) {
  if (!Number.isInteger(briefId) || briefId <= 0) throw new Error("Invalid brief ID");
  return apiFetch<Rating>(`/briefs/${briefId}/ratings`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
