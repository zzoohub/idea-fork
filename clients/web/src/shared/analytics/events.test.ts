import { describe, it, expect, beforeEach } from "vitest";
import posthog from "posthog-js";
import {
  trackBriefViewed,
  trackBriefSourceClicked,
  trackFeedPostClicked,
  trackProductViewed,
  trackProductComplaintClicked,
  trackSearchPerformed,
  trackSearchResultClicked,
  trackFeedFiltered,
} from "./events";

describe("analytics events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trackBriefViewed captures brief_viewed", () => {
    const props = { brief_id: 1, brief_title: "Test Brief", source_post_count: 5 };
    trackBriefViewed(props);
    expect(posthog.capture).toHaveBeenCalledWith("brief_viewed", props);
  });

  it("trackBriefSourceClicked captures brief_source_clicked", () => {
    const props = { brief_id: 1, post_id: "abc", platform: "reddit", source_position: 2 };
    trackBriefSourceClicked(props);
    expect(posthog.capture).toHaveBeenCalledWith("brief_source_clicked", props);
  });

  it("trackFeedPostClicked captures feed_post_clicked", () => {
    const props = { post_id: 42, platform: "reddit", post_position: 3 };
    trackFeedPostClicked(props);
    expect(posthog.capture).toHaveBeenCalledWith("feed_post_clicked", props);
  });

  it("trackProductViewed captures product_viewed", () => {
    const props = { product_id: 10, product_name: "Acme" };
    trackProductViewed(props);
    expect(posthog.capture).toHaveBeenCalledWith("product_viewed", props);
  });

  it("trackProductComplaintClicked captures product_complaint_clicked", () => {
    const props = { product_id: 10, post_id: 99, platform: "appstore" };
    trackProductComplaintClicked(props);
    expect(posthog.capture).toHaveBeenCalledWith("product_complaint_clicked", props);
  });

  it("trackSearchPerformed captures search_performed", () => {
    const props = { query: "test query", results_count: 15 };
    trackSearchPerformed(props);
    expect(posthog.capture).toHaveBeenCalledWith("search_performed", props);
  });

  it("trackSearchPerformed truncates long queries to 200 chars", () => {
    const longQuery = "a".repeat(300);
    trackSearchPerformed({ query: longQuery, results_count: 0 });
    expect(posthog.capture).toHaveBeenCalledWith("search_performed", {
      query: "a".repeat(200),
      results_count: 0,
    });
  });

  it("trackSearchResultClicked captures search_result_clicked", () => {
    const props = { query: "test", result_type: "brief" as const, result_position: 1 };
    trackSearchResultClicked(props);
    expect(posthog.capture).toHaveBeenCalledWith("search_result_clicked", props);
  });

  it("trackSearchResultClicked truncates long queries to 200 chars", () => {
    const longQuery = "b".repeat(250);
    trackSearchResultClicked({ query: longQuery, result_type: "post", result_position: 2 });
    expect(posthog.capture).toHaveBeenCalledWith("search_result_clicked", {
      query: "b".repeat(200),
      result_type: "post",
      result_position: 2,
    });
  });

  it("trackFeedFiltered captures feed_filtered", () => {
    const props = { filter_type: "tag" as const, filter_value: "saas" };
    trackFeedFiltered(props);
    expect(posthog.capture).toHaveBeenCalledWith("feed_filtered", props);
  });
});
