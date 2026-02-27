import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSql = vi.fn();

vi.mock("@/src/shared/db/client", () => ({
  sql: mockSql,
}));

const { queryProducts, queryProduct } = await import("./products");

const FAKE_PRODUCT_ROW = {
  id: 1,
  slug: "acme-app",
  name: "Acme App",
  source: "producthunt",
  tagline: "Simple CRM",
  description: "The best CRM.",
  url: "https://acme.com",
  image_url: "https://acme.com/logo.png",
  category: "productivity",
  launched_at: "2026-01-15T00:00:00Z",
  signal_count: 42,
  trending_score: "0.9000",
  sources: ["producthunt", "reddit"],
};

describe("queryProducts", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns products with tags and pagination", async () => {
    mockSql.mockResolvedValueOnce([FAKE_PRODUCT_ROW]); // products query
    mockSql.mockResolvedValueOnce([
      { product_id: 1, id: 10, slug: "crm", name: "CRM" },
    ]); // tags query

    const result = await queryProducts();

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("Acme App");
    expect(result.data[0].trending_score).toBe(0.9);
    expect(result.data[0].sources).toEqual(["producthunt", "reddit"]);
    expect(result.data[0].tags).toEqual([{ id: 10, slug: "crm", name: "CRM" }]);
    expect(result.meta?.has_next).toBe(false);
  });

  it("sets has_next when rows exceed limit", async () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      ...FAKE_PRODUCT_ROW,
      id: i + 1,
    }));
    mockSql.mockResolvedValueOnce(rows);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProducts({ limit: 5 });

    expect(result.data).toHaveLength(5);
    expect(result.meta?.has_next).toBe(true);
  });

  it("uses source as sources fallback when sources is null", async () => {
    mockSql.mockResolvedValueOnce([{ ...FAKE_PRODUCT_ROW, sources: null }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProducts();

    expect(result.data[0].sources).toEqual(["producthunt"]);
  });

  it("applies category filter", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProducts({ category: "ai" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("category =");
  });

  it("applies search filter", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProducts({ q: "acme" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("ILIKE");
  });

  it("applies period filter", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProducts({ period: "7d" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("7 days");
  });

  it("ignores invalid period", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProducts({ period: "invalid" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).not.toContain("interval");
  });

  it("handles cursor pagination", async () => {
    mockSql.mockResolvedValueOnce([]);

    const cursor = Buffer.from(JSON.stringify({ v: 0.9, id: 10 }))
      .toString("base64url")
      .replace(/=+$/, "");

    await queryProducts({ cursor });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("g.trending_score <");
  });

  it("handles nullable sort cursor (launched_at)", async () => {
    mockSql.mockResolvedValueOnce([]);

    const cursor = Buffer.from(JSON.stringify({ id: 10 }))
      .toString("base64url")
      .replace(/=+$/, "");

    await queryProducts({ sort: "-launched_at", cursor });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("IS NULL");
  });

  it("ignores invalid cursor", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProducts({ cursor: "invalid!!!" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).not.toContain("g.trending_score <");
  });

  it("handles null optional fields in rows", async () => {
    const nullRow = {
      ...FAKE_PRODUCT_ROW,
      description: null,
      tagline: null,
      url: null,
      image_url: null,
      category: null,
      source: null,
      launched_at: null,
      sources: null,
    };
    mockSql.mockResolvedValueOnce([nullRow]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProducts();

    expect(result.data[0].description).toBeNull();
    expect(result.data[0].tagline).toBeNull();
    expect(result.data[0].source).toBeNull();
    expect(result.data[0].launched_at).toBeNull();
  });

  it("falls back to default sort for unknown sort value", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProducts({ sort: "-unknown" as string });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("trending_score DESC");
  });

  it("handles multiple tags for same product", async () => {
    mockSql.mockResolvedValueOnce([FAKE_PRODUCT_ROW]);
    mockSql.mockResolvedValueOnce([
      { product_id: 1, id: 10, slug: "crm", name: "CRM" },
      { product_id: 1, id: 11, slug: "saas", name: "SaaS" },
    ]);

    const result = await queryProducts();

    expect(result.data[0].tags).toHaveLength(2);
  });

  it("uses NULLS LAST for launched_at sort", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProducts({ sort: "-launched_at" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("NULLS LAST");
  });

  it("combines multiple filters", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProducts({ category: "ai", q: "test", period: "30d" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("category =");
    expect(query).toContain("ILIKE");
    expect(query).toContain("30 days");
  });
});

describe("queryProduct", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns product detail with posts, metrics, and related briefs", async () => {
    mockSql.mockResolvedValueOnce([FAKE_PRODUCT_ROW]); // product
    mockSql.mockResolvedValueOnce([{ sources: ["producthunt"] }]); // sources
    mockSql.mockResolvedValueOnce([{ id: 10, slug: "crm", name: "CRM" }]); // tags
    mockSql.mockResolvedValueOnce([
      {
        id: 100,
        title: "Post",
        body: null,
        source: "reddit",
        subreddit: null,
        external_url: "https://reddit.com/1",
        external_created_at: "2026-01-20",
        score: 5,
        post_type: null,
        sentiment: "negative",
      },
    ]); // posts
    mockSql.mockResolvedValueOnce([{ total: 10, negative: 3, positive: 7 }]); // metrics
    mockSql.mockResolvedValueOnce([{
      id: 50, slug: "related-brief", title: "Related", summary: "A brief", source_count: 3,
    }]); // related briefs

    const result = await queryProduct("acme-app");

    expect(result.data.name).toBe("Acme App");
    expect(result.data.sources).toEqual(["producthunt"]);
    expect(result.data.tags).toEqual([{ id: 10, slug: "crm", name: "CRM" }]);
    expect(result.data.posts).toHaveLength(1);
    expect(result.data.metrics?.total_mentions).toBe(10);
    expect(result.data.metrics?.sentiment_score).toBe(70);
    expect(result.data.related_briefs).toHaveLength(1);
    expect(result.data.related_briefs[0].slug).toBe("related-brief");
  });

  it("throws when product not found", async () => {
    mockSql.mockResolvedValueOnce([]);

    await expect(queryProduct("nonexistent")).rejects.toThrow("Product not found");
  });

  it("handles zero positive+negative for sentiment score", async () => {
    mockSql.mockResolvedValueOnce([FAKE_PRODUCT_ROW]);
    mockSql.mockResolvedValueOnce([{ sources: ["producthunt"] }]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{ total: 0, negative: 0, positive: 0 }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProduct("acme-app");

    expect(result.data.metrics?.sentiment_score).toBe(0);
  });

  it("uses source as sources fallback when sources aggregation is null", async () => {
    mockSql.mockResolvedValueOnce([FAKE_PRODUCT_ROW]);
    mockSql.mockResolvedValueOnce([{ sources: null }]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{ total: 0, negative: 0, positive: 0 }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProduct("acme-app");

    expect(result.data.sources).toEqual(["producthunt"]);
  });

  it("handles null optional fields in product detail", async () => {
    const nullProduct = {
      ...FAKE_PRODUCT_ROW,
      description: null,
      tagline: null,
      url: null,
      image_url: null,
      category: null,
      source: null,
      launched_at: null,
    };
    mockSql.mockResolvedValueOnce([nullProduct]);
    mockSql.mockResolvedValueOnce([{ sources: ["producthunt"] }]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{ total: 0, negative: 0, positive: 0 }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProduct("acme-app");

    expect(result.data.description).toBeNull();
    expect(result.data.tagline).toBeNull();
    expect(result.data.launched_at).toBeNull();
  });

  it("handles null metrics row", async () => {
    mockSql.mockResolvedValueOnce([FAKE_PRODUCT_ROW]);
    mockSql.mockResolvedValueOnce([{ sources: ["producthunt"] }]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{ total: null, negative: null, positive: null }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProduct("acme-app");

    expect(result.data.metrics?.total_mentions).toBe(0);
  });

  it("handles posts with null optional fields", async () => {
    mockSql.mockResolvedValueOnce([FAKE_PRODUCT_ROW]);
    mockSql.mockResolvedValueOnce([{ sources: ["producthunt"] }]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{
      id: 100,
      title: "Post",
      body: null,
      source: "reddit",
      subreddit: null,
      external_url: "https://reddit.com/1",
      external_created_at: "2026-01-20",
      score: 5,
      post_type: null,
      sentiment: null,
    }]);
    mockSql.mockResolvedValueOnce([{ total: 1, negative: 0, positive: 0 }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProduct("acme-app");

    expect(result.data.posts[0].body).toBeNull();
    expect(result.data.posts[0].subreddit).toBeNull();
    expect(result.data.posts[0].post_type).toBeNull();
    expect(result.data.posts[0].sentiment).toBeNull();
  });

  it("trims posts to limit and sets has_next", async () => {
    const manyPosts = Array.from({ length: 11 }, (_, i) => ({
      id: i + 1,
      title: `Post ${i}`,
      body: null,
      source: "reddit",
      subreddit: null,
      external_url: "https://reddit.com/1",
      external_created_at: "2026-01-20",
      score: 5,
      post_type: null,
      sentiment: null,
    }));
    mockSql.mockResolvedValueOnce([FAKE_PRODUCT_ROW]);
    mockSql.mockResolvedValueOnce([{ sources: ["producthunt"] }]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce(manyPosts);
    mockSql.mockResolvedValueOnce([{ total: 11, negative: 0, positive: 0 }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryProduct("acme-app");

    expect(result.data.posts).toHaveLength(10);
    expect(result.meta?.has_next).toBe(true);
  });
});
