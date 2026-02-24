# Tracking Plan — idea-fork

**Status:** MVP — validate within first 90 days of real traffic
**Last updated:** 2026-02-24
**Managed by:** z-data-analyst

---

## Aha Moment

**Hypothesis:** A visitor who reads 2+ AI briefs in a single session will return within 7 days.

**Rationale:** One brief = curiosity. Two briefs = active research. That's the moment the product clicks.

**How to measure:** PostHog funnel — "same person performed `brief_viewed` 2+ times" within session.

**Status:** Hypothesis — validate qualitatively with early visitors before trusting numbers.

---

## Context

- No login — all users anonymous (PostHog `distinct_id` = cookie-based).
- No waitlist, share, or payment yet — those events are Phase 2.
- PostHog auto-capture (`$pageview`, `$autocapture`) is ON — no custom pageview event needed.
- `locale` (en/ko) attached as global property for market segmentation.

---

## Events (9 total)

Only events that inform kill/keep/scale decisions. Nothing else.

### Feed

| Event | Trigger | Properties |
|-------|---------|------------|
| `feed_post_clicked` | User clicks a post card in the feed | `post_id`, `platform`, `post_position`, `locale` |
| `feed_filtered` | User applies filter (type tab, tag chip) or changes sort | `filter_type` (post_type/tag/sort), `filter_value`, `locale` |

**Why:** Feed is the entry point. Click rate tells us if raw signal is compelling. Filter usage shows intentional exploration.

### AI Briefs (Core Value)

| Event | Trigger | Properties |
|-------|---------|------------|
| `brief_viewed` | User opens a brief detail page (fires on page load) | `brief_id`, `brief_title`, `source_post_count`, `locale` |
| `brief_source_clicked` | User clicks a linked source post inside a brief | `brief_id`, `post_id`, `platform`, `source_position` |

**Why:** `brief_viewed` is the Aha Moment candidate. `brief_source_clicked` validates "AI with receipts." If nobody clicks sources, the differentiator doesn't matter.

### Products

| Event | Trigger | Properties |
|-------|---------|------------|
| `product_viewed` | User opens a product detail page | `product_id`, `product_name`, `locale` |
| `product_signal_clicked` | User clicks a signal on a product page | `product_id`, `post_id`, `platform` |

**Why:** Near-zero engagement = deprioritize this section. One view + one click event is enough.

### Search

| Event | Trigger | Properties |
|-------|---------|------------|
| `search_performed` | User submits a search query | `query`, `results_count`, `locale` |
| `search_result_clicked` | User clicks a result from search | `query`, `result_type` (brief/post/product), `result_position` |

**Why:** Search intent reveals what visitors want. High search + low clicks = relevance problem. High search + zero results = content gap.

---

## Phase 2 Events (add when feature ships)

| Event | When to add |
|-------|-------------|
| `brief_shared` | Share/copy link feature |
| `waitlist_cta_clicked` | Waitlist feature |
| `waitlist_submitted` | Waitlist feature (fire server-side too) |
| `signup_completed` | Auth feature |
| `purchase_completed` | Payment feature |

---

## Global Properties

Attach to every custom event via PostHog `register()`:

| Property | Source |
|----------|--------|
| `locale` | Next.js locale context (`"en"` / `"ko"`) |

PostHog auto-captures: `$current_url`, `$referrer`, `$device_type`, `$browser`, UTMs. No manual setup needed.

---

## Implementation Priority

Ship in this order. Each batch is independently useful.

| Batch | Events | Why first |
|-------|--------|-----------|
| 1 | `brief_viewed`, `brief_source_clicked` | Core value measurement |
| 2 | `feed_post_clicked`, `product_viewed`, `product_signal_clicked` | Section engagement |
| 3 | `search_performed`, `search_result_clicked`, `feed_filtered` | Intent signals |

---

## Implementation Notes

- All events: client-side via PostHog JS SDK.
- Use PostHog auto-capture `$pageview` — do NOT create a custom `page_viewed` event.
- `brief_viewed` fires on page load, not after dwell time. Keep it simple for MVP.
- Aha Moment: use PostHog funnel "performed event multiple times" — no client-side counter needed.
- Filter internal traffic: exclude zzoo's sessions via PostHog internal user filter.
- No PII in any event property.

---

## Validation Checklist

- [ ] PostHog JS SDK initialized on first page load
- [ ] Events fire on SPA route changes (not just hard reloads)
- [ ] `brief_viewed` fires on detail page load, not on card hover/preview
- [ ] No duplicate firing on Next.js re-renders (use `useEffect` with proper deps)
- [ ] `locale` property present on all custom events
- [ ] Internal sessions filtered
- [ ] All event names follow `{object}_{action}` snake_case convention
