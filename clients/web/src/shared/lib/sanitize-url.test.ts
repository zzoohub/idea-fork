import { describe, it, expect } from "vitest";
import { isSafeUrl } from "./sanitize-url";

describe("isSafeUrl", () => {
  describe("safe URLs", () => {
    it("returns true for https URLs", () => {
      expect(isSafeUrl("https://example.com")).toBe(true);
    });

    it("returns true for http URLs", () => {
      expect(isSafeUrl("http://example.com")).toBe(true);
    });

    it("returns true for https URL with path and query", () => {
      expect(isSafeUrl("https://reddit.com/r/startups/123?ref=foo")).toBe(true);
    });
  });

  describe("unsafe URLs", () => {
    it("returns false for javascript: protocol", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    });

    it("returns false for data: protocol", () => {
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    });

    it("returns false for ftp: protocol", () => {
      expect(isSafeUrl("ftp://example.com")).toBe(false);
    });
  });

  describe("invalid URLs (catch branch)", () => {
    it("returns false for a string that is not a valid URL", () => {
      expect(isSafeUrl("not-a-url")).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(isSafeUrl("")).toBe(false);
    });

    it("returns false for a relative path", () => {
      expect(isSafeUrl("/relative/path")).toBe(false);
    });
  });
});
