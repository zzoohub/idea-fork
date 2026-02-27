import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSql = vi.fn();

vi.mock("@/src/shared/db/client", () => ({
  sql: mockSql,
}));

const { mutateCreateRating, mutateUpdateRating } = await import("./ratings");

const FAKE_RATING_ROW = {
  id: 1,
  brief_id: 42,
  is_positive: true,
  feedback: null,
  created_at: "2026-02-22T10:00:00Z",
};

describe("mutateCreateRating", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("inserts a rating and updates upvote counter", async () => {
    mockSql.mockResolvedValueOnce([FAKE_RATING_ROW]); // INSERT
    mockSql.mockResolvedValueOnce([]); // UPDATE brief

    const result = await mutateCreateRating({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: true,
    });

    expect(result.data.id).toBe(1);
    expect(result.data.brief_id).toBe(42);
    expect(result.data.is_positive).toBe(true);

    // Check that upvote counter was incremented
    const updateQuery = mockSql.mock.calls[1][0] as string;
    expect(updateQuery).toContain("upvote_count = upvote_count + 1");
  });

  it("updates downvote counter for negative rating", async () => {
    mockSql.mockResolvedValueOnce([{ ...FAKE_RATING_ROW, is_positive: false }]);
    mockSql.mockResolvedValueOnce([]);

    await mutateCreateRating({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: false,
    });

    const updateQuery = mockSql.mock.calls[1][0] as string;
    expect(updateQuery).toContain("downvote_count = downvote_count + 1");
  });

  it("includes feedback when provided", async () => {
    mockSql.mockResolvedValueOnce([{ ...FAKE_RATING_ROW, feedback: "Great!" }]);
    mockSql.mockResolvedValueOnce([]);

    const result = await mutateCreateRating({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: true,
      feedback: "Great!",
    });

    expect(result.data.feedback).toBe("Great!");
    const insertValues = mockSql.mock.calls[0][1] as unknown[];
    expect(insertValues).toContain("Great!");
  });
});

describe("mutateUpdateRating", () => {
  beforeEach(() => {
    mockSql.mockReset();
  });

  it("updates rating and adjusts counters when vote flips", async () => {
    // Existing rating was positive
    mockSql.mockResolvedValueOnce([{ id: 1, is_positive: true }]); // SELECT
    mockSql.mockResolvedValueOnce([{ ...FAKE_RATING_ROW, is_positive: false }]); // UPDATE
    mockSql.mockResolvedValueOnce([]); // counter update

    const result = await mutateUpdateRating({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: false,
    });

    expect(result.data.is_positive).toBe(false);

    // Check counter adjustment: upvote-1, downvote+1
    const counterQuery = mockSql.mock.calls[2][0] as string;
    expect(counterQuery).toContain("upvote_count = upvote_count - 1");
    expect(counterQuery).toContain("downvote_count = downvote_count + 1");
  });

  it("does not adjust counters when vote stays same", async () => {
    mockSql.mockResolvedValueOnce([{ id: 1, is_positive: true }]); // SELECT
    mockSql.mockResolvedValueOnce([FAKE_RATING_ROW]); // UPDATE

    await mutateUpdateRating({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: true,
    });

    // Should only have 2 calls (SELECT + UPDATE), no counter update
    expect(mockSql).toHaveBeenCalledTimes(2);
  });

  it("throws when rating not found", async () => {
    mockSql.mockResolvedValueOnce([]); // SELECT returns empty

    await expect(
      mutateUpdateRating({
        briefId: 42,
        sessionId: "sess-1",
        isPositive: false,
      }),
    ).rejects.toThrow("Rating not found");
  });

  it("adjusts counters when flipping from negative to positive", async () => {
    mockSql.mockResolvedValueOnce([{ id: 1, is_positive: false }]); // SELECT
    mockSql.mockResolvedValueOnce([FAKE_RATING_ROW]); // UPDATE
    mockSql.mockResolvedValueOnce([]); // counter update

    await mutateUpdateRating({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: true,
    });

    const counterQuery = mockSql.mock.calls[2][0] as string;
    expect(counterQuery).toContain("upvote_count = upvote_count + 1");
    expect(counterQuery).toContain("downvote_count = downvote_count - 1");
  });
});
