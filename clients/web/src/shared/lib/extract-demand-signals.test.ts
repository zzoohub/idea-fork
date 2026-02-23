import { describe, it, expect } from "vitest";
import {
  extractDemandSignals,
  type ParsedDemandSignals,
} from "./extract-demand-signals";

describe("extractDemandSignals", () => {
  it("extracts all fields from valid input", () => {
    const raw = {
      post_count: 47,
      subreddit_count: 5,
      avg_score: 142,
      total_comments: 564,
      newest_post_at: "2026-02-21T10:00:00Z",
      oldest_post_at: "2026-01-10T08:00:00Z",
    };
    const result = extractDemandSignals(raw);
    expect(result).toEqual<ParsedDemandSignals>({
      postCount: 47,
      subredditCount: 5,
      avgScore: 142,
      totalComments: 564,
      newestPostAt: "2026-02-21T10:00:00.000Z",
      oldestPostAt: "2026-01-10T08:00:00.000Z",
    });
  });

  it("returns defaults for missing fields", () => {
    const result = extractDemandSignals({});
    expect(result).toEqual<ParsedDemandSignals>({
      postCount: 0,
      subredditCount: 0,
      avgScore: 0,
      totalComments: 0,
      newestPostAt: null,
      oldestPostAt: null,
    });
  });

  it("returns defaults for wrong types", () => {
    const raw = {
      post_count: "not a number",
      subreddit_count: null,
      avg_score: undefined,
      total_comments: true,
      newest_post_at: 12345,
      oldest_post_at: {},
    };
    const result = extractDemandSignals(raw);
    expect(result).toEqual<ParsedDemandSignals>({
      postCount: 0,
      subredditCount: 0,
      avgScore: 0,
      totalComments: 0,
      newestPostAt: null,
      oldestPostAt: null,
    });
  });

  it("returns null for invalid date strings", () => {
    const raw = {
      newest_post_at: "not-a-date",
      oldest_post_at: "",
    };
    const result = extractDemandSignals(raw);
    expect(result.newestPostAt).toBeNull();
    expect(result.oldestPostAt).toBeNull();
  });

  it("handles NaN and Infinity as 0", () => {
    const raw = {
      post_count: NaN,
      avg_score: Infinity,
    };
    const result = extractDemandSignals(raw);
    expect(result.postCount).toBe(0);
    expect(result.avgScore).toBe(0);
  });
});
