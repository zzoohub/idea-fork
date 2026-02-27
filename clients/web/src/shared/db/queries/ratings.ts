import { sql } from "../client";
import type { ApiResponse, Rating } from "@/src/shared/api/types";

interface CreateRatingInput {
  briefId: number;
  sessionId: string;
  isPositive: boolean;
  feedback?: string | null;
}

interface UpdateRatingInput {
  briefId: number;
  sessionId: string;
  isPositive: boolean;
  feedback?: string | null;
}

export async function mutateCreateRating(
  input: CreateRatingInput,
): Promise<ApiResponse<Rating>> {
  // Insert rating and update brief counter in a single transaction-like flow
  // Neon serverless doesn't support multi-statement transactions, so we use
  // two queries. The brief counter is eventually consistent.
  const rows = await sql(
    `INSERT INTO rating (brief_id, session_id, is_positive, feedback, created_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING id, brief_id, is_positive, feedback, created_at`,
    [input.briefId, input.sessionId, input.isPositive, input.feedback ?? null],
  );

  const r = rows[0];

  // Update denormalized counter
  if (input.isPositive) {
    await sql(
      `UPDATE brief SET upvote_count = upvote_count + 1 WHERE id = $1`,
      [input.briefId],
    );
  } else {
    await sql(
      `UPDATE brief SET downvote_count = downvote_count + 1 WHERE id = $1`,
      [input.briefId],
    );
  }

  return {
    data: {
      id: r.id as number,
      brief_id: r.brief_id as number,
      is_positive: r.is_positive as boolean,
      feedback: (r.feedback as string) ?? null,
      created_at: String(r.created_at),
    },
  };
}

export async function mutateUpdateRating(
  input: UpdateRatingInput,
): Promise<ApiResponse<Rating>> {
  // Fetch existing rating
  const existing = await sql(
    `SELECT id, is_positive FROM rating
     WHERE brief_id = $1 AND session_id = $2`,
    [input.briefId, input.sessionId],
  );

  if (existing.length === 0) {
    throw new Error("Rating not found");
  }

  const oldPositive = existing[0].is_positive as boolean;

  // Update rating
  const rows = await sql(
    `UPDATE rating SET is_positive = $1, feedback = $2
     WHERE brief_id = $3 AND session_id = $4
     RETURNING id, brief_id, is_positive, feedback, created_at`,
    [input.isPositive, input.feedback ?? null, input.briefId, input.sessionId],
  );

  const r = rows[0];

  // Adjust counters if vote flipped
  if (oldPositive !== input.isPositive) {
    if (input.isPositive) {
      await sql(
        `UPDATE brief SET upvote_count = upvote_count + 1, downvote_count = downvote_count - 1 WHERE id = $1`,
        [input.briefId],
      );
    } else {
      await sql(
        `UPDATE brief SET upvote_count = upvote_count - 1, downvote_count = downvote_count + 1 WHERE id = $1`,
        [input.briefId],
      );
    }
  }

  return {
    data: {
      id: r.id as number,
      brief_id: r.brief_id as number,
      is_positive: r.is_positive as boolean,
      feedback: (r.feedback as string) ?? null,
      created_at: String(r.created_at),
    },
  };
}
