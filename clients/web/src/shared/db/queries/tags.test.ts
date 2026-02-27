import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSql = vi.fn();

vi.mock("@/src/shared/db/client", () => ({
  sql: mockSql,
}));

const { queryTrendingTags, queryProductTags } = await import("./tags");

const FAKE_TAG_ROW = { id: 1, slug: "crash", name: "Crash", post_count: 42 };

describe("queryTrendingTags", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns tags from query", async () => {
    mockSql.mockResolvedValueOnce([FAKE_TAG_ROW]);

    const result = await queryTrendingTags();

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({ id: 1, slug: "crash", name: "Crash" });
  });

  it("passes limit to SQL", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryTrendingTags(30);

    const values = mockSql.mock.calls[0][1] as unknown[];
    expect(values).toContain(30);
  });

  it("uses default limit of 60", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryTrendingTags();

    const values = mockSql.mock.calls[0][1] as unknown[];
    expect(values).toContain(60);
  });

  it("returns empty data for no results", async () => {
    mockSql.mockResolvedValueOnce([]);

    const result = await queryTrendingTags();

    expect(result.data).toEqual([]);
  });
});

describe("queryProductTags", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("returns tags from query", async () => {
    mockSql.mockResolvedValueOnce([{ id: 2, slug: "ux", name: "UX", product_count: 10 }]);

    const result = await queryProductTags();

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({ id: 2, slug: "ux", name: "UX" });
  });

  it("passes days and limit to SQL", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProductTags(14, 30);

    const values = mockSql.mock.calls[0][1] as unknown[];
    expect(values).toContain(14);
    expect(values).toContain(30);
  });

  it("uses default days=7, limit=20", async () => {
    mockSql.mockResolvedValueOnce([]);

    await queryProductTags();

    const values = mockSql.mock.calls[0][1] as unknown[];
    expect(values).toContain(7);
    expect(values).toContain(20);
  });
});
