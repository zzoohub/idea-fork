import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "./pagination";

describe("encodeCursor", () => {
  it("encodes a simple object to base64url", () => {
    const cursor = encodeCursor({ v: "2026-01-01T00:00:00Z", id: 42 });
    expect(typeof cursor).toBe("string");
    expect(cursor.length).toBeGreaterThan(0);
  });

  it("produces a string without padding characters", () => {
    const cursor = encodeCursor({ v: "x", id: 1 });
    expect(cursor).not.toContain("=");
  });

  it("roundtrips with decodeCursor", () => {
    const original = { v: "2026-01-15T12:30:00Z", id: 99 };
    const cursor = encodeCursor(original);
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual(original);
  });

  it("handles numeric values", () => {
    const original = { v: 42, id: 10 };
    const cursor = encodeCursor(original);
    expect(decodeCursor(cursor)).toEqual(original);
  });

  it("handles null values", () => {
    const original = { v: null, id: 5 };
    const cursor = encodeCursor(original);
    expect(decodeCursor(cursor)).toEqual(original);
  });
});

describe("decodeCursor", () => {
  it("returns empty object for invalid base64", () => {
    expect(decodeCursor("!!!invalid!!!")).toEqual({});
  });

  it("returns empty object for non-object JSON", () => {
    // "42" in base64url
    const cursor = Buffer.from("42").toString("base64url");
    expect(decodeCursor(cursor)).toEqual({});
  });

  it("returns empty object for array JSON", () => {
    const cursor = Buffer.from("[1,2,3]").toString("base64url");
    expect(decodeCursor(cursor)).toEqual({});
  });

  it("returns empty object for oversized cursor", () => {
    const huge = "a".repeat(2049);
    expect(decodeCursor(huge)).toEqual({});
  });

  it("returns empty object for empty string", () => {
    expect(decodeCursor("")).toEqual({});
  });

  it("handles base64url without padding", () => {
    const raw = JSON.stringify({ v: "test", id: 1 });
    const noPad = Buffer.from(raw).toString("base64url").replace(/=+$/, "");
    expect(decodeCursor(noPad)).toEqual({ v: "test", id: 1 });
  });

  it("handles base64url with padding", () => {
    const raw = JSON.stringify({ v: "test", id: 1 });
    const withPad = Buffer.from(raw).toString("base64url");
    expect(decodeCursor(withPad)).toEqual({ v: "test", id: 1 });
  });
});
