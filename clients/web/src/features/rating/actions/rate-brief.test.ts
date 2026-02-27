import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMutateCreate = vi.fn();
const mockMutateUpdate = vi.fn();

vi.mock("@/src/shared/db/queries/ratings", () => ({
  mutateCreateRating: mockMutateCreate,
  mutateUpdateRating: mockMutateUpdate,
}));

const { createBriefRating, updateBriefRating } = await import("./rate-brief");

const FAKE_RESPONSE = {
  data: {
    id: 1,
    brief_id: 42,
    is_positive: true,
    feedback: null,
    created_at: "2026-02-22T10:00:00Z",
  },
};

describe("createBriefRating", () => {
  beforeEach(() => {
    mockMutateCreate.mockReset();
    mockMutateCreate.mockResolvedValue(FAKE_RESPONSE);
  });

  it("delegates to mutateCreateRating with correct params", async () => {
    await createBriefRating(42, "sess-1", true, "Nice!");

    expect(mockMutateCreate).toHaveBeenCalledWith({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: true,
      feedback: "Nice!",
    });
  });

  it("returns the response from mutateCreateRating", async () => {
    const result = await createBriefRating(42, "sess-1", true);
    expect(result).toEqual(FAKE_RESPONSE);
  });

  it("passes undefined feedback as undefined", async () => {
    await createBriefRating(42, "sess-1", false);

    expect(mockMutateCreate).toHaveBeenCalledWith({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: false,
      feedback: undefined,
    });
  });
});

describe("updateBriefRating", () => {
  beforeEach(() => {
    mockMutateUpdate.mockReset();
    mockMutateUpdate.mockResolvedValue(FAKE_RESPONSE);
  });

  it("delegates to mutateUpdateRating with correct params", async () => {
    await updateBriefRating(42, "sess-1", false, "Changed mind");

    expect(mockMutateUpdate).toHaveBeenCalledWith({
      briefId: 42,
      sessionId: "sess-1",
      isPositive: false,
      feedback: "Changed mind",
    });
  });

  it("returns the response from mutateUpdateRating", async () => {
    const result = await updateBriefRating(42, "sess-1", true);
    expect(result).toEqual(FAKE_RESPONSE);
  });
});
