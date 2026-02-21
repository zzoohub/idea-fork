import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime } from "./format-relative-time";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

// Pin Date.now() so tests are deterministic
const NOW = new Date("2026-02-22T12:00:00.000Z").getTime();

function isoAgo(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("just now (< 1 minute)", () => {
    it("returns 'just now' for 0ms diff", () => {
      expect(formatRelativeTime(isoAgo(0))).toBe("just now");
    });

    it("returns 'just now' for 30 seconds ago", () => {
      expect(formatRelativeTime(isoAgo(30_000))).toBe("just now");
    });

    it("returns 'just now' for exactly 59 999ms ago (just below 1 minute)", () => {
      expect(formatRelativeTime(isoAgo(MINUTE - 1))).toBe("just now");
    });
  });

  describe("minutes ago (>= 1 minute, < 1 hour)", () => {
    it("returns '1m ago' for exactly 1 minute ago", () => {
      expect(formatRelativeTime(isoAgo(MINUTE))).toBe("1m ago");
    });

    it("returns '5m ago' for 5 minutes ago", () => {
      expect(formatRelativeTime(isoAgo(5 * MINUTE))).toBe("5m ago");
    });

    it("returns '59m ago' for 59 minutes ago (just below 1 hour)", () => {
      expect(formatRelativeTime(isoAgo(HOUR - 1))).toBe("59m ago");
    });

    it("floors the minutes (e.g. 90s -> 1m)", () => {
      expect(formatRelativeTime(isoAgo(90_000))).toBe("1m ago");
    });
  });

  describe("hours ago (>= 1 hour, < 1 day)", () => {
    it("returns '1h ago' for exactly 1 hour ago", () => {
      expect(formatRelativeTime(isoAgo(HOUR))).toBe("1h ago");
    });

    it("returns '3h ago' for 3 hours ago", () => {
      expect(formatRelativeTime(isoAgo(3 * HOUR))).toBe("3h ago");
    });

    it("returns '23h ago' for 23 hours ago (just below 1 day)", () => {
      expect(formatRelativeTime(isoAgo(DAY - 1))).toBe("23h ago");
    });

    it("floors the hours (e.g. 1.9h -> 1h)", () => {
      expect(formatRelativeTime(isoAgo(HOUR + HOUR * 0.9))).toBe("1h ago");
    });
  });

  describe("days ago (>= 1 day, < 1 week)", () => {
    it("returns '1d ago' for exactly 1 day ago", () => {
      expect(formatRelativeTime(isoAgo(DAY))).toBe("1d ago");
    });

    it("returns '3d ago' for 3 days ago", () => {
      expect(formatRelativeTime(isoAgo(3 * DAY))).toBe("3d ago");
    });

    it("returns '6d ago' for 6 days ago (just below 1 week)", () => {
      expect(formatRelativeTime(isoAgo(WEEK - 1))).toBe("6d ago");
    });
  });

  describe("weeks ago (>= 1 week)", () => {
    it("returns '1w ago' for exactly 1 week ago", () => {
      expect(formatRelativeTime(isoAgo(WEEK))).toBe("1w ago");
    });

    it("returns '2w ago' for 2 weeks ago", () => {
      expect(formatRelativeTime(isoAgo(2 * WEEK))).toBe("2w ago");
    });

    it("returns '10w ago' for 10 weeks ago", () => {
      expect(formatRelativeTime(isoAgo(10 * WEEK))).toBe("10w ago");
    });

    it("returns '52w ago' for approximately 1 year ago", () => {
      expect(formatRelativeTime(isoAgo(52 * WEEK))).toBe("52w ago");
    });
  });
});
