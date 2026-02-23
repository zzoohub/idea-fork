import { apiFetch } from "@/src/shared/api";
import type { Post } from "@/src/shared/api";

interface FetchPostsParams {
  tag?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
  source?: string;
  sentiment?: string;
  post_type?: string;
  q?: string;
}

export async function fetchPosts(params?: FetchPostsParams) {
  const sp = new URLSearchParams();
  if (params?.tag) sp.set("tag", params.tag);
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.cursor) sp.set("cursor", params.cursor);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.source) sp.set("source", params.source);
  if (params?.sentiment) sp.set("sentiment", params.sentiment);
  if (params?.post_type) sp.set("post_type", params.post_type);
  if (params?.q) sp.set("q", params.q);

  const qs = sp.toString();
  return apiFetch<Post[]>(`/posts${qs ? `?${qs}` : ""}`);
}

export async function fetchPost(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid post ID");
  return apiFetch<Post>(`/posts/${id}`);
}
