import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ApiResponse, ProductListItem, ProductDetail } from "@/src/shared/api";

const mockApiFetch = vi.fn<(path: string, options?: RequestInit) => Promise<ApiResponse<ProductListItem[] | ProductDetail>>
>();

vi.mock("@/src/shared/api", () => ({
  apiFetch: mockApiFetch,
}));

const { fetchProducts, fetchProduct } = await import("./index");

const FAKE_PRODUCT_LIST_ITEM: ProductListItem = {
  id: 1,
  slug: "acme-app",
  name: "Acme App",
  description: "The best app.",
  url: "https://acme.com",
  image_url: "https://acme.com/logo.png",
  category: "productivity",
  complaint_count: 42,
  trending_score: 0.9,
};

const FAKE_PRODUCT_DETAIL: ProductDetail = {
  ...FAKE_PRODUCT_LIST_ITEM,
  posts: [
    {
      id: 10,
      title: "Acme crashes",
      body: "It crashes constantly.",
      source: "reddit",
      subreddit: "productivity",
      external_url: "https://reddit.com/r/productivity/10",
      external_created_at: "2026-01-20T00:00:00Z",
      score: 5,
      post_type: "complaint",
      sentiment: "negative",
    },
  ],
};

describe("fetchProducts", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: [FAKE_PRODUCT_LIST_ITEM] });
  });

  describe("with no params", () => {
    it("calls apiFetch with /products (no query string)", async () => {
      await fetchProducts();
      expect(mockApiFetch).toHaveBeenCalledWith("/products");
    });

    it("returns the response from apiFetch", async () => {
      const result = await fetchProducts();
      expect(result).toEqual({ data: [FAKE_PRODUCT_LIST_ITEM] });
    });
  });

  describe("with an empty params object", () => {
    it("calls apiFetch with /products (no query string)", async () => {
      await fetchProducts({});
      expect(mockApiFetch).toHaveBeenCalledWith("/products");
    });
  });

  describe("category param", () => {
    it("appends category to query string", async () => {
      await fetchProducts({ category: "productivity" });
      expect(mockApiFetch).toHaveBeenCalledWith("/products?category=productivity");
    });

    it("does not append category when not provided", async () => {
      await fetchProducts({ sort: "trending" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("category=");
    });
  });

  describe("sort param", () => {
    it("appends sort to query string", async () => {
      await fetchProducts({ sort: "trending" });
      expect(mockApiFetch).toHaveBeenCalledWith("/products?sort=trending");
    });
  });

  describe("cursor param", () => {
    it("appends cursor to query string", async () => {
      await fetchProducts({ cursor: "cursor42" });
      expect(mockApiFetch).toHaveBeenCalledWith("/products?cursor=cursor42");
    });
  });

  describe("limit param", () => {
    it("appends limit to query string as string", async () => {
      await fetchProducts({ limit: 25 });
      expect(mockApiFetch).toHaveBeenCalledWith("/products?limit=25");
    });
  });

  describe("multiple params", () => {
    it("appends all provided params", async () => {
      await fetchProducts({ category: "saas", sort: "new", cursor: "p2", limit: 10 });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("category=saas");
      expect(url).toContain("sort=new");
      expect(url).toContain("cursor=p2");
      expect(url).toContain("limit=10");
    });

    it("starts the query string with '?'", async () => {
      await fetchProducts({ category: "saas" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/products\?/);
    });
  });
});

describe("fetchProduct", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: FAKE_PRODUCT_DETAIL });
  });

  it("calls apiFetch with /products/:slug", async () => {
    await fetchProduct("acme-app");
    expect(mockApiFetch).toHaveBeenCalledWith("/products/acme-app");
  });

  it("returns the response from apiFetch", async () => {
    const result = await fetchProduct("acme-app");
    expect(result).toEqual({ data: FAKE_PRODUCT_DETAIL });
  });

  it("URI-encodes the slug", async () => {
    await fetchProduct("my product");
    expect(mockApiFetch).toHaveBeenCalledWith("/products/my%20product");
  });

  it("URI-encodes special characters in the slug", async () => {
    await fetchProduct("a/b/c");
    expect(mockApiFetch).toHaveBeenCalledWith("/products/a%2Fb%2Fc");
  });
});
