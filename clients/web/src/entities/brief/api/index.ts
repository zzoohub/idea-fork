import { apiFetch } from "@/src/shared/api";
import type { BriefListItem, BriefDetail } from "@/src/shared/api";

interface FetchBriefsParams {
  sort?: string;
  cursor?: string;
  limit?: number;
}

export async function fetchBriefs(params?: FetchBriefsParams) {
  const sp = new URLSearchParams();
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.cursor) sp.set("cursor", params.cursor);
  if (params?.limit) sp.set("limit", String(params.limit));

  const qs = sp.toString();
  return apiFetch<BriefListItem[]>(`/briefs${qs ? `?${qs}` : ""}`);
}

export async function fetchBrief(slug: string) {
  return apiFetch<BriefDetail>(`/briefs/${encodeURIComponent(slug)}`);
}
