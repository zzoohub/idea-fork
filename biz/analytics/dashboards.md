# Dashboard Setup — idea-fork

**Status:** MVP — one dashboard only
**Last updated:** 2026-02-24
**Managed by:** z-data-analyst

---

## Philosophy

One dashboard at MVP. Every chart must answer a kill/keep/scale question. Open it every Monday — takes 5 minutes.

---

## Dashboard: Weekly Health Check

**PostHog name:** `idea-fork — Weekly Health`
**Check frequency:** Every Monday

### Chart 1: Weekly Unique Visitors (Trend)

- **Type:** Line chart, 12-week window
- **Query:** TrendsQuery — `$pageview`, unique users, interval: week
- **Answers:** Is the audience growing, flat, or declining? 3+ weeks of decline with no cause = kill signal.

### Chart 2: Brief Engagement Rate (Core Signal)

- **Type:** Line chart, 12-week window
- **Query:** Formula — `unique(brief_viewed) / unique($pageview)` per week
- **Answers:** Are visitors finding and reading briefs? This is the single most important metric. Below 20% for 4 weeks = product isn't delivering value.

### Chart 3: Brief Engagement Funnel (Weekly Snapshot)

- **Type:** Funnel chart
- **Query:** FunnelsQuery — `$pageview` → `brief_viewed` (1st) → `brief_viewed` (2nd in session)
- **Answers:** Where is the drop-off? The biggest cliff is the highest-leverage fix this week.

### Chart 4: Source Trust Rate

- **Type:** Number + sparkline
- **Query:** Formula — `unique(brief_source_clicked) / unique(brief_viewed)` per week
- **Answers:** Is "AI with receipts" working? Below 10% = differentiator is invisible.

---

## Phase 2 Dashboard: Traffic & Content

Add when weekly visitors consistently exceed 100. Until then, the 4 charts above are sufficient.

| Chart | When to add |
|-------|-------------|
| Traffic by referrer/UTM source | 100+ visitors/week from 2+ sources |
| Top briefs by views | 30+ days of content data |
| Locale split (en vs ko) | Both markets have meaningful traffic |
| Search volume + zero-results rate | Search usage is non-trivial |
| Top search queries with no clicks | Content gap analysis needed |

---

## Deliberately Excluded

| Metric | Why |
|--------|-----|
| Raw pageviews | Vanity. Use unique visitors + engagement rate instead. |
| Bounce rate | Misleading for SPA. PostHog session detection handles this. |
| DAU/WAU/MAU ratio | Unreliable at <1k users. Use retention insight when needed. |
| Heatmaps | Not kill/keep/scale critical. Add later for UX optimization. |
| Revenue dashboard | No payments yet. |
