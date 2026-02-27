import { apiFetch } from "@/src/shared/api";
import type { Tag } from "@/src/shared/api";

const useDirectDB = process.env.DATA_SOURCE === "neon";

export async function fetchTags() {
  if (useDirectDB) {
    const { queryTrendingTags } = await import("@/src/shared/db/queries/tags");
    return queryTrendingTags(60);
  }

  return apiFetch<Tag[]>("/tags/trending?limit=60");
}

export async function fetchProductTags() {
  if (useDirectDB) {
    const { queryProductTags } = await import("@/src/shared/db/queries/tags");
    return queryProductTags(7, 20);
  }

  return apiFetch<Tag[]>("/tags/by-products?days=7&limit=20");
}
