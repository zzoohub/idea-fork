import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSql = vi.fn();

vi.mock("@/src/shared/db/client", () => ({
  sql: mockSql,
}));

const { queryBriefs, queryBrief } = await import("./briefs");

const FAKE_LIST_ROW = {
  id: 1,
  slug: "faster-checkout",
  title: "Users want faster checkout",
  summary: "Checkout is too slow.",
  status: "published",
  published_at: "2026-01-15T00:00:00Z",
  source_count: 89,
  upvote_count: 12,
  downvote_count: 2,
  demand_signals: { mentions: 89 },
};

const FAKE_DETAIL_ROW = {
  ...FAKE_LIST_ROW,
  problem_statement: "Checkout takes too long.",
  opportunity: "Fast checkout experience.",
  solution_directions: ["One-click checkout"],
  source_snapshots: [{ id: 1, title: "Slow checkout" }],
};

describe("queryBriefs", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns briefs with pagination meta", async () => {
    mockSql.mockResolvedValueOnce([FAKE_LIST_ROW]);

    const result = await queryBriefs();

    expect(result.data).toHaveLength(1);
    expect(result.data[0].slug).toBe("faster-checkout");
    expect(result.meta?.has_next).toBe(false);
  });

  it("sets has_next true when rows exceed limit", async () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ ...FAKE_LIST_ROW, id: i + 1 }));
    mockSql.mockResolvedValueOnce(rows);

    const result = await queryBriefs({ limit: 5 });

    expect(result.data).toHaveLength(5);
    expect(result.meta?.has_next).toBe(true);
  });

  it("applies sort parameter", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryBriefs({ sort: "-upvote_count" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("upvote_count DESC");
  });

  it("handles cursor pagination", async () => {
    mockSql.mockResolvedValueOnce([]);

    const cursor = Buffer.from(JSON.stringify({ v: "2026-01-01", id: 5 }))
      .toString("base64url")
      .replace(/=+$/, "");

    await queryBriefs({ cursor });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("id <");
  });

  it("ignores invalid cursor", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryBriefs({ cursor: "invalid!!!" });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).not.toContain("id <");
  });

  it("handles null published_at in rows", async () => {
    mockSql.mockResolvedValueOnce([{ ...FAKE_LIST_ROW, published_at: null }]);

    const result = await queryBriefs();

    expect(result.data[0].published_at).toBeNull();
  });

  it("handles null demand_signals in rows", async () => {
    mockSql.mockResolvedValueOnce([{ ...FAKE_LIST_ROW, demand_signals: null }]);

    const result = await queryBriefs();

    expect(result.data[0].demand_signals).toEqual({});
  });

  it("defaults to -published_at sort", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryBriefs();

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("published_at DESC");
  });

  it("falls back to published_at for unknown sort value", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryBriefs({ sort: "-unknown" as string });

    const query = mockSql.mock.calls[0][0] as string;
    expect(query).toContain("published_at DESC");
  });
});

describe("queryBrief", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns a brief detail", async () => {
    mockSql.mockResolvedValueOnce([FAKE_DETAIL_ROW]);

    const result = await queryBrief("faster-checkout");

    expect(result.data.slug).toBe("faster-checkout");
    expect(result.data.problem_statement).toBe("Checkout takes too long.");
    expect(result.data.solution_directions).toEqual(["One-click checkout"]);
  });

  it("throws when brief not found", async () => {
    mockSql.mockResolvedValueOnce([]);

    await expect(queryBrief("nonexistent")).rejects.toThrow("Brief not found");
  });

  it("passes slug parameter to SQL", async () => {
    mockSql.mockResolvedValueOnce([FAKE_DETAIL_ROW]);

    await queryBrief("test-slug");

    const values = mockSql.mock.calls[0][1] as unknown[];
    expect(values).toContain("test-slug");
  });

  it("handles null optional fields", async () => {
    mockSql.mockResolvedValueOnce([{
      ...FAKE_DETAIL_ROW,
      published_at: null,
      demand_signals: null,
      solution_directions: null,
      source_snapshots: null,
    }]);

    const result = await queryBrief("test");

    expect(result.data.published_at).toBeNull();
    expect(result.data.demand_signals).toEqual({});
    expect(result.data.solution_directions).toEqual([]);
    expect(result.data.source_snapshots).toEqual([]);
  });
});
