# Visitor Health Score — idea-fork

**Status:** Phase 2 — implement when weekly visitors exceed 500
**Last updated:** 2026-02-24
**Managed by:** z-data-analyst

---

## Why Phase 2

At MVP scale (anonymous users, <500 visitors/week), the core funnel + kill criteria provide sufficient signal for kill/keep/scale decisions. A separate health scoring model adds complexity without changing the decision.

Implement this when:
- Weekly visitors consistently exceed 500
- Auth/login is live (enables per-user lifetime scoring)
- You need to segment users for targeted actions (emails, surveys, feature gating)

---

## Planned Model (3 signals, 4 tiers)

When ready to implement:

### Signals

| Signal | Max Points | What it measures |
|--------|-----------|------------------|
| Brief Depth | 40 | 0 briefs = 0, 1 brief = 15, 2+ briefs = 40 |
| Source Verification | 30 | Clicked any source = 30, none = 0 |
| Return Intent | 30 | Return visit within 7 days = 30, none = 0 |

### Tiers

| Score | Tier | Meaning |
|-------|------|---------|
| 0-15 | Bounce | Visited, didn't engage |
| 16-39 | Curious | Engaged lightly, didn't reach Aha Moment |
| 40-69 | Engaged | Reached Aha Moment (2+ briefs) |
| 70-100 | Activated | Aha Moment + return visit or conversion action |

### How to use

Track the weekly distribution across tiers. Rising "Engaged + Activated" share = product improving. Large "Bounce" share = landing page or acquisition quality problem.

---

## What to Do Instead at MVP

Use the core funnel from `funnels.md` and the weekly health dashboard from `dashboards.md`. These answer the same question ("are visitors getting value?") without the overhead of a scoring model.
