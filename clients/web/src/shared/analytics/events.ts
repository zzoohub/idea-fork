import posthog from "posthog-js";

/* --------------------------------------------------------------------------
   Typed tracking functions — one per custom event in the tracking plan.
   Each function calls posthog.capture with the correct event name + props.
   `locale` is registered as a super property via the provider, so it's
   automatically attached to every event — no need to pass it here.
   -------------------------------------------------------------------------- */

const MAX_QUERY_LENGTH = 200;
function truncateQuery(query: string): string {
  return query.slice(0, MAX_QUERY_LENGTH);
}

export function trackBriefViewed(props: {
  brief_id: number;
  brief_title: string;
  source_post_count: number;
}) {
  posthog.capture("brief_viewed", props);
}

export function trackBriefSourceClicked(props: {
  brief_id: number;
  post_id: string;
  platform: string;
  source_position: number;
}) {
  posthog.capture("brief_source_clicked", props);
}

export function trackFeedPostClicked(props: {
  post_id: number;
  platform: string;
  post_position: number;
}) {
  posthog.capture("feed_post_clicked", props);
}

export function trackProductViewed(props: {
  product_id: number;
  product_name: string;
}) {
  posthog.capture("product_viewed", props);
}

export function trackProductComplaintClicked(props: {
  product_id: number;
  post_id: number;
  platform: string;
}) {
  posthog.capture("product_complaint_clicked", props);
}

export function trackSearchPerformed(props: {
  query: string;
  results_count: number;
}) {
  posthog.capture("search_performed", { ...props, query: truncateQuery(props.query) });
}

export function trackSearchResultClicked(props: {
  query: string;
  result_type: "brief" | "post" | "product";
  result_position: number;
}) {
  posthog.capture("search_result_clicked", { ...props, query: truncateQuery(props.query) });
}

export function trackFeedFiltered(props: {
  filter_type: "post_type" | "tag" | "sort";
  filter_value: string;
}) {
  posthog.capture("feed_filtered", props);
}
