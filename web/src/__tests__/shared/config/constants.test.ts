import { describe, it, expect } from "vitest";
import {
  PLATFORM_CONFIG,
  TAG_CONFIG,
  FILTERABLE_TAGS,
  FEED_BATCH_SIZE_DESKTOP,
  FEED_BATCH_SIZE_MOBILE,
  FREE_DEEP_DIVES_PER_DAY,
  PRO_PRICE_MONTHLY,
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

  it("reddit has correct values", () => {
    expect(PLATFORM_CONFIG.reddit).toEqual({
      name: "Reddit",
      color: "#FF5700",
      borderClass: "border-l-platform-reddit",
    });
  });

  it("producthunt has correct values", () => {
    expect(PLATFORM_CONFIG.producthunt).toEqual({
      name: "Product Hunt",
      color: "#DA552F",
      borderClass: "border-l-platform-producthunt",
    });
  });

  it("playstore has correct values", () => {
    expect(PLATFORM_CONFIG.playstore).toEqual({
      name: "Google Play",
      color: "#01875F",
      borderClass: "border-l-platform-playstore",
    });
  });

  it("appstore has correct values", () => {
    expect(PLATFORM_CONFIG.appstore).toEqual({
      name: "App Store",
      color: "#0D84FF",
      borderClass: "border-l-platform-appstore",
    });
  });

  it("github has correct values", () => {
    expect(PLATFORM_CONFIG.github).toEqual({
      name: "GitHub",
      color: "#24292F",
      borderClass: "border-l-platform-github",
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

  it("complaint has correct values", () => {
    expect(TAG_CONFIG.complaint).toEqual({
      label: "Complaint",
      color: "#DC2626",
      bgClass: "bg-tag-complaint",
    });
  });

  it("need has correct values", () => {
    expect(TAG_CONFIG.need).toEqual({
      label: "Need",
      color: "#2563EB",
      bgClass: "bg-tag-need",
    });
  });

  it("feature-request has correct values", () => {
    expect(TAG_CONFIG["feature-request"]).toEqual({
      label: "Feature Request",
      color: "#059669",
      bgClass: "bg-tag-feature-request",
    });
  });

  it("discussion has correct values", () => {
    expect(TAG_CONFIG.discussion).toEqual({
      label: "Discussion",
      color: "#6B7280",
      bgClass: "bg-tag-other",
    });
  });

  it("self-promo has correct values", () => {
    expect(TAG_CONFIG["self-promo"]).toEqual({
      label: "Self-Promo",
      color: "#6B7280",
      bgClass: "bg-tag-other",
    });
  });

  it("other has correct values", () => {
    expect(TAG_CONFIG.other).toEqual({
      label: "Other",
      color: "#6B7280",
      bgClass: "bg-tag-other",
    });
  });

  it("every tag entry has label, color, and bgClass properties", () => {
    tagTypes.forEach((t) => {
      const config = TAG_CONFIG[t];
      expect(config).toHaveProperty("label");
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("bgClass");
      expect(typeof config.label).toBe("string");
      expect(typeof config.color).toBe("string");
      expect(typeof config.bgClass).toBe("string");
    });
  });
});

describe("FILTERABLE_TAGS", () => {
  it("contains exactly complaint, need, and feature-request", () => {
    expect(FILTERABLE_TAGS).toEqual(["complaint", "need", "feature-request"]);
  });

  it("has exactly 3 items", () => {
    expect(FILTERABLE_TAGS).toHaveLength(3);
  });
});

describe("numeric constants", () => {
  it("FEED_BATCH_SIZE_DESKTOP is 20", () => {
    expect(FEED_BATCH_SIZE_DESKTOP).toBe(20);
  });

  it("FEED_BATCH_SIZE_MOBILE is 10", () => {
    expect(FEED_BATCH_SIZE_MOBILE).toBe(10);
  });

  it("FREE_DEEP_DIVES_PER_DAY is 3", () => {
    expect(FREE_DEEP_DIVES_PER_DAY).toBe(3);
  });

  it("PRO_PRICE_MONTHLY is 9", () => {
    expect(PRO_PRICE_MONTHLY).toBe(9);
  });
});

describe("BREAKPOINTS", () => {
  it("mobile breakpoint is 640", () => {
    expect(BREAKPOINTS.mobile).toBe(640);
  });

  it("tablet breakpoint is 1024", () => {
    expect(BREAKPOINTS.tablet).toBe(1024);
  });

  it("has exactly mobile and tablet keys", () => {
    expect(Object.keys(BREAKPOINTS)).toEqual(["mobile", "tablet"]);
  });
});
