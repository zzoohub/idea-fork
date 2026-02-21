import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ApiResponse, Rating } from "@/src/shared/api";

const mockApiFetch = vi.fn<(path: string, options?: RequestInit) => Promise<ApiResponse<Rating>>>();

vi.mock("@/src/shared/api", () => ({
  apiFetch: mockApiFetch,
}));

const { createRating, updateRating } = await import("./index");

const FAKE_RATING: Rating = {
  id: 1,
  brief_id: 42,
  is_positive: true,
  feedback: null,
  created_at: "2026-02-22T10:00:00Z",
};

describe("createRating", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: FAKE_RATING });
  });

  it("calls apiFetch with the correct path for the given briefId", async () => {
    await createRating(42, { is_positive: true });
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/briefs/42/ratings",
      expect.any(Object),
    );
  });

  it("uses POST method", async () => {
    await createRating(42, { is_positive: true });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("POST");
  });

  it("serialises the body as JSON", async () => {
    await createRating(42, { is_positive: true, feedback: "Great!" });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    expect(opts.body).toBe(JSON.stringify({ is_positive: true, feedback: "Great!" }));
  });

  it("sends is_positive: true correctly", async () => {
    await createRating(42, { is_positive: true });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(opts.body as string);
    expect(parsed.is_positive).toBe(true);
  });

  it("sends is_positive: false correctly", async () => {
    await createRating(42, { is_positive: false });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(opts.body as string);
    expect(parsed.is_positive).toBe(false);
  });

  it("includes feedback when provided", async () => {
    await createRating(42, { is_positive: false, feedback: "Missing context" });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(opts.body as string);
    expect(parsed.feedback).toBe("Missing context");
  });

  it("includes feedback: null when explicitly passed", async () => {
    await createRating(42, { is_positive: true, feedback: null });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(opts.body as string);
    expect(parsed.feedback).toBeNull();
  });

  it("returns the response from apiFetch", async () => {
    const result = await createRating(42, { is_positive: true });
    expect(result).toEqual({ data: FAKE_RATING });
  });

  it("uses the briefId in the URL path", async () => {
    await createRating(7, { is_positive: true });
    const url = mockApiFetch.mock.calls[0][0] as string;
    expect(url).toBe("/briefs/7/ratings");
  });
});

describe("updateRating", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: FAKE_RATING });
  });

  it("calls apiFetch with the correct path for the given briefId", async () => {
    await updateRating(42, { is_positive: false });
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/briefs/42/ratings",
      expect.any(Object),
    );
  });

  it("uses PATCH method", async () => {
    await updateRating(42, { is_positive: false });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("PATCH");
  });

  it("serialises the body as JSON", async () => {
    await updateRating(42, { is_positive: false, feedback: "Not helpful" });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    expect(opts.body).toBe(JSON.stringify({ is_positive: false, feedback: "Not helpful" }));
  });

  it("sends is_positive: true correctly", async () => {
    await updateRating(42, { is_positive: true });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(opts.body as string);
    expect(parsed.is_positive).toBe(true);
  });

  it("sends is_positive: false correctly", async () => {
    await updateRating(42, { is_positive: false });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(opts.body as string);
    expect(parsed.is_positive).toBe(false);
  });

  it("includes feedback when provided", async () => {
    await updateRating(42, { is_positive: true, feedback: "Better now" });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(opts.body as string);
    expect(parsed.feedback).toBe("Better now");
  });

  it("includes feedback: null when explicitly passed", async () => {
    await updateRating(42, { is_positive: false, feedback: null });
    const opts = mockApiFetch.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(opts.body as string);
    expect(parsed.feedback).toBeNull();
  });

  it("returns the response from apiFetch", async () => {
    const result = await updateRating(42, { is_positive: false });
    expect(result).toEqual({ data: FAKE_RATING });
  });

  it("uses the briefId in the URL path", async () => {
    await updateRating(99, { is_positive: true });
    const url = mockApiFetch.mock.calls[0][0] as string;
    expect(url).toBe("/briefs/99/ratings");
  });
});
