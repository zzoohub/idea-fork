import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cn, formatRelativeTime, formatNumber, truncateText, sanitizeExternalUrl } from "@/shared/lib/utils";

// Fixed "now" for deterministic time-based tests: 2026-02-20T12:00:00.000Z
const FIXED_NOW = new Date("2026-02-20T12:00:00.000Z");

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("merges tailwind conflicting classes — last wins", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("handles conditional objects", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe(
      "text-red-500"
    );
  });

  it("returns empty string when no classes provided", () => {
    expect(cn()).toBe("");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for less than 1 minute ago', () => {
    const date = new Date(FIXED_NOW.getTime() - 30_000); // 30 seconds ago
    expect(formatRelativeTime(date.toISOString())).toBe("just now");
  });

  it('returns "just now" for 0 seconds difference', () => {
    expect(formatRelativeTime(FIXED_NOW.toISOString())).toBe("just now");
  });

  it("returns minutes ago for 1–59 minutes", () => {
    const date = new Date(FIXED_NOW.getTime() - 5 * 60_000); // 5 minutes ago
    expect(formatRelativeTime(date.toISOString())).toBe("5m ago");
  });

  it("returns exactly 1 minute ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 60_000); // exactly 1 minute
    expect(formatRelativeTime(date.toISOString())).toBe("1m ago");
  });

  it("returns 59 minutes ago (boundary before hours)", () => {
    const date = new Date(FIXED_NOW.getTime() - 59 * 60_000);
    expect(formatRelativeTime(date.toISOString())).toBe("59m ago");
  });

  it("returns hours ago for 1–23 hours", () => {
    const date = new Date(FIXED_NOW.getTime() - 3 * 3600_000); // 3 hours ago
    expect(formatRelativeTime(date.toISOString())).toBe("3h ago");
  });

  it("returns exactly 1 hour ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 3600_000);
    expect(formatRelativeTime(date.toISOString())).toBe("1h ago");
  });

  it("returns 23 hours ago (boundary before days)", () => {
    const date = new Date(FIXED_NOW.getTime() - 23 * 3600_000);
    expect(formatRelativeTime(date.toISOString())).toBe("23h ago");
  });

  it("returns days ago for 1–6 days", () => {
    const date = new Date(FIXED_NOW.getTime() - 4 * 86_400_000); // 4 days ago
    expect(formatRelativeTime(date.toISOString())).toBe("4d ago");
  });

  it("returns exactly 1 day ago", () => {
    const date = new Date(FIXED_NOW.getTime() - 86_400_000);
    expect(formatRelativeTime(date.toISOString())).toBe("1d ago");
  });

  it("returns 6 days ago (boundary before weeks)", () => {
    const date = new Date(FIXED_NOW.getTime() - 6 * 86_400_000);
    expect(formatRelativeTime(date.toISOString())).toBe("6d ago");
  });

  it("returns weeks ago for 7–29 days", () => {
    const date = new Date(FIXED_NOW.getTime() - 14 * 86_400_000); // 14 days ago
    expect(formatRelativeTime(date.toISOString())).toBe("2w ago");
  });

  it("returns exactly 1 week ago (7 days)", () => {
    const date = new Date(FIXED_NOW.getTime() - 7 * 86_400_000);
    expect(formatRelativeTime(date.toISOString())).toBe("1w ago");
  });

  it("returns 4 weeks ago (28 days, boundary before date)", () => {
    const date = new Date(FIXED_NOW.getTime() - 28 * 86_400_000);
    expect(formatRelativeTime(date.toISOString())).toBe("4w ago");
  });

  it("returns locale date string for 30+ days ago", () => {
    // 2026-02-20 minus 30 days = 2026-01-21
    const date = new Date(FIXED_NOW.getTime() - 30 * 86_400_000);
    const result = formatRelativeTime(date.toISOString());
    // Should be a locale date like "Jan 21"
    expect(result).toMatch(/Jan/i);
  });

  it("returns locale date string for dates older than 30 days", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const result = formatRelativeTime(date.toISOString());
    expect(result).toMatch(/\w+ \d+/); // e.g. "Jan 1"
  });
});

describe("formatNumber", () => {
  it("returns raw number as string for values below 1000", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1)).toBe("1");
    expect(formatNumber(999)).toBe("999");
  });

  it("returns K-formatted string for 1000+", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(1500)).toBe("1.5K");
    expect(formatNumber(999_999)).toBe("1000.0K");
  });

  it("returns M-formatted string for 1,000,000+", () => {
    expect(formatNumber(1_000_000)).toBe("1.0M");
    expect(formatNumber(2_500_000)).toBe("2.5M");
    expect(formatNumber(10_000_000)).toBe("10.0M");
  });

  it("formats 1000 as 1.0K (boundary)", () => {
    expect(formatNumber(1000)).toBe("1.0K");
  });

  it("formats 999999 in K (not M)", () => {
    expect(formatNumber(999_999)).toBe("1000.0K");
  });

  it("formats exactly 1000000 as M", () => {
    expect(formatNumber(1_000_000)).toBe("1.0M");
  });
});

describe("truncateText", () => {
  it("returns original text when length is within maxLength", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("returns original text when length equals maxLength", () => {
    expect(truncateText("hello", 5)).toBe("hello");
  });

  it("truncates text and appends ellipsis when exceeding maxLength", () => {
    const result = truncateText("hello world", 5);
    expect(result).toBe("hello…");
  });

  it("trims trailing whitespace before appending ellipsis", () => {
    const result = truncateText("hello  world", 7);
    // slice(0, 7) = "hello  " then trimEnd() = "hello" + "…"
    expect(result).toBe("hello…");
  });

  it("handles empty string", () => {
    expect(truncateText("", 5)).toBe("");
  });

  it("handles maxLength of 0", () => {
    const result = truncateText("hello", 0);
    expect(result).toBe("…");
  });

  it("handles a single-character maxLength", () => {
    const result = truncateText("hello", 1);
    expect(result).toBe("h…");
  });
});

describe("sanitizeExternalUrl", () => {
  it("returns the original URL for a valid https URL", () => {
    expect(sanitizeExternalUrl("https://example.com")).toBe(
      "https://example.com"
    );
  });

  it("returns the original URL for a valid http URL", () => {
    expect(sanitizeExternalUrl("http://example.com")).toBe(
      "http://example.com"
    );
  });

  it("returns # for a javascript: scheme URL", () => {
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBe("#");
  });

  it("returns # for a data: scheme URL", () => {
    expect(sanitizeExternalUrl("data:text/html,<h1>hi</h1>")).toBe("#");
  });

  it("returns # for a vbscript: scheme URL", () => {
    expect(sanitizeExternalUrl("vbscript:msgbox(1)")).toBe("#");
  });

  it("returns # for a relative path (throws in URL constructor)", () => {
    expect(sanitizeExternalUrl("/relative/path")).toBe("#");
  });

  it("returns # for a malformed URL string", () => {
    expect(sanitizeExternalUrl("not a url at all")).toBe("#");
  });

  it("returns # for an empty string", () => {
    expect(sanitizeExternalUrl("")).toBe("#");
  });

  it("returns the original URL for https with path and query", () => {
    const url = "https://example.com/path?foo=bar#anchor";
    expect(sanitizeExternalUrl(url)).toBe(url);
  });
});
