import { apiFetch } from "@/src/shared/api";
import type { ProductListItem, ProductDetail } from "@/src/shared/api";

const useDirectDB = process.env.DATA_SOURCE === "neon";

interface FetchProductsParams {
  category?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
  period?: string;
  q?: string;
}

export async function fetchProducts(params?: FetchProductsParams) {
  if (useDirectDB) {
    const { queryProducts } = await import("@/src/shared/db/queries/products");
    return queryProducts(params);
  }

  const sp = new URLSearchParams();
  if (params?.category) sp.set("category", params.category);
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.cursor) sp.set("cursor", params.cursor);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.period) sp.set("period", params.period);
  if (params?.q) sp.set("q", params.q);

  const qs = sp.toString();
  return apiFetch<ProductListItem[]>(`/products${qs ? `?${qs}` : ""}`);
}

export async function fetchProduct(slug: string) {
  if (useDirectDB) {
    const { queryProduct } = await import("@/src/shared/db/queries/products");
    return queryProduct(slug);
  }

  return apiFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
}
