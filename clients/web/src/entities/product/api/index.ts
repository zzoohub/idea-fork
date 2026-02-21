import { apiFetch } from "@/src/shared/api";
import type { ProductListItem, ProductDetail } from "@/src/shared/api";

interface FetchProductsParams {
  category?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
}

export async function fetchProducts(params?: FetchProductsParams) {
  const sp = new URLSearchParams();
  if (params?.category) sp.set("category", params.category);
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.cursor) sp.set("cursor", params.cursor);
  if (params?.limit) sp.set("limit", String(params.limit));

  const qs = sp.toString();
  return apiFetch<ProductListItem[]>(`/products${qs ? `?${qs}` : ""}`);
}

export async function fetchProduct(slug: string) {
  return apiFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
}
