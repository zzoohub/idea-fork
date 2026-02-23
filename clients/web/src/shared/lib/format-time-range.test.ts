import { describe, it, expect } from "vitest";
import { formatTimeRange } from "./format-time-range";

describe("formatTimeRange", () => {
  it("returns null when oldestAt is null", () => {
    expect(formatTimeRange(null, "2026-02-23T00:00:00Z")).toBeNull();
  });

  it("returns null when newestAt is null", () => {
    expect(formatTimeRange("2026-01-01T00:00:00Z", null)).toBeNull();
  });

  it("returns null when both are null", () => {
    expect(formatTimeRange(null, null)).toBeNull();
  });

  it("returns null for invalid date strings", () => {
    expect(formatTimeRange("not-a-date", "2026-01-01T00:00:00Z")).toBeNull();
  });

  it('formats a 1-day range as "1 day"', () => {
    expect(
      formatTimeRange("2026-02-22T00:00:00Z", "2026-02-23T00:00:00Z"),
    ).toBe("1 day");
  });

  it('formats a 3-day range as "3 days"', () => {
    expect(
      formatTimeRange("2026-02-20T00:00:00Z", "2026-02-23T00:00:00Z"),
    ).toBe("3 days");
  });

  it('formats a ~2 week range as "2 weeks"', () => {
    expect(
      formatTimeRange("2026-02-09T00:00:00Z", "2026-02-23T00:00:00Z"),
    ).toBe("2 weeks");
  });

  it('formats a ~6 week range as "6 weeks"', () => {
    expect(
      formatTimeRange("2026-01-12T00:00:00Z", "2026-02-23T00:00:00Z"),
    ).toBe("6 weeks");
  });

  it('formats a ~3 month range as "3 months"', () => {
    expect(
      formatTimeRange("2025-11-23T00:00:00Z", "2026-02-23T00:00:00Z"),
    ).toBe("3 months");
  });

  it('formats a ~1 year range as "1 year"', () => {
    expect(
      formatTimeRange("2025-02-23T00:00:00Z", "2026-02-23T00:00:00Z"),
    ).toBe("1 year");
  });

  it('formats a ~1 week range as "1 week"', () => {
    expect(
      formatTimeRange("2026-02-16T00:00:00Z", "2026-02-23T00:00:00Z"),
    ).toBe("1 week");
  });

  it('formats a ~2 year range as "2 years"', () => {
    expect(
      formatTimeRange("2024-02-23T00:00:00Z", "2026-02-23T00:00:00Z"),
    ).toBe("2 years");
  });

  it("handles reversed dates (newest before oldest)", () => {
    const result = formatTimeRange(
      "2026-02-23T00:00:00Z",
      "2026-02-20T00:00:00Z",
    );
    expect(result).toBe("3 days");
  });
});
