import { describe, it, expect } from "vitest";
import {
  PLATFORM_CONFIG,
  TAG_CONFIG,
  FILTERABLE_TAGS,
  FEED_PAGE_SIZE,
  BREAKPOINTS,
} from "@/shared/config/constants";
import type { Platform, TagType } from "@/shared/types";

describe("PLATFORM_CONFIG", () => {
  const platforms: Platform[] = ["reddit", "producthunt", "playstore", "appstore", "github"];

  it("has entries for all five platforms", () => {
    expect(Object.keys(PLATFORM_CONFIG)).toHaveLength(5);
    platforms.forEach((p) => {
      expect(PLATFORM_CONFIG).toHaveProperty(p);
    });
  });

  it("every platform entry has name, color, and borderClass properties", () => {
    platforms.forEach((p) => {
      const config = PLATFORM_CONFIG[p];
      expect(config).toHaveProperty("name");
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("borderClass");
      expect(typeof config.name).toBe("string");
      expect(typeof config.color).toBe("string");
      expect(typeof config.borderClass).toBe("string");
    });
  });
});

describe("TAG_CONFIG", () => {
  const tagTypes: TagType[] = [
    "complaint",
    "need",
    "feature-request",
    "discussion",
    "self-promo",
    "other",
  ];

  it("has entries for all six tag types", () => {
    expect(Object.keys(TAG_CONFIG)).toHaveLength(6);
    tagTypes.forEach((t) => {
      expect(TAG_CONFIG).toHaveProperty(t);
    });
  });

  it("every tag entry has label, color, and bgClass properties", () => {
    tagTypes.forEach((t) => {
      const config = TAG_CONFIG[t];
      expect(config).toHaveProperty("label");
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("bgClass");
    });
  });
});

describe("FILTERABLE_TAGS", () => {
  it("contains exactly complaint, need, and feature-request", () => {
    expect(FILTERABLE_TAGS).toEqual(["complaint", "need", "feature-request"]);
  });
});

describe("numeric constants", () => {
  it("FEED_PAGE_SIZE is 20", () => {
    expect(FEED_PAGE_SIZE).toBe(20);
  });
});

describe("BREAKPOINTS", () => {
  it("mobile breakpoint is 640", () => {
    expect(BREAKPOINTS.mobile).toBe(640);
  });

  it("tablet breakpoint is 1024", () => {
    expect(BREAKPOINTS.tablet).toBe(1024);
  });
});
