import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ApiResponse, Tag } from "@/src/shared/api";

const mockApiFetch = vi.fn<(path: string, options?: RequestInit) => Promise<ApiResponse<Tag[]>>>();

vi.mock("@/src/shared/api", () => ({
  apiFetch: mockApiFetch,
}));

const { fetchTags } = await import("./index");

const FAKE_TAGS: Tag[] = [
  { id: 1, slug: "crash", name: "Crash" },
  { id: 2, slug: "ux", name: "UX" },
];

describe("fetchTags", () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({ data: FAKE_TAGS });
  });

  it("calls apiFetch with /tags", async () => {
    await fetchTags();
    expect(mockApiFetch).toHaveBeenCalledWith("/tags");
  });

  it("returns the response from apiFetch", async () => {
    const result = await fetchTags();
    expect(result).toEqual({ data: FAKE_TAGS });
  });

  it("calls apiFetch exactly once", async () => {
    await fetchTags();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("returns empty data array when apiFetch resolves with empty list", async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [] });
    const result = await fetchTags();
    expect(result).toEqual({ data: [] });
  });
});
