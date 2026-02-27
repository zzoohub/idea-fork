import { apiFetch } from "@/src/shared/api";
import type { BriefListItem, BriefDetail } from "@/src/shared/api";

const useDirectDB = process.env.DATA_SOURCE === "neon";

interface FetchBriefsParams {
  sort?: string;
  cursor?: string;
  limit?: number;
}

export async function fetchBriefs(params?: FetchBriefsParams) {
  if (useDirectDB) {
    const { queryBriefs } = await import("@/src/shared/db/queries/briefs");
    return queryBriefs(params);
  }

  const sp = new URLSearchParams();
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.cursor) sp.set("cursor", params.cursor);
  if (params?.limit) sp.set("limit", String(params.limit));

  const qs = sp.toString();
  return apiFetch<BriefListItem[]>(`/briefs${qs ? `?${qs}` : ""}`);
}

export async function fetchBrief(slug: string) {
  if (useDirectDB) {
    const { queryBrief } = await import("@/src/shared/db/queries/briefs");
    return queryBrief(slug);
  }

  return apiFetch<BriefDetail>(`/briefs/${encodeURIComponent(slug)}`);
}
