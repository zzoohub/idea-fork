import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ApiResponse, BriefListItem, BriefDetail } from "@/src/shared/api";

const mockApiFetch = vi.fn<(path: string, options?: RequestInit) => Promise<ApiResponse<BriefListItem[] | BriefDetail>>
>();

vi.mock("@/src/shared/api", () => ({
  apiFetch: mockApiFetch,
}));

const { fetchBriefs, fetchBrief } = await import("./index");

const FAKE_BRIEF_LIST_ITEM: BriefListItem = {
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

const FAKE_BRIEF_DETAIL: BriefDetail = {
  ...FAKE_BRIEF_LIST_ITEM,
  problem_statement: "Checkout takes too long.",
  opportunity: "Fast checkout experience.",
  solution_directions: ["One-click checkout", "Saved payment methods"],
  source_snapshots: [{ id: 1, title: "Slow checkout post" }],
};

describe("fetchBriefs", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: [FAKE_BRIEF_LIST_ITEM] });
  });

  describe("with no params", () => {
    it("calls apiFetch with /briefs (no query string)", async () => {
      await fetchBriefs();
      expect(mockApiFetch).toHaveBeenCalledWith("/briefs");
    });

    it("returns the response from apiFetch", async () => {
      const result = await fetchBriefs();
      expect(result).toEqual({ data: [FAKE_BRIEF_LIST_ITEM] });
    });
  });

  describe("with an empty params object", () => {
    it("calls apiFetch with /briefs (no query string)", async () => {
      await fetchBriefs({});
      expect(mockApiFetch).toHaveBeenCalledWith("/briefs");
    });
  });

  describe("sort param", () => {
    it("appends sort to query string", async () => {
      await fetchBriefs({ sort: "hot" });
      expect(mockApiFetch).toHaveBeenCalledWith("/briefs?sort=hot");
    });

    it("does not append sort when not provided", async () => {
      await fetchBriefs({ cursor: "tok" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("sort=");
    });
  });

  describe("cursor param", () => {
    it("appends cursor to query string", async () => {
      await fetchBriefs({ cursor: "nextPage" });
      expect(mockApiFetch).toHaveBeenCalledWith("/briefs?cursor=nextPage");
    });
  });

  describe("limit param", () => {
    it("appends limit to query string as string", async () => {
      await fetchBriefs({ limit: 15 });
      expect(mockApiFetch).toHaveBeenCalledWith("/briefs?limit=15");
    });
  });

  describe("multiple params", () => {
    it("appends all provided params", async () => {
      await fetchBriefs({ sort: "new", cursor: "abc", limit: 5 });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("sort=new");
      expect(url).toContain("cursor=abc");
      expect(url).toContain("limit=5");
    });

    it("starts the query string with '?'", async () => {
      await fetchBriefs({ sort: "new" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/briefs\?/);
    });
  });
});

describe("fetchBrief", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: FAKE_BRIEF_DETAIL });
  });

  it("calls apiFetch with /briefs/:slug", async () => {
    await fetchBrief("faster-checkout");
    expect(mockApiFetch).toHaveBeenCalledWith("/briefs/faster-checkout");
  });

  it("returns the response from apiFetch", async () => {
    const result = await fetchBrief("faster-checkout");
    expect(result).toEqual({ data: FAKE_BRIEF_DETAIL });
  });

  it("URI-encodes the slug", async () => {
    await fetchBrief("slug with spaces");
    expect(mockApiFetch).toHaveBeenCalledWith("/briefs/slug%20with%20spaces");
  });

  it("URI-encodes special characters in the slug", async () => {
    await fetchBrief("slug/with/slashes");
    expect(mockApiFetch).toHaveBeenCalledWith("/briefs/slug%2Fwith%2Fslashes");
  });
});
