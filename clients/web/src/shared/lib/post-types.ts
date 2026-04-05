/**
 * Shared post-type label keys and badge variants.
 *
 * Maps API post_type values (snake_case) → i18n message keys used by
 * `useTranslations("feed.postTypes")`.
 */

export const POST_TYPE_LABEL_KEY: Record<string, string> = {
  need: "need",
  complaint: "complaint",
  feature_request: "featureRequest",
  alternative_seeking: "alternative",
  comparison: "comparison",
  question: "question",
  review: "review",
  showcase: "showcase",
  discussion: "discussion",
  other: "other",
};

export const POST_TYPE_BADGE_VARIANT: Record<
  string,
  "frustrated" | "request" | "question"
> = {
  complaint: "frustrated",
  feature_request: "request",
  question: "question",
};
