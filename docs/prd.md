# idea-fork — PRD

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-02-20
**Type:** Product PRD (MVP)

---

## 1. Problem / Opportunity

### The Problem

Builders — indie hackers, early-stage founders, and product managers — need validated product ideas grounded in real user pain. Today, discovering these ideas is entirely manual: browsing Reddit threads, scanning app store reviews, skimming forums, and hoping to spot a pattern. Even when a promising complaint surfaces, there's no systematic way to assess whether the need is widespread or to synthesize scattered signals into a coherent opportunity.

### Impact

- Builders report spending **5+ hours/week** on manual need discovery (hypothesis; to be validated via user interviews, n=10)
- Existing tools stop at data collection — **zero tools** take users from raw complaints to synthesized, actionable product briefs
- The indie hacker ecosystem continues to grow, with more builders adopting data-driven discovery methods — yet the tooling gap persists

### Evidence

| Signal | Source |
|--------|--------|
| "I spend hours on Reddit and still can't tell if a need is real" | Common indie hacker sentiment (Reddit, Indie Hackers forum) |
| Gummysearch, SparkToro popular but limited | Competitor usage — neither provides synthesis or opportunity framing |
| ChatGPT brainstorming lacks grounding | Users resort to LLMs but outputs aren't backed by real data |
| LLM costs dropped enough for full pipeline | Gemini Flash makes tagging/synthesis affordable at scale; embedding clustering reduces LLM cost further |

### Why Now

- LLMs can tag, cluster, and synthesize unstructured text at low cost — the full pipeline from raw post to product brief is now technically and economically feasible
- The indie hacker ecosystem is growing; builders increasingly demand data-driven discovery
- No existing tool covers the end-to-end journey from need discovery to business opportunity

---

## 2. Target Users & Use Cases

### Primary Personas

| Persona | Context | Primary Need |
|---------|---------|--------------|
| **Indie hacker / Solo developer** | Has skills to build, lacks a validated idea | Find a real problem worth solving, fast |
| **Early-stage founder** | Pre-commit or exploring pivots | Validate that a market pain exists before investing resources |
| **Product manager** | Owns roadmap at a startup or mid-size company | Identify unmet needs and feature gaps beyond internal feedback loops |

### Top Use Cases (ordered by priority)

**UC-1: Browse real user complaints to spot opportunities**
> "When I'm looking for my next project, I want to browse real user complaints across platforms, so I can find problems worth solving."

Current journey: Open Reddit → search subreddits → manually read threads → copy interesting posts to a doc → repeat for other platforms. Takes hours, no aggregation, no way to gauge pattern strength.

**UC-2: Read a synthesized product brief for a validated need**
> "When I find a cluster of similar complaints, I want to read a synthesized brief that frames the opportunity, so I can decide whether to pursue it."

Current journey: Manually re-read saved posts → try to find commonalities → write own summary in Notion or ask ChatGPT (which hallucinates and lacks grounding). Output quality varies wildly.

**UC-3: See what products are trending and where users are frustrated**
> "When I want to understand the competitive landscape, I want to see trending products alongside their user complaints, so I can find gaps and weaknesses."

Current journey: Check Product Hunt → read app store reviews one by one → cross-reference with Reddit complaints. Fragmented and time-consuming.

---

## 3. Proposed Solution

idea-fork is a web app that aggregates user complaints from multiple platforms, clusters them by theme, and uses LLMs to generate product opportunity briefs — each claim backed by linked source posts.

**Three connected experiences:**

1. **Feed** — A stream of tagged user complaints and needs from Reddit, app stores, and forums. Users browse, filter, and click through to original sources.
2. **AI Briefs** — Auto-generated product opportunity briefs synthesized from clustered needs. Every claim links to real posts. Briefs frame the problem, estimate demand signals, and suggest solution directions.
3. **Products** — Trending and newly launched products paired with aggregated user complaints. See what's gaining traction and where users are frustrated.

**Value propositions:**

1. **End-to-end pipeline** — Go from raw complaints to actionable product briefs in one place
2. **Zero friction** — No login required to browse the feed and read briefs
3. **AI with receipts** — Every synthesized claim links back to real user posts

---

## 4. Goals & Success Metrics

| Goal | Metric | Target | Timeframe |
|------|--------|--------|-----------|
| Users find value in the feed | Weekly active users (WAU) browsing feed | 500 WAU | 3 months post-launch |
| Briefs are useful enough to act on | Brief "useful" rating (thumbs up/down) | ≥ 60% positive | 3 months post-launch |
| Users return regularly | Week-1 retention (return within 7 days) | ≥ 30% | 3 months post-launch |
| Validate paid conversion potential | Waitlist signups for premium features | 200 signups | 3 months post-launch |

**Counter-metric:** Brief quality score (manual review of sample briefs) — ensure speed optimizations don't degrade synthesis quality.

---

## 5. Functional Requirements (MVP)

### Feed

- **[P0]** Display a paginated stream of user complaints/needs aggregated from at least one platform (Reddit)
- **[P0]** Each post shows: title/snippet, source platform, original post date, tags (category, sentiment, post type), and link to original source
- **[P0]** Classify each post into one of 10 post types via LLM pipeline: `need`, `complaint`, `feature_request`, `alternative_seeking`, `comparison`, `question`, `review`, `general_discussion`, `praise`, `showcase`. The first 7 are actionable types exposed as filter tabs in the feed UI
- **[P0]** Filter feed by post type (tab bar: All + 7 actionable types)
- **[P0]** Filter feed by tag/category (independent of post type filter)
- **[P1]** Filter feed by source platform
- **[P1]** Sort feed by recency or trending (engagement-weighted)
- **[P1]** Search feed by keyword
- **[P0]** Add additional source platforms (App Store reviews, Google Play reviews)

### AI Briefs

- **[P0]** Display a list of AI-generated product opportunity briefs
- **[P0]** Each brief contains: problem summary, demand signals (number of related posts, platforms), suggested solution directions, and linked source posts
- **[P0]** Every claim in a brief links to at least one real source post
- **[P1]** Brief detail page with full synthesis, all source posts, and related briefs
- **[P1]** Users can rate briefs as useful/not useful (no login required; device fingerprint or session-based)
- **[P2]** "Generate brief" from a user-selected cluster of feed posts

### Products

- **[P0]** Ingest trending/recently launched products from Product Hunt API
- **[P0]** Display a list of trending/recently launched products
- **[P0]** Each product paired with aggregated user complaints from feed data
- **[P0]** Product detail page showing: product info, complaint summary, linked source posts
- **[P2]** Product comparison view (side-by-side complaints for competing products)

### Data Pipeline (backend)

- **[P0]** Ingest posts from Reddit API on a scheduled basis
- **[P0]** Ingest tech news from RSS feeds (Hacker News, TechCrunch, etc.)
- **[P0]** Gemini LLM-based tagging: classify each post by `post_type` (10 types — 7 actionable + 3 non-actionable), topic tags, and sentiment
- **[P0]** Embedding-based clustering: Gemini Embedding API + HDBSCAN for automatic thematic grouping (replaces LLM clustering for scalability)
- **[P0]** Brief generation: synthesize briefs from post clusters using Gemini LLM with source attribution
- **[P0]** Google Trends integration: include search trend data as demand signals in briefs
- **[P0]** Product Hunt API: fetch recent products for competitive landscape analysis in briefs
- **[P1]** Deduplication: detect and merge near-duplicate posts
- **[P1]** Quality scoring: rank posts and clusters by signal strength (engagement, specificity, recency)
- **[P0]** Ingest from App Store and Google Play (reviews/ratings)

### General

- **[P0]** No login required to browse feed, read briefs, or view products
- **[P0]** Responsive web design (mobile and desktop)
- **[P0]** SEO-friendly pages (feed items and briefs are indexable)
- **[P1]** Simple analytics: track page views, brief reads, and source link clicks
- **[P2]** Optional account creation for bookmarking and personalized feeds
- **[P2]** Email digest: weekly summary of top new briefs (requires account)

---

## 6. User Journeys

### Journey 1: First-Time Visitor — Browse Feed (UC-1)

**User goal:** Find interesting user complaints to spark product ideas.

1. User lands on homepage (via search, social share, or direct link)
2. Homepage shows the feed immediately — a stream of tagged user complaints. No splash screen, no signup wall
3. User scans post cards. Each card shows snippet, source platform icon, tags, and age
4. User taps a tag to filter (e.g., "SaaS", "mobile app", "complaint"). Feed updates instantly
5. User reads a post that resonates, taps "View original" to verify on the source platform
6. User notices a "Related brief" link on the post card — taps to explore the synthesized opportunity

**Design principles applied:**
- **Hick's Law:** Feed is the single focus on landing. No competing CTAs, no hero section
- **Progressive disclosure:** Tags and filters appear inline; advanced filters available on demand
- **Zero-friction:** No login, no onboarding. Value is visible immediately

**Edge cases:**
- Feed is empty (cold start): show a loading state with explanation ("Analyzing latest posts…")
- Post source link is dead: show "Original post unavailable" with cached snippet

### Journey 2: Reader — Explore an AI Brief (UC-2)

**User goal:** Understand a product opportunity and decide whether to pursue it.

1. User arrives at a brief (from feed link, briefs listing page, or direct URL)
2. Brief page shows: problem statement, demand signals (post count, platform spread, recency), and suggested solution directions
3. Each claim in the brief is annotated with linked source posts (inline citations). User can tap any citation to expand the original post snippet
4. User scrolls to "Source Posts" section — full list of posts that informed this brief, with links to originals
5. User rates the brief (thumbs up/down) at the bottom of the page
6. Page footer suggests related briefs based on similar topics

**Design principles applied:**
- **Cognitive load:** Brief is structured with clear headings. Key numbers (post count, platforms) are prominent
- **AI with receipts:** Every claim has a visible citation. Trust is built through transparency
- **Goal gradient:** Brief is structured top-down: summary → details → sources → action. Users can stop reading at any depth

**Edge cases:**
- Brief has few source posts (<3): display a "Low confidence" indicator
- User rates brief negatively: show a one-line optional feedback input ("What was missing?")

### Journey 3: Competitor Researcher — Explore Products (UC-3)

**User goal:** Find products that are gaining traction but have user frustrations.

1. User navigates to the Products tab
2. Products listing shows cards: product name, category, trending indicator, and complaint count
3. User sorts by "Most complaints" to find frustration hotspots
4. User taps a product to see its detail page: product info, complaint summary, and linked source posts
5. User identifies a gap — complaints about a specific missing feature across multiple posts
6. User taps "Related brief" if one exists, or returns to the feed filtered by that product's complaint tags

**Design principles applied:**
- **Fitts's Law:** Sort and filter controls are positioned near the listing, not in a distant sidebar
- **Progressive disclosure:** Product card shows summary; detail page reveals full analysis
- **Peak-end rule:** The moment of insight ("this product has 47 complaints about X") is made visually prominent

---

## 7. Scope & Non-Goals

### In Scope (MVP)

- Feed of aggregated user complaints (Reddit, App Store, Google Play)
- LLM-powered tagging, clustering, and brief generation
- AI Briefs listing and detail pages with source attribution
- Products listing and detail pages with complaint pairing
- No-login browsing experience
- Responsive web app (Next.js frontend, FastAPI backend)

### Out of Scope

- Full business plan generation — briefs are starting points, not investor decks
- Complex analytics dashboard (no cohort analysis, no trend charts beyond basic counts)
- Marketing automation or landing page builder
- Real-time brand monitoring or alerting
- User-generated content (no comments, no community features in MVP)
- Native mobile app
- Paid tier implementation (MVP is free; validate demand first)

### Future Consideration

- Premium features: custom alerts, advanced filters, API access, personalized digests
- Additional data sources: X/Twitter, Hacker News, Stack Overflow, G2, Trustpilot
- Brief export (PDF, Notion integration)
- Collaborative features: share briefs, team workspaces
- Korean market localization

---

## 8. Assumptions, Constraints & Dependencies

### Assumptions

| Assumption | Validation Plan |
|------------|----------------|
| Builders spend 5+ hours/week on manual need discovery | Interview 10 target users |
| LLM can reliably tag posts by type with ≥ 85% accuracy | Tag 1,000 posts, measure against human labels |
| AI-generated briefs are actionable enough to influence build decisions | Generate 10 sample briefs, get feedback from 5 users |
| Multi-source ingestion (Reddit, App Store, Google Play, Product Hunt) provides strong signal for MVP launch | Analyze volume and quality across platforms; compare coverage vs Reddit-only |

### Constraints

- **Solo developer** — all design, development, and operations handled by one person
- **Budget** — LLM API costs must stay under a manageable threshold; prefer smaller models (Haiku, GPT-4o-mini) for tagging, larger models for synthesis
- **Reddit API** — Rate limits and policy changes could impact data collection; must comply with API TOS
- **Legal** — Data collection must respect platform TOS and applicable privacy regulations (GDPR for EU users)

### Dependencies

- Reddit API access (approved developer account)
- Product Hunt API access (OAuth or developer token)
- App Store / Google Play review data access (scraping or third-party API)
- Google Gemini API access (tagging, embedding, synthesis)
- Google Trends API (via pytrends)
- Hosting infrastructure (Vercel for frontend, cloud provider for API and pipeline)

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Reddit API policy change breaks ingestion | High | Abstract data source layer; design for multi-source from day one |
| Briefs feel generic or unhelpful | High | Invest in prompt engineering; include user feedback loop; manual quality reviews |
| LLM tagging accuracy too low | Medium | Start with narrow categories; use few-shot prompting; human-in-the-loop for edge cases |
| Legal challenge on data collection | Medium | Review Reddit API TOS before launch; only display snippets with links to originals |
| Solo developer bottleneck | Medium | Ruthless MVP scoping; automate pipeline; defer non-essential features |

---

## 9. Timeline & Milestones

| Phase | Milestone | Target |
|-------|-----------|--------|
| **Phase 1: MVP** | Data pipeline (Reddit, App Store, Google Play ingestion + Product Hunt products + LLM tagging + clustering) working end-to-end. Feed, Products, AI Briefs pages all live. Full MVP deployed. | 8 weeks |
| **Phase 2: Validate & Iterate** | Collect user feedback, measure retention and brief ratings. Decide on paid tier direction. | +4 weeks |

---

## 10. Appendix

- [Product Brief](/docs/product-brief.md)
- [Web Folder Structure](/docs/structure-web.md)
- [API Folder Structure](/docs/structure-api.md)
