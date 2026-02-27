import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSql = vi.fn();

vi.mock("@/src/shared/db/client", () => ({
  sql: mockSql,
}));

const { querySearch } = await import("./search");

describe("querySearch", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns posts, briefs, and products", async () => {
    // Posts query
    mockSql.mockResolvedValueOnce([
      {
        id: 1,
        title: "Crash bug",
        body: null,
        source: "reddit",
        subreddit: null,
        external_url: "https://reddit.com/1",
        external_created_at: "2026-01-01",
        score: 10,
        num_comments: 2,
        post_type: null,
        sentiment: "negative",
      },
    ]);
    // Post tags
    mockSql.mockResolvedValueOnce([{ post_id: 1, slug: "bug", name: "Bug" }]);
    // Briefs query
    mockSql.mockResolvedValueOnce([
      {
        id: 2,
        slug: "crash-fix",
        title: "Fix crashes",
        summary: "Users report crashes.",
        status: "published",
        published_at: "2026-01-15",
        source_count: 5,
        upvote_count: 3,
        downvote_count: 0,
        demand_signals: {},
      },
    ]);
    // Products query
    mockSql.mockResolvedValueOnce([
      {
        id: 3,
        slug: "crash-tool",
        name: "CrashTool",
        source: "producthunt",
        tagline: "Fix crashes",
        description: null,
        url: null,
        image_url: null,
        category: null,
        launched_at: null,
        signal_count: 1,
        trending_score: "0.5",
      },
    ]);
    // Product tags
    mockSql.mockResolvedValueOnce([]);

    const result = await querySearch("crash");

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].tags).toEqual([{ slug: "bug", name: "Bug" }]);
    expect(result.briefs).toHaveLength(1);
    expect(result.briefs[0].slug).toBe("crash-fix");
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("CrashTool");
  });

  it("returns empty arrays when no results", async () => {
    mockSql.mockResolvedValueOnce([]); // posts
    // No post tags query since postIds is empty
    mockSql.mockResolvedValueOnce([]); // briefs
    mockSql.mockResolvedValueOnce([]); // products

    const result = await querySearch("nonexistent");

    expect(result.posts).toEqual([]);
    expect(result.briefs).toEqual([]);
    expect(result.products).toEqual([]);
  });

  it("passes limit to SQL", async () => {
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);

    await querySearch("test", 5);

    const postsValues = mockSql.mock.calls[0][1] as unknown[];
    expect(postsValues).toContain(5);
  });

  it("handles null optional fields in results", async () => {
    mockSql.mockResolvedValueOnce([{
      id: 1, title: "Post", body: null, source: "reddit", subreddit: null,
      external_url: "https://reddit.com/1", external_created_at: "2026-01-01",
      score: 0, num_comments: 0, post_type: null, sentiment: null,
    }]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{
      id: 2, slug: "brief", title: "Brief", summary: "Summary",
      status: "published", published_at: null, source_count: 0,
      upvote_count: 0, downvote_count: 0, demand_signals: null,
    }]);
    mockSql.mockResolvedValueOnce([{
      id: 3, slug: "prod", name: "Prod", source: "producthunt",
      tagline: null, description: null, url: null, image_url: null,
      category: null, launched_at: null, signal_count: 0,
      trending_score: "0",
    }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await querySearch("test");

    expect(result.posts[0].body).toBeNull();
    expect(result.posts[0].tags).toEqual([]);
    expect(result.briefs[0].published_at).toBeNull();
    expect(result.briefs[0].demand_signals).toEqual({});
    expect(result.products[0].tagline).toBeNull();
    expect(result.products[0].tags).toEqual([]);
  });

  it("loads product tags when products found", async () => {
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{
      id: 3, slug: "prod", name: "Prod", source: "producthunt",
      tagline: "Tag", description: null, url: null, image_url: null,
      category: null, launched_at: "2026-01-01", signal_count: 0,
      trending_score: "0.5",
    }]);
    mockSql.mockResolvedValueOnce([
      { product_id: 3, id: 10, slug: "ai", name: "AI" },
      { product_id: 3, id: 11, slug: "ml", name: "ML" },
    ]);

    const result = await querySearch("prod");

    expect(result.products[0].tags).toHaveLength(2);
    expect(result.products[0].launched_at).toBe("2026-01-01");
  });

  it("handles null source in product rows", async () => {
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{
      id: 3, slug: "prod", name: "Prod", source: null,
      tagline: null, description: null, url: null, image_url: null,
      category: null, launched_at: null, signal_count: 0,
      trending_score: "0",
    }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await querySearch("prod");

    expect(result.products[0].source).toBeNull();
  });

  it("handles multiple tags for same post", async () => {
    mockSql.mockResolvedValueOnce([{
      id: 1, title: "Post", body: null, source: "reddit", subreddit: null,
      external_url: "https://reddit.com/1", external_created_at: "2026-01-01",
      score: 0, num_comments: 0, post_type: null, sentiment: null,
    }]);
    mockSql.mockResolvedValueOnce([
      { post_id: 1, slug: "bug", name: "Bug" },
      { post_id: 1, slug: "crash", name: "Crash" },
    ]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);

    const result = await querySearch("post");

    expect(result.posts[0].tags).toHaveLength(2);
  });
});
