import { describe, it, expect, vi, afterEach } from "vitest";
import { computeHeatLevel, type HeatLevel } from "./compute-heat-level";

const NOW = new Date("2026-02-23T12:00:00Z").getTime();

describe("computeHeatLevel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function withFakeNow(fn: () => void) {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    fn();
  }

  it('returns "hot" for 20+ posts AND newest within 3 days', () => {
    withFakeNow(() => {
      expect(
        computeHeatLevel({
          postCount: 25,
          newestPostAt: "2026-02-22T00:00:00Z",
        }),
      ).toBe<HeatLevel>("hot");
    });
  });

  it('returns "growing" for 10+ posts AND newest within 7 days', () => {
    withFakeNow(() => {
      expect(
        computeHeatLevel({
          postCount: 15,
          newestPostAt: "2026-02-18T00:00:00Z",
        }),
      ).toBe<HeatLevel>("growing");
    });
  });

  it('returns "steady" for 5+ posts with older newest post', () => {
    withFakeNow(() => {
      expect(
        computeHeatLevel({
          postCount: 8,
          newestPostAt: "2026-01-01T00:00:00Z",
        }),
      ).toBe<HeatLevel>("steady");
    });
  });

  it('returns "new" for fewer than 5 posts', () => {
    withFakeNow(() => {
      expect(
        computeHeatLevel({
          postCount: 3,
          newestPostAt: "2026-02-22T00:00:00Z",
        }),
      ).toBe<HeatLevel>("new");
    });
  });

  it('returns "steady" when newestPostAt is null and postCount >= 5', () => {
    withFakeNow(() => {
      expect(
        computeHeatLevel({ postCount: 10, newestPostAt: null }),
      ).toBe<HeatLevel>("steady");
    });
  });

  it('returns "new" when newestPostAt is null and postCount < 5', () => {
    withFakeNow(() => {
      expect(
        computeHeatLevel({ postCount: 2, newestPostAt: null }),
      ).toBe<HeatLevel>("new");
    });
  });

  it('returns "hot" at boundary: exactly 20 posts, exactly 3 days ago', () => {
    withFakeNow(() => {
      expect(
        computeHeatLevel({
          postCount: 20,
          newestPostAt: "2026-02-20T12:00:00Z",
        }),
      ).toBe<HeatLevel>("hot");
    });
  });

  it('returns "growing" at boundary: exactly 10 posts, exactly 7 days ago', () => {
    withFakeNow(() => {
      expect(
        computeHeatLevel({
          postCount: 10,
          newestPostAt: "2026-02-16T12:00:00Z",
        }),
      ).toBe<HeatLevel>("growing");
    });
  });
});
