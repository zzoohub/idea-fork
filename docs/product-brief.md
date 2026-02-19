# idea-fork — Product Brief

**Author:** zzoo | **Date:** 2026-02-18 | **Status:** Discovery
**Tagline:** Product Hunt for problems — from raw complaints to ready-to-build product briefs

---

## 1. Problem

### What problem are we solving?

Builders spend hours manually browsing Reddit, app stores, and forums trying to find real user pain points. Even when they find something, they can't tell if the need is big enough to build for — and synthesizing scattered complaints into a coherent product direction is entirely manual.

The problem isn't just "finding needs." It's the entire journey from **raw signal to actionable business opportunity**. Today, each step is manual, disconnected, and unrepeatable.

### Who has this problem?

- **Indie hackers & solo developers** — want to build but can't find a validated idea to start with
- **Early-stage founders** — need to discover real market pain before committing resources
- **Product managers** — need to identify unmet needs and feature gaps beyond internal feedback

### How do they solve it today?

| Current Approach | Limitation |
|---|---|
| Manually browsing Reddit/X | Unsystematic, can't aggregate patterns |
| Checking Product Hunt trends | Shows existing products, not unmet needs |
| Reading app store reviews | Tied to specific apps, not scalable |
| Google Trends / keyword research | Can't gauge problem intensity |
| ChatGPT brainstorming | No grounding in real data |

### Why now?

- LLMs can tag, cluster, and synthesize unstructured text at low cost — the full pipeline is now feasible
- The indie hacker ecosystem is growing; more builders adopt data-driven discovery
- Existing tools (SparkToro, Gummysearch) stop at data collection — none go from need discovery to business opportunity

---

## 2. Proposed Direction

idea-fork provides three connected experiences:

1. **Feed** — A stream of user complaints and needs aggregated from multiple platforms. Browse raw signal, click through to original sources.
2. **AI Briefs** — Auto-generated product opportunity briefs synthesized from clustered needs. Every claim backed by linked source posts.
3. **Products** — Trending and newly launched products paired with aggregated user complaints. See what's getting traction and where users are frustrated.

The feed gives users the **raw material**. Briefs give users the **"so what."** Products give users the **"who's failing."**

### What differentiates this?

- **End-to-end:** No other tool takes users from raw complaints to synthesized product briefs
- **Zero friction:** No login required to browse — open the site, see the latest needs
- **Feed-first:** Lightweight and scrollable, not a complex analytics dashboard
- **AI with receipts:** Every brief claim links back to real posts — no unsupported AI opinions

### Non-Goals

- Not a full business plan generator — briefs are starting points
- Not a complex analytics dashboard (Exploding Topics, SparkToro)
- Not a marketing automation or landing page builder
- Not a real-time brand monitoring tool

---

## 3. Hypotheses & Risks

| Hypothesis | Risk Type | Validation Plan |
|---|---|---|
| Builders spend 5+ hours/week on manual need discovery | Value | Interview 10 target users |
| LLM can reliably tag posts by type | Feasibility | Tag 1,000 posts, measure accuracy |
| AI-generated briefs are useful enough to act on | Value | Generate 10 sample briefs, get feedback from 5 users |
| Product can deliver enough value for paid conversion | Viability | Landing page pre-signup + price testing |
| Public data from platforms can be legally collected | Viability | Review each platform's API TOS |

### Key risks

- **Platform dependency:** API policy changes could break data collection
- **Brief quality:** If briefs feel generic, core value proposition fails
- **Competition:** Existing players could add similar features
- **Legal:** Platform-specific data collection policies need review

---

## 4. Competitive Landscape

| Competitor | Strength | Weakness | Our Angle |
|---|---|---|---|
| Gummysearch | Reddit community exploration | Complex setup, no synthesis | Zero-friction feed + AI briefs |
| SparkToro | Audience research | Marketing-focused, no opportunity path | Need → business brief pipeline |
| Exploding Topics | Trend data | No actionable output | Feed-first + AI-generated opportunities |
| Manual browsing + ChatGPT | Free, flexible | No aggregated data | Briefs grounded in real multi-source data |

---

## 5. Open Questions

- [ ] Reddit API rate limits and cost structure post-2024?
- [ ] What LLM tagging accuracy is acceptable?
- [ ] Optimal clustering approach for grouping similar needs?
- [ ] Initial user acquisition channel?
- [ ] Korean market vs global market — which first?
- [ ] Legal risk scope for data collection? (GDPR, platform TOS)

---

## 6. Team

| Role | Person |
|---|---|
| PM / Dev | zzoo |
