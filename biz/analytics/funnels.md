# Funnel Definitions — idea-fork

**Status:** MVP — benchmarks are directional, not targets
**Last updated:** 2026-02-24
**Managed by:** z-data-analyst

---

## Context

No login. All users are anonymous (`distinct_id` = cookie). No waitlist or payment step yet.

At early traffic (<200 visitors/month), report **absolute numbers alongside percentages**. "6 out of 40 visitors read a brief" is more honest than "15% conversion rate."

---

## Core Funnel

The only funnel that matters for kill/keep/scale at MVP.

```
[1] Page Visit (any page)
        |
        v
[2] Brief Viewed (first brief)
        |
        v
[3] Brief Viewed x2 (second brief, same session) ← Aha Moment hypothesis
```

### PostHog Setup

Configure as a FunnelsQuery:

| Step | Event | Notes |
|------|-------|-------|
| 1 | `$pageview` | Any page (PostHog auto-capture) |
| 2 | `brief_viewed` | First brief view in session |
| 3 | `brief_viewed` | Use "performed event multiple times" = 2 |

**Conversion window:** 1 session (30 min). Visitors who return later and read more briefs are tracked via retention, not this funnel.

### Benchmarks (directional)

| Step | Reference | Kill Signal |
|------|-----------|-------------|
| Visit → Brief Viewed | 40-60% | <20% for 4 weeks |
| Brief Viewed → 2nd Brief | 20-35% | <10% for 4 weeks |

**Small data note:** Don't read conversion rates until at least 50 people have reached step 2. Fewer than that and the percentage is noise.

---

## Micro-Funnel: Source Trust

Validates whether "AI with receipts" actually resonates. Not about conversion — about differentiation.

```
[1] Brief Viewed
        |
        v
[2] Brief Source Clicked
```

### How to Read It

| Rate | Signal |
|------|--------|
| >25% | Differentiator is real — people trust but verify |
| 10-25% | Acceptable, monitor |
| <10% | Sources are ignored — differentiator may not matter |

Run as a simple ratio: `brief_source_clicked` unique users / `brief_viewed` unique users per week.

---

## What Is NOT Tracked as a Funnel (and Why)

| Omitted | Why |
|---------|-----|
| Signup / Login | No auth at MVP |
| Waitlist submission | No waitlist yet — add as funnel step 4 when built |
| Feed → Briefs cross-navigation | Use PostHog Paths tool instead of a rigid funnel |
| Product engagement | Track via simple event counts, not a funnel |
| Return visits | Track via PostHog Retention insight, not a funnel |

---

## Weekly Review (takes 5 min)

Check the core funnel once per week. Ask three questions:

1. Where is the biggest drop-off?
2. Did it change from last week?
3. Is there a qualitative explanation (new content, outage, traffic source change)?

At small scale, **inspect individual sessions** in PostHog recordings for users who dropped at step 2. One qualitative insight beats ten data points.
