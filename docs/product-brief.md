# idea-fork — Product Brief

**Author:** zzoo | **Date:** 2026-02-18 | **Status:** Discovery
**Tagline:** Product Hunt for problems — surface real demand, map it against supply, and generate actionable product briefs

---

## 1. Problem

### What problem are we solving?

Builders want to find real problems worth solving. That means understanding two things: **what users need** (demand) and **what's already out there** (supply). Only by seeing both can you spot the gap — unmet needs that no current product addresses well.

Today this is entirely manual. Builders browse Reddit and app store reviews to find complaints, then separately check Product Hunt and app stores to see what exists. Synthesizing these signals into a coherent product direction is disconnected and unrepeatable.

The problem isn't just "finding needs." It's the entire journey from **raw demand signal + supply landscape → actionable business opportunity**.

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

idea-fork maps **demand against supply** and surfaces the gaps as product opportunities.

1. **Feed (Demand)** — A stream of user complaints, needs, and feature requests aggregated from app store reviews and community platforms. The raw demand signal.
2. **Products (Supply)** — Newly launched and trending products from Product Hunt, App Store, and Play Store — paired with aggregated user complaints. The supply landscape and where it's failing.
3. **AI Briefs (Insight)** — Auto-generated product opportunity briefs synthesized from demand-supply gaps. Every claim backed by linked source posts. AI identifies where demand is high but supply is weak or absent.

The feed shows **what users want**. Products show **what exists**. Briefs reveal **where the opportunity is**.

### What differentiates this?

- **Demand × Supply:** No other tool maps user complaints against the current product landscape to find gaps
- **End-to-end:** From raw complaints to synthesized product briefs — no manual synthesis needed
- **Zero friction:** No login required to browse — open the site, see the latest needs
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

- [x] Reddit API access → Denied. Reddit kept as local-only/manual pipeline source. Production uses App Store, Play Store, RSS only.
- [ ] What LLM tagging accuracy is acceptable?
- [ ] Optimal clustering approach for grouping similar needs?
- [ ] Initial user acquisition channel?
- [ ] Korean market vs global market — which first?
- [x] Legal risk scope for data collection? → Reddit requires commercial license; App Store (public API), Play Store (scraping, gray area), Product Hunt (API with token) are usable.

---

## 6. Team

| Role | Person |
|---|---|
| PM / Dev | zzoo |
