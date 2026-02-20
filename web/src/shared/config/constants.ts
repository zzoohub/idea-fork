import type { Platform, TagType } from "@/shared/types";

export const PLATFORM_CONFIG: Record<
  Platform,
  { name: string; color: string; borderClass: string }
> = {
  reddit: {
    name: "Reddit",
    color: "#FF5700",
    borderClass: "border-l-platform-reddit",
  },
  producthunt: {
    name: "Product Hunt",
    color: "#DA552F",
    borderClass: "border-l-platform-producthunt",
  },
  playstore: {
    name: "Google Play",
    color: "#01875F",
    borderClass: "border-l-platform-playstore",
  },
  appstore: {
    name: "App Store",
    color: "#0D84FF",
    borderClass: "border-l-platform-appstore",
  },
  github: {
    name: "GitHub",
    color: "#24292F",
    borderClass: "border-l-platform-github",
  },
};

export const TAG_CONFIG: Record<
  TagType,
  { label: string; color: string; bgClass: string }
> = {
  complaint: {
    label: "Complaint",
    color: "#DC2626",
    bgClass: "bg-tag-complaint",
  },
  need: { label: "Need", color: "#2563EB", bgClass: "bg-tag-need" },
  "feature-request": {
    label: "Feature Request",
    color: "#059669",
    bgClass: "bg-tag-feature-request",
  },
  discussion: {
    label: "Discussion",
    color: "#6B7280",
    bgClass: "bg-tag-other",
  },
  "self-promo": {
    label: "Self-Promo",
    color: "#6B7280",
    bgClass: "bg-tag-other",
  },
  other: { label: "Other", color: "#6B7280", bgClass: "bg-tag-other" },
};

export const FILTERABLE_TAGS: TagType[] = [
  "complaint",
  "need",
  "feature-request",
];

export const FEED_PAGE_SIZE = 20;

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
} as const;
