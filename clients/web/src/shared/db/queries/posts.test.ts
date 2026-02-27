import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSql = vi.fn();

vi.mock("@/src/shared/db/client", () => ({
  sql: mockSql,
}));

const { queryPosts, queryPost } = await import("./posts");

const FAKE_ROW = {
  id: 1,
  title: "App crashes",
  body: "It crashes on launch.",
  source: "reddit",
  subreddit: "techsupport",
  external_url: "https://reddit.com/1",
  external_created_at: "2026-01-01T00:00:00Z",
  score: 42,
  num_comments: 5,
  post_type: "complaint",
  sentiment: "negative",
};

const FAKE_TAG_ROW = { post_id: 1, slug: "crash", name: "Crash" };

describe("queryPosts", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns posts with tags and pagination meta", async () => {
    mockSql.mockResolvedValueOnce([FAKE_ROW]); // posts query
    mockSql.mockResolvedValueOnce([FAKE_TAG_ROW]); // tags query

    const result = await queryPosts();

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(1);
    expect(result.data[0].title).toBe("App crashes");
    expect(result.data[0].tags).toEqual([{ slug: "crash", name: "Crash" }]);
    expect(result.meta?.has_next).toBe(false);
    expect(result.meta?.next_cursor).toBeNull();
  });

  it("sets has_next true when rows exceed limit", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ ...FAKE_ROW, id: i + 1 }));
    mockSql.mockResolvedValueOnce(rows);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryPosts({ limit: 20 });

    expect(result.data).toHaveLength(20);
    expect(result.meta?.has_next).toBe(true);
    expect(result.meta?.next_cursor).toBeTruthy();
  });

  it("returns empty data for no results", async () => {
    mockSql.mockResolvedValueOnce([]);

    const result = await queryPosts();

    expect(result.data).toEqual([]);
    expect(result.meta?.has_next).toBe(false);
  });

  it("passes tag filter to SQL", async () => {
    mockSql.mockResolvedValueOnce([FAKE_ROW]);
    mockSql.mockResolvedValueOnce([FAKE_TAG_ROW]);

    await queryPosts({ tag: "crash" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("JOIN post_tag");
    expect(query).toContain("JOIN tag");
  });

  it("passes source filter to SQL", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryPosts({ source: "reddit" });

    const values = mockSql.mock.calls[0][1] as unknown[];
    expect(values).toContain("reddit");
  });

  it("passes sentiment filter to SQL", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryPosts({ sentiment: "negative" });

    const values = mockSql.mock.calls[0][1] as unknown[];
    expect(values).toContain("negative");
  });

  it("passes post_type filter to SQL", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryPosts({ post_type: "complaint" });

    const values = mockSql.mock.calls[0][1] as unknown[];
    expect(values).toContain("complaint");
  });

  it("passes full-text search query", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryPosts({ q: "crash bug" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("to_tsvector");
    expect(query).toContain("plainto_tsquery");
  });

  it("handles cursor pagination", async () => {
    mockSql.mockResolvedValueOnce([]);

    const cursor = Buffer.from(JSON.stringify({ v: "2026-01-01", id: 10 }))
      .toString("base64url")
      .replace(/=+$/, "");

    await queryPosts({ cursor });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("p.id <");
  });

  it("ignores invalid cursor", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryPosts({ cursor: "invalid!!!" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).not.toContain("p.id <");
  });

  it("handles null fields in post rows", async () => {
    const nullRow = {
      ...FAKE_ROW,
      body: null,
      subreddit: null,
      post_type: null,
      sentiment: null,
    };
    mockSql.mockResolvedValueOnce([nullRow]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryPosts();

    expect(result.data[0].body).toBeNull();
    expect(result.data[0].subreddit).toBeNull();
    expect(result.data[0].post_type).toBeNull();
    expect(result.data[0].sentiment).toBeNull();
    expect(result.data[0].tags).toEqual([]);
  });

  it("uses sort parameter for ordering", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryPosts({ sort: "-score" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("p.score DESC");
  });

  it("supports -num_comments sort", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryPosts({ sort: "-num_comments" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("p.num_comments DESC");
  });

  it("falls back to default sort for unknown sort value", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryPosts({ sort: "-unknown" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("p.external_created_at DESC");
  });

  it("builds next_cursor with correct sort attribute", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      ...FAKE_ROW,
      id: i + 1,
      score: 100 - i,
    }));
    mockSql.mockResolvedValueOnce(rows);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryPosts({ sort: "-score", limit: 2 });

    expect(result.meta?.has_next).toBe(true);
    expect(result.meta?.next_cursor).toBeTruthy();
  });

  it("uses fallback sort attr in cursor for unknown sort", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      ...FAKE_ROW,
      id: i + 1,
    }));
    mockSql.mockResolvedValueOnce(rows);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryPosts({ sort: "-unknown" as string, limit: 2 });

    expect(result.meta?.has_next).toBe(true);
    expect(result.meta?.next_cursor).toBeTruthy();
  });

  it("handles multiple tags for the same post", async () => {
    mockSql.mockResolvedValueOnce([FAKE_ROW]);
    mockSql.mockResolvedValueOnce([
      { post_id: 1, slug: "crash", name: "Crash" },
      { post_id: 1, slug: "bug", name: "Bug" },
    ]);

    const result = await queryPosts();

    expect(result.data[0].tags).toHaveLength(2);
  });
});

describe("queryPost", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns a single post with tags", async () => {
    mockSql.mockResolvedValueOnce([FAKE_ROW]);
    mockSql.mockResolvedValueOnce([{ slug: "crash", name: "Crash" }]);

    const result = await queryPost(1);

    expect(result.data.id).toBe(1);
    expect(result.data.title).toBe("App crashes");
    expect(result.data.tags).toEqual([{ slug: "crash", name: "Crash" }]);
  });

  it("throws when post not found", async () => {
    mockSql.mockResolvedValueOnce([]);

    await expect(queryPost(999)).rejects.toThrow("Post not found");
  });

  it("handles null fields in queryPost result", async () => {
    mockSql.mockResolvedValueOnce([{
      ...FAKE_ROW,
      body: null,
      subreddit: null,
      post_type: null,
      sentiment: null,
    }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await queryPost(1);

    expect(result.data.body).toBeNull();
    expect(result.data.subreddit).toBeNull();
    expect(result.data.post_type).toBeNull();
    expect(result.data.sentiment).toBeNull();
  });
});
