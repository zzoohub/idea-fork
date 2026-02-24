# Kill / Keep / Scale Criteria — idea-fork

**Decision frequency:** Weekly check starting Week 4 after first real traffic
**Decision maker:** zzoo
**Last updated:** 2026-02-24
**Managed by:** z-data-analyst

---

## Framework

**One decision, weekly:** Kill, Keep (fix something specific), or Scale.

No gut feelings. No "we need more time." Every metric has a hard threshold. If kill criteria are met, kill or pivot — sunk cost is not a reason to continue.

---

## Check Cadence

- **Start:** 4 weeks after first meaningful traffic (>50 unique visitors/week).
- **Frequency:** Every Monday morning, <10 minutes.
- **"Real traffic" definition:** >30 unique visitors/week from 2+ referrer sources. Launch spikes (HN, PH, Reddit) are excluded — wait for the spike to subside.

---

## Kill Criteria (Hard Stop)

If ANY of the following are true for **4 consecutive weeks** with real traffic, kill or pivot:

| # | Criterion | Threshold |
|---|-----------|-----------|
| K1 | Brief engagement rate | <20% of visitors view any brief |
| K2 | Aha Moment reach rate | <5% of visitors view 2+ briefs in a session |
| K3 | Source click rate | <5% of brief viewers click any source |
| K4 | Session depth | Average <1 brief read per session |

**4-week rule:** One bad week is noise. Two is a concern. Four consecutive = kill or pivot.

### Hard Stops (kill immediately)

1. **Zero retention plateau after 12 weeks** with 50+ real users in the cohort.
2. **Activation rate <5% after 3 onboarding/UX iterations.** If 95%+ can't find value after 3 tries, the value isn't there.
3. **12 weeks in keep mode** without reaching any scale criteria. Hard clock — no extensions.

---

## Keep Criteria (Fix Mode)

Stay in keep mode when:
- At least 1 kill criterion is above threshold (some engagement exists)
- But scale criteria are not met
- There is a specific, testable hypothesis for what to fix

**Fix priority (always in this order):**

1. **Engagement depth first.** If Aha Moment reach rate is low → fix brief quality, discoverability, or homepage UX.
2. **Then conversion.** If engagement is healthy but nobody takes action → fix CTA placement or value prop messaging.
3. **Then acquisition.** Only increase traffic after 1 and 2 are healthy. More visitors to a low-engagement experience wastes time.

---

## Scale Criteria

Invest more time in content pipeline, SEO, and distribution when **ALL** are true for 3 consecutive weeks:

| # | Criterion | Threshold |
|---|-----------|-----------|
| S1 | Brief engagement rate | >40% of visitors view at least one brief |
| S2 | Aha Moment reach rate | >15% of visitors view 2+ briefs |
| S3 | Source click rate | >20% of brief viewers click a source |
| S4 | Visitor trend | Positive week-over-week unique visitors for 3 weeks |

**What "scale" means (no budget):** More time on content pipeline quality, SEO, distribution (Reddit/Twitter/HN posts), or features that drive organic sharing. NOT paid acquisition — that requires revenue.

---

## Weekly Check Template

```
Week: YYYY-WW
Unique visitors: ___
Real traffic? (>30, 2+ sources): Yes / No

KILL CHECK:
K1 Brief engagement rate: ___% (kill: <20%)
K2 Aha Moment reach rate: ___% (kill: <5%)
K3 Source click rate:      ___% (kill: <5%)
K4 Avg briefs/session:     ___ (kill: <1)

Kill criteria met 4 consecutive weeks? Yes / No

SCALE CHECK:
S1 Brief engagement rate: ___% (scale: >40%)
S2 Aha Moment reach rate: ___% (scale: >15%)
S3 Source click rate:      ___% (scale: >20%)
S4 Visitor WoW growth:    +___% (scale: positive 3 weeks)

All scale criteria met 3 consecutive weeks? Yes / No

DECISION: Kill / Keep / Scale
THIS WEEK'S PRIORITY: ___
```

---

## History

| Week | Visitors | Decision | Priority |
|------|----------|----------|----------|
| (start after Week 4) | | | |

---

## Qualitative Override

Data can be overridden — but only to **delay killing**, never to justify scaling.

**Valid:**
- 5+ target users (indie hackers, founders) describe the product as solving a real problem
- Unprompted word-of-mouth (someone sharing without being asked)

**Not valid:**
- "We haven't had enough time yet" (12-week hard clock)
- "We just need to fix X" (fix X first, then reassess)
- Personal attachment to the idea
