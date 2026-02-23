import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ApiResponse, Post } from "@/src/shared/api";

const mockApiFetch = vi.fn<(path: string, options?: RequestInit) => Promise<ApiResponse<Post | Post[]>>>();

vi.mock("@/src/shared/api", () => ({
  apiFetch: mockApiFetch,
}));

const { fetchPosts, fetchPost } = await import("./index");

const FAKE_POST: Post = {
  id: 1,
  title: "App crashes on launch",
  body: "Every time I open the app it crashes.",
  source: "reddit",
  subreddit: "techsupport",
  external_url: "https://reddit.com/r/techsupport/1",
  external_created_at: "2026-01-01T00:00:00Z",
  score: 42,
  num_comments: 5,
  post_type: "complaint",
  sentiment: "negative",
  tags: [{ slug: "crash", name: "Crash" }],
};

describe("fetchPosts", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: [FAKE_POST] });
  });

  describe("with no params", () => {
    it("calls apiFetch with /posts (no query string)", async () => {
      await fetchPosts();
      expect(mockApiFetch).toHaveBeenCalledWith("/posts");
    });

    it("returns the response from apiFetch", async () => {
      const result = await fetchPosts();
      expect(result).toEqual({ data: [FAKE_POST] });
    });
  });

  describe("with an empty params object", () => {
    it("calls apiFetch with /posts (no query string)", async () => {
      await fetchPosts({});
      expect(mockApiFetch).toHaveBeenCalledWith("/posts");
    });
  });

  describe("tag param", () => {
    it("appends tag to query string", async () => {
      await fetchPosts({ tag: "crash" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?tag=crash");
    });

    it("does not append tag when not provided", async () => {
      await fetchPosts({ sort: "hot" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("tag=");
    });
  });

  describe("sort param", () => {
    it("appends sort to query string", async () => {
      await fetchPosts({ sort: "new" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?sort=new");
    });
  });

  describe("cursor param", () => {
    it("appends cursor to query string", async () => {
      await fetchPosts({ cursor: "abc123" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?cursor=abc123");
    });
  });

  describe("limit param", () => {
    it("appends limit to query string as string", async () => {
      await fetchPosts({ limit: 20 });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?limit=20");
    });
  });

  describe("source param", () => {
    it("appends source to query string", async () => {
      await fetchPosts({ source: "reddit" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?source=reddit");
    });
  });

  describe("sentiment param", () => {
    it("appends sentiment to query string", async () => {
      await fetchPosts({ sentiment: "negative" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?sentiment=negative");
    });
  });

  describe("q param", () => {
    it("appends q to query string", async () => {
      await fetchPosts({ q: "crash" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?q=crash");
    });
  });

  describe("post_type param", () => {
    it("appends post_type to query string", async () => {
      await fetchPosts({ post_type: "complaint" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?post_type=complaint");
    });

    it("does not append post_type when not provided", async () => {
      await fetchPosts({ tag: "crash" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).not.toContain("post_type=");
    });

    it("appends post_type=need correctly", async () => {
      await fetchPosts({ post_type: "need" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?post_type=need");
    });

    it("appends post_type=feature_request correctly", async () => {
      await fetchPosts({ post_type: "feature_request" });
      expect(mockApiFetch).toHaveBeenCalledWith("/posts?post_type=feature_request");
    });
  });

  describe("multiple params", () => {
    it("appends all provided params", async () => {
      await fetchPosts({ tag: "bug", sort: "hot", limit: 10, source: "reddit", sentiment: "negative", q: "crash", cursor: "xyz" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("tag=bug");
      expect(url).toContain("sort=hot");
      expect(url).toContain("limit=10");
      expect(url).toContain("source=reddit");
      expect(url).toContain("sentiment=negative");
      expect(url).toContain("q=crash");
      expect(url).toContain("cursor=xyz");
    });

    it("appends post_type together with other params", async () => {
      await fetchPosts({ tag: "bug", post_type: "complaint" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toContain("tag=bug");
      expect(url).toContain("post_type=complaint");
    });

    it("starts the query string with '?'", async () => {
      await fetchPosts({ tag: "bug", sort: "hot" });
      const url = mockApiFetch.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/posts\?/);
    });
  });
});

describe("fetchPost", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: FAKE_POST });
  });

  it("calls apiFetch with /posts/:id", async () => {
    await fetchPost(1);
    expect(mockApiFetch).toHaveBeenCalledWith("/posts/1");
  });

  it("returns the response from apiFetch", async () => {
    const result = await fetchPost(1);
    expect(result).toEqual({ data: FAKE_POST });
  });

  it("uses the correct numeric id in the URL", async () => {
    await fetchPost(99);
    expect(mockApiFetch).toHaveBeenCalledWith("/posts/99");
  });
});
