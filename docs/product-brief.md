# idea-fork — Product Brief

**Author:** zzoo | **Date:** 2026-02-18 | **Status:** Discovery
**Tagline:** From raw complaints to ready-to-build product briefs — powered by real data, not guesswork

---

## 1. Problem

### What problem are we solving?

Builders and product people go through the same painful cycle: manually browse Reddit, app stores, and forums for hours trying to find real user pain points, then struggle to determine if a need is worth building for, and finally have to synthesize scattered complaints into a coherent product direction — all by hand.

The problem is not just "finding needs" — it's the entire journey from **raw signal to actionable business opportunity**. Today, each step is manual, disconnected, and unrepeatable.

### Who has this problem?

- **Indie hackers & solo developers** — want to build a side project or micro-SaaS but can't find a validated idea to start with
- **Early-stage founders** — need to discover and validate real market pain points before committing resources to building a product
- **Product managers** — need to systematically identify unmet user needs and feature gaps to inform roadmap decisions, beyond internal feedback channels

### How do they solve it today?

| Current Approach | Limitation |
|-----------------|------------|
| Manually browsing Reddit/X | Time-consuming, unsystematic, can't aggregate patterns |
| Checking Product Hunt trends | Focuses on existing products, not unmet needs |
| Reading app store reviews | Tied to specific apps, not scalable |
| Google Trends / keyword research | Can't gauge problem "intensity", no path to product direction |
| Asking in communities | Low response rate, biased results |
| ChatGPT brainstorming | No grounding in real data — generates ideas without evidence |

### Why now?

- LLM maturity makes it possible to tag, cluster, and synthesize unstructured text at low cost — enabling the full pipeline from raw posts to product briefs
- The indie hacker / solo developer ecosystem is growing rapidly, and more founders and PMs are adopting data-driven discovery practices
- Existing tools (SparkToro, Gummysearch) focus on data collection with complex UIs — no tool takes users from need discovery all the way to business opportunity assessment

---

## 2. Hypotheses & Risks

| Hypothesis | Risk Type | Validation Plan |
|-----------|-----------|-----------------|
| Builders (indie hackers, founders, PMs) spend 5+ hours/week on manual need discovery | Value | Interview 10 target users across all 3 segments |
| LLM can reliably tag posts (complaint/need/feature-request/etc.) | Feasibility | Tag 1,000 Reddit posts, measure accuracy against manual labels |
| AI-generated briefs are useful enough to act on | Value | Generate 10 sample briefs from Reddit data, get feedback from 5 target users |
| The product can deliver enough value for paid conversion | Viability | Landing page pre-signup + price testing |
| Users can intuitively navigate feed + briefs | Usability | Usability test with 5 users on prototype |
| Public data from Reddit/app stores can be legally collected | Viability | Review each platform's API TOS + legal check |

---

## 3. Proposed Direction

### High-level approach

idea-fork provides two connected experiences, both powered by a single periodic fetching pipeline:

1. **Feed** — A periodically updated stream of user complaints and needs from across platforms. Browse raw signal, click through to original sources.
2. **AI Briefs** — Auto-generated mini product briefs synthesized from clustered needs at each fetching cycle. Every claim backed by linked source posts.

The feed gives users the raw material. The briefs give users the "so what" — turning scattered complaints into business opportunities they can evaluate and act on. Think "Product Hunt for problems" meets "AI-powered opportunity research."

### Data pipeline

A single periodic fetching job handles both feed population and brief generation in one pass:

```
[Scheduled job — e.g. daily or every N hours]

1. Fetch all posts from target sources
2. LLM tags each post (complaint, need, feature-request, discussion, self-promo, etc.)
3. Rank by platform engagement metrics (upvotes, comments, likes, etc.)
4. Store tagged posts → populate feed
5. Cluster similar needs across new + recent posts (e.g. 800 tagged posts → ~50 clusters)
6. Rank clusters by business viability (volume × intensity × competitive gap)
7. Generate mini product briefs for only the top ~10 clusters → populate /briefs
```

This is not real-time. The feed updates on a fixed schedule, and AI briefs are generated as part of the same cycle. One pipeline, two outputs.

Nothing is hidden in the feed. The default view prioritizes `complaint`, `need`, and `feature-request` tags, but users can switch to see all posts. This avoids false negatives while still surfacing signal over noise.

| Platform | Collection Strategy | Engagement Signal | Cost | Phase |
|----------|-------------------|-------------------|------|-------|
| Reddit | All posts from target subreddits (r/SaaS, r/selfhosted, r/Entrepreneur, r/smallbusiness, r/nocode, r/productivity, r/webdev, r/devops, r/ecommerce, r/freelance, etc.) | Upvotes, comment count, awards | Free (API) | 1 |
| Product Hunt | All comments per product | Upvotes, comment count | Free (API) | 1 |
| Play Store | 1-3 star reviews from SaaS-related categories (Productivity, Business, Tools), apps with 1K+ downloads | Review helpfulness votes, repeat complaint frequency | Free (scraping) | 1 |
| GitHub Trending | Daily/weekly trending repos via `/trending` scraping or API star-tracking (`created:>DATE sort:stars`) | Star growth rate (daily/weekly delta), fork count | Free (API) | 1 |
| App Store | 1-3 star reviews, same categories as Play Store | Review helpfulness votes, repeat complaint frequency | Free (scraping) | 2+ |

LLM cost estimate: ~2,000 posts/cycle × Haiku-tier model = **~$1-2/cycle** for tagging + brief generation.

Briefs are not generated per post. They are generated per **need cluster** — a group of posts expressing the same underlying problem. Only the highest-ranking clusters (by volume × intensity × competitive gap) get a brief. Each AI-generated brief contains:

- **Problem summary** — "N people expressed frustration about X across Y platforms"
- **Source evidence** — 3-5 representative original post links as references
- **Volume & intensity** — mention count, sentiment intensity, trend direction (growing/declining)
- **Existing alternatives** — competitor products mentioned in the posts and their shortcomings
- **Opportunity signal** — one-line AI assessment of business viability

Briefs are browsable on a dedicated `/briefs` page, separate from the main feed. Every claim links back to real posts — no unsupported AI opinions.

### Layout

The main layout has two areas: a **unified feed** (center) and a **trending keywords side panel** (right). The side panel shows ranked trending keywords with platform tabs (Reddit, App Store, Hacker News, etc.) — similar to Product Hunt's "Trending Forum Threads" panel. Clicking a keyword filters the main feed. This gives platform-specific context without fragmenting the core feed experience.

The `/briefs` page is a separate view showing AI-generated product briefs as a card list, sorted by recency and opportunity score.

### Product layers

| Layer | Role | Price |
|-------|------|-------|
| **Feed** (hook) | Single unified feed — each card styled to its source platform, sorted by tag + engagement. Click to jump to original post | Free |
| **AI Briefs** (core value) | Each fetching cycle, similar posts are clustered and only the top ~10 clusters get an auto-generated mini product brief — problem summary, source links, volume/intensity, competitive landscape, opportunity assessment | Free (titles only) / Pro (full brief) |
| **Deep dive** (value) | Click a need → frequency, intensity, original posts, related need clusters | Free (limited) / Pro |
| **Tracking** (retention) | Register keywords/domains → get notified when new relevant needs surface | Pro |

The feed attracts users with raw signal. AI Briefs convert them by delivering actionable business opportunities. Tracking retains them with personalized monitoring.

### What differentiates this?

- **Need discovery to business opportunity in one place:** No other tool takes users from raw complaints to synthesized product briefs
- **Zero friction:** No login required to browse. Open the site, see the latest needs instantly
- **Feed-first UX:** Lightweight, scrollable, habit-forming — not a complex analytics dashboard
- **Unified feed, native card styles:** One feed stream — each card inherits the visual language of its source platform so users instantly recognize the source
- **Tag, don't filter:** LLM tags every post but nothing is hidden — users see everything, prioritized by relevance + engagement
- **Direct to source:** Click any card to jump straight to the original post
- **AI Briefs with receipts:** Every claim in generated briefs is backed by linked source posts — not unsupported AI opinions

### Non-Goals

- Not a full business plan generator — briefs are starting points, not final documents
- Not a complex analytics dashboard (Exploding Topics, SparkToro)
- Not a marketing automation or landing page builder
- Not a real-time brand monitoring tool

---

## 4. Success Criteria

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Daily Active Feed Viewers | N/A | 1,000 within 3 months of launch | PostHog analytics |
| Feed → Deep dive click rate | N/A | 15%+ of feed viewers | PostHog funnel |
| AI Brief page views / week | N/A | 30%+ of WAU visit `/briefs` | PostHog analytics |
| Return visitor rate (weekly) | N/A | 40%+ visit 3+ days/week | PostHog cohort |
| Free → Pro conversion rate | N/A | 5% of registered users | Stripe + PostHog |
| "Found a useful opportunity" (survey) | N/A | 60%+ satisfaction | In-app micro-survey |

---

## 5. Audience & Market Context

### Target user scenarios

> **Indie hacker — Alex:** Opens idea-fork over morning coffee. Scrolls through the feed — a Reddit-styled card about project management complaints, an App Store review about missing features. Taps one, lands on the original thread. Then checks `/briefs` — this week's top brief is about invoicing pain points for freelancers, backed by 83 posts across Reddit and App Store. He reads the brief, clicks through to 3 source posts, and starts sketching a solution. Total time: 10 minutes.

> **Founder — Sarah:** Quit her job to start a company in HR tech. Sets up keyword tracking for "HR", "hiring", "onboarding" on idea-fork. Every Monday she gets a digest of new needs in her domain. After 2 weeks, an AI brief surfaces "onboarding checklist fatigue" as a growing cluster — 40+ posts in 2 weeks, no clear winner in the market. She has her starting point.

> **Product Manager — James:** Manages a B2B analytics tool. Tracks competitor names on idea-fork to monitor what users complain about. An AI brief flags "dashboard export limitations" as a rising need with 60+ complaints across Reddit and G2. He shares the brief link with his team — it becomes next quarter's feature candidate.

### Competitive landscape

| Competitor | Strength | Weakness | Our Angle |
|-----------|----------|----------|-----------|
| Gummysearch | Reddit niche community exploration | Complex setup, manual analysis, no synthesis | Zero-friction feed + AI briefs |
| SparkToro | Audience research, rich data | Marketing-focused, no need-to-opportunity path | Need discovery → business brief pipeline |
| Exploding Topics | Trend data, good content | Complex dashboard, no actionable output | Feed-first + AI-generated opportunities |
| Google Trends | Free, broad trends | Can't surface specific user needs | Specific complaints with source links + briefs |
| Manual browsing + ChatGPT | Free, flexible | No aggregated data, no cross-post patterns | Briefs grounded in real multi-source data |

### Pricing hypothesis

- **Free:** Full feed access, AI brief titles + summaries, limited deep dives (3/day)
- **Pro ($9/mo):** Full AI briefs, unlimited deep dives, keyword/domain tracking, weekly digest email, bookmarks

---

## 6. Scope & Timeline

### Phased rollout

| Phase | What to Build | Key Activities |
|-------|---------------|---------------|
| **Phase 1 — Feed + AI Briefs** | Periodic fetching pipeline (Reddit + Product Hunt + Play Store → LLM tagging → clustering → brief generation) + unified feed UI + `/briefs` page + trending keywords side panel | All zero-cost sources, LLM tagging/clustering accuracy test, fetching schedule tuning, core feed + briefs experience |
| **Phase 2 — Deep dive** | Need detail view (frequency, intensity, original posts, related clusters) | Expandable cards or detail page, need quantification |
| **Phase 3 — Engagement** | Auth, bookmarks, keyword tracking, notifications, digest email | User accounts, Pro tier launch |
| **Phase 4 — Expand** | Additional data sources (App Store, etc.) | Platform integrations, multi-source feed + briefs |

---

## 7. Open Questions

- [ ] What are Reddit API rate limits and cost structure? (post-2024 pricing changes)
- [ ] What accuracy threshold for LLM tagging is acceptable? (tag errors are less critical than filter errors since nothing is hidden)
- [ ] What clustering approach works best for grouping similar needs? (embedding similarity, topic modeling, LLM-based)
- [ ] What fetching frequency is optimal? (daily? every 12h? every 6h?)
- [ ] How many AI briefs per cycle is the right amount? (too few = low value, too many = quality drops)
- [ ] Initial user acquisition channel? (Product Hunt, Indie Hackers, Twitter Build in Public?)
- [ ] Korean market vs global market — which to target first?
- [ ] Legal risk scope for data collection? (GDPR, platform TOS compliance)

---

## 8. Risks & Dependencies

- **Technical:** Reddit/platform API policy changes could require pipeline rebuild
- **Technical:** LLM tagging inaccuracy degrades feed quality (mitigated: nothing is hidden, just mis-prioritized)
- **Technical:** AI brief quality — if briefs feel generic or unsupported, core value proposition fails (mitigated: mandatory source linking)
- **Business:** Existing players (Gummysearch, etc.) could add similar features
- **Legal:** Platform-specific data collection policies and privacy regulations need review
- **Dependency:** LLM API costs for both tagging and brief generation impact margin structure

---

## 9. Team & Stakeholders

| Role | Person | Responsibility |
|------|--------|---------------|
| PM / Dev | zzoo | Product strategy, full-stack development, AI pipeline |

---

*Appendix: User interview results, detailed competitive analysis, and technical spike findings to be added.*
