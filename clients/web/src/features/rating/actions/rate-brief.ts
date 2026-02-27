"use server";

import {
  mutateCreateRating,
  mutateUpdateRating,
} from "@/src/shared/db/queries/ratings";
import type { ApiResponse, Rating } from "@/src/shared/api/types";

export async function createBriefRating(
  briefId: number,
  sessionId: string,
  isPositive: boolean,
  feedback?: string | null,
): Promise<ApiResponse<Rating>> {
  return mutateCreateRating({ briefId, sessionId, isPositive, feedback });
}

export async function updateBriefRating(
  briefId: number,
  sessionId: string,
  isPositive: boolean,
  feedback?: string | null,
): Promise<ApiResponse<Rating>> {
  return mutateUpdateRating({ briefId, sessionId, isPositive, feedback });
}
