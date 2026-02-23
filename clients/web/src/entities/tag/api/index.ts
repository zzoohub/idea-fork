import { apiFetch } from "@/src/shared/api";
import type { Tag } from "@/src/shared/api";

export async function fetchTags() {
  return apiFetch<Tag[]>("/tags/trending?limit=60");
}
