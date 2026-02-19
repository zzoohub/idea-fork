# idea-fork — PRD

**Status:** Draft
**Author:** zzoo
**Last Updated:** 2026-02-19
**Reference:** [Product Brief](./product-brief.md)

---

## 1. Problem / Opportunity

### The problem

Builders — indie hackers, early-stage founders, and product managers — spend 5+ hours per week manually browsing Reddit, app store reviews, and forums trying to find real user pain points worth building for. The process is:

1. **Discovery is manual and unsystematic.** Browsing r/SaaS, r/Entrepreneur, Play Store reviews, Product Hunt comments one by one. No aggregation, no pattern detection across sources.
2. **Validation is guesswork.** Even after finding a complaint, there's no way to know if 5 people or 500 people share the same pain — without hours of additional searching.
3. **Synthesis is disconnected.** Translating scattered complaints into a coherent product direction requires manually reading dozens of posts, identifying themes, and writing up an opportunity assessment from scratch.

Each step is slow, unrepeatable, and disconnected from the next. The result: most builders either skip validation entirely (building on gut feel) or burn out during research and never start.

### Evidence

| Signal | Source |
|--------|--------|
| "I spend entire weekends scrolling Reddit looking for problems to solve" | Common pattern in r/SideProject, r/EntrepreneurRideAlong |
| ChatGPT brainstorming produces ideas with zero grounding in real demand | Widely reported limitation — generates plausible-sounding but unvalidated ideas |
| Gummysearch, SparkToro users report steep learning curves and no path from data to action | App store reviews, community feedback |
| Indie hacker / solo dev ecosystem growing rapidly; more builders need systematic discovery | Market trend |

### Why now

- **LLM cost collapse:** Haiku-tier models can tag, cluster, and synthesize thousands of posts for ~$1-2/cycle — making the full pipeline economically viable for the first time.
- **Growing builder ecosystem:** More indie hackers, solo devs, and early-stage founders are entering the market and adopting data-driven discovery.
- **Gap in existing tools:** Gummysearch, SparkToro, and Exploding Topics focus on data collection with complex UIs. No tool takes users from raw complaint discovery to actionable business opportunity assessment.

---

## 2. Target Users & Use Cases

### Primary personas

**Alex — Indie hacker / Solo developer**
- Context: Building side projects or micro-SaaS, works alone, limited time
- Need: Find a validated idea to start building — not brainstorm, but discover real demand
- Pain: Spends mornings scrolling Reddit/HN manually, can't tell signal from noise, gives up or builds on gut feel
- JTBD: "When I'm looking for my next project idea, I want to see real user complaints ranked by severity and frequency, so I can pick a problem worth solving."

**Sarah — Early-stage founder**
- Context: Committed to a domain (e.g., HR tech), needs to find the specific pain point to build around
- Need: Monitor a domain for emerging unmet needs and validate that a problem is widespread before committing resources
- Pain: Manual keyword searches across platforms, no way to track trends over time, synthesis is a blank Google Doc
- JTBD: "When I'm exploring a market, I want to see which problems are growing and underserved, so I can find my starting point with confidence."

**James — Product manager**
- Context: Manages an existing B2B product, needs external signal beyond internal feedback
- Need: Systematically identify unmet needs, feature gaps, and competitor weaknesses from public user complaints
- Pain: Internal feedback channels are biased toward vocal users; no systematic way to monitor the broader market
- JTBD: "When I'm planning next quarter's roadmap, I want to see what users are complaining about across the market, so I can prioritize features backed by real demand."

### Use cases

| # | Use Case | Persona | Priority |
|---|----------|---------|----------|
| UC1 | Browse a feed of tagged, ranked user complaints and needs from multiple platforms | All | P0 |
| UC2 | Read AI-generated product briefs synthesized from clustered needs | All | P0 |
| UC3 | Click through from any feed item or brief to the original source post | All | P0 |
| UC4 | Filter the feed by tag type (complaint, need, feature-request, etc.) | All | P0 |
| UC5 | Deep-dive into a specific need to see frequency, intensity, and all related posts | All | P0 |
| UC6 | Explore trending keywords to discover emerging topics | All | P1 |
| UC7 | Filter the feed by clicking a trending keyword | All | P1 |
| UC8 | Bookmark interesting feed items or briefs for later review | Sarah, James | P1 |
| UC9 | Register keywords or domains to track and get notified when new relevant needs surface | Sarah, James | P1 |
| UC10 | Receive a weekly digest email summarizing new needs in tracked areas | Sarah, James | P1 |
| UC11 | Browse trending/newly launched products and see aggregated user complaints about each | All | P1 |
| UC12 | Deep-dive into a specific product to assess its weaknesses and the opportunity gap | Alex, Sarah | P1 |

---

## 3. Proposed Solution

idea-fork is a "Product Hunt for problems" — a website where builders browse real user complaints from across the internet and read AI-generated product briefs that turn those complaints into actionable business opportunities.

**Four product layers, one pipeline:**

1. **Feed (hook)** — A periodically updated, unified stream of user complaints and needs from Reddit, Product Hunt, Play Store, and App Store. Each post is LLM-tagged (complaint, need, feature-request, etc.) and ranked by engagement. Cards are styled to their source platform. Click any card to jump to the original post.

2. **AI Briefs (core value)** — Auto-generated mini product briefs on `/briefs`, synthesized from clusters of similar needs. Each brief includes a problem summary, source evidence (linked posts), volume/intensity metrics, competitive landscape, and an opportunity signal. Generated only for the top ~10 clusters per cycle.

3. **Deep Dive (value)** — Click a need from the feed or brief to see a detail view: frequency over time, sentiment intensity, all original source posts, and related need clusters.

4. **Products (differentiation)** — A `/products` page showing trending and newly launched products from Product Hunt, GitHub, Play Store, and App Store — each paired with aggregated user complaints and needs. Not a simple popularity chart: the unique value is "what's hot AND what's broken about it." Click a product to see its full complaint profile, competitive weaknesses, and related AI briefs.

5. **Tracking (retention)** — Register keywords or domains to monitor. Get notified when new relevant needs surface. Weekly digest email with personalized updates.

**Key value propositions:**

- **From noise to signal in seconds:** No manual browsing. Open the site, see ranked needs instantly.
- **From signal to opportunity:** AI briefs transform scattered complaints into structured business assessments — every claim backed by real source links.
- **Zero friction start:** No login required to browse the feed. Sign up only when you want to save, track, or unlock full briefs.

---

## 4. Goals & Success Metrics

| Goal | Metric | Target | Timeframe | Counter-metric |
|------|--------|--------|-----------|----------------|
| Attract builders to the feed | Daily Active Feed Viewers | 1,000 | 3 months post-launch | Bounce rate < 60% |
| Feed delivers actionable signal | Feed → Deep dive click rate | 15%+ of feed viewers | 3 months post-launch | Time on page > 30s |
| AI Briefs deliver clear value | AI Brief page views / week | 30%+ of WAU visit `/briefs` | 3 months post-launch | Brief bounce rate < 50% |
| Users form a habit | Return visitor rate | 40%+ visit 3+ days/week | 3 months post-launch | — |
| Convert free users to Pro | Free → Pro conversion rate | 5% of registered users | 6 months post-launch | Churn rate < 10%/month |
| Users find useful opportunities | "Found useful opportunity" survey | 60%+ satisfaction | 3 months post-launch | — |

---

## 5. Functional Requirements

### 5.1 Data Pipeline

**[P0] Periodic fetching job**
A scheduled job (configurable frequency — daily, every 12h, every 6h) that runs the full pipeline: fetch → tag → rank → store → cluster → generate briefs. One pipeline, two outputs (feed + briefs).

**[P0] Multi-source data collection**
Fetch posts from:
- Reddit: All posts from target subreddits (r/SaaS, r/selfhosted, r/Entrepreneur, r/smallbusiness, r/nocode, r/productivity, r/webdev, r/devops, r/ecommerce, r/freelance)
- Product Hunt: Comments per product
- Play Store: 1-3 star reviews from SaaS-related categories (Productivity, Business, Tools) for apps with 1K+ downloads
- App Store: 1-3 star reviews, same categories as Play Store
- GitHub Trending: Daily/weekly trending repositories via `/trending` page scraping or GitHub API (`created:>DATE sort:stars` query). Captures repo name, description, language, star count, star growth rate, fork count

**[P0] LLM tagging**
Each fetched post is tagged by an LLM (Haiku-tier) with a category: `complaint`, `need`, `feature-request`, `discussion`, `self-promo`, `other`. Store the tag alongside the post.

**[P0] Engagement ranking**
Rank posts within the feed using platform-native engagement signals:
- Reddit: upvotes, comment count
- Product Hunt: upvotes, comment count
- Play Store / App Store: review helpfulness votes, repeat complaint frequency
- GitHub: star growth rate (daily/weekly delta), fork count

**[P0] Need clustering**
Cluster similar needs across new + recent posts using embedding similarity or LLM-based grouping. Example: ~800 tagged posts → ~50 clusters.

**[P0] Cluster ranking**
Rank clusters by business viability: volume (post count) x intensity (sentiment strength) x competitive gap (are existing solutions mentioned as inadequate?).

**[P1] Product entity resolution**
Group posts and reviews by the product they reference. Match mentions across platforms (e.g., "Notion" on Reddit + Product Hunt + Play Store = one product entity). For each product entity, aggregate: total post/review count, complaint count, platform sources, engagement metrics, and sentiment summary. This enables the Products page.

**[P0] AI brief generation**
For the top ~10 ranked clusters per cycle, generate a mini product brief containing:
- Problem summary: "N people expressed frustration about X across Y platforms"
- Source evidence: 3-5 representative original post links
- Volume & intensity: mention count, sentiment intensity, trend direction (growing/stable/declining)
- Existing alternatives: competitor products mentioned in posts and their shortcomings
- Opportunity signal: one-line AI assessment of business viability

### 5.2 Feed

**[P0] Unified feed page (`/`)**
A single scrollable feed displaying tagged posts from all sources, sorted by tag relevance + engagement score. Default view prioritizes `complaint`, `need`, and `feature-request` tags at the top.

**[P0] Platform-native card styling**
Each feed card inherits the visual language of its source platform (Reddit, Product Hunt, Play Store, App Store, GitHub) so users instantly recognize the source. Each card shows: post title/excerpt, source platform, tag badge, engagement metrics, and timestamp.

**[P0] Source link-through**
Every feed card links to the original post on the source platform. Click/tap to open in a new tab.

**[P0] Tag filtering**
Users can filter the feed by tag type. Default: `complaint`, `need`, `feature-request`. Option to show all posts (including `discussion`, `self-promo`, `other`). Nothing is hidden — filters change sort priority, not visibility.

**[P0] Pagination / infinite scroll**
Feed loads incrementally as the user scrolls. Initial load shows the most recent cycle's results.

**[P1] Trending keywords side panel**
A right-side panel showing ranked trending keywords with platform tabs (Reddit, Product Hunt, Play Store, App Store, GitHub). Clicking a keyword filters the main feed to posts containing that keyword.

**[P1] Feed cycle indicator**
Show when the feed was last updated (e.g., "Updated 3 hours ago") so users understand the refresh cadence.

### 5.3 AI Briefs

**[P0] Briefs page (`/briefs`)**
A dedicated page displaying AI-generated product briefs as a card list. Each card shows: brief title, problem summary (1-2 sentences), post count, platform sources, and opportunity score.

**[P0] Brief detail view**
Click a brief card to see the full brief: problem summary, source evidence (clickable links to original posts), volume & intensity metrics, existing alternatives, and opportunity signal.

**[P0] Briefs sorted by recency and opportunity score**
Default sort: most recent cycle first, then by opportunity score within each cycle.

**[P1] Brief cycle history**
Users can browse briefs from previous cycles (not just the latest).

**[P0] Free / Pro brief access**
Free users see brief titles and summaries only. Pro users see the full brief detail (source evidence, alternatives, opportunity signal).

### 5.4 Deep Dive

**[P0] Need detail view**
Click a need from the feed or from within a brief to open a detail view showing:
- Need description and tag
- Frequency: how many posts mention this need, with a timeline chart (growing/stable/declining)
- Intensity: average sentiment strength across posts
- All original source posts with links
- Related need clusters

**[P1] Related briefs**
From a need detail view, link to any AI brief that includes this need cluster.

**[P0] Free / Pro deep dive access**
Free users get 3 deep dives per day. Pro users get unlimited.

### 5.5 Products

**[P1] Products page (`/products`)**
A dedicated page displaying trending and newly launched products aggregated from all data sources. Each product card shows: product name, platform source, category, engagement metrics (upvotes, stars, downloads), complaint/need count, and a sentiment summary. The differentiator is pairing product popularity with user dissatisfaction data.

**[P1] Product data aggregation**
The pipeline groups posts and reviews by product entity. Entity resolution matches posts mentioning the same product across platforms (e.g., "Notion" on Reddit, Product Hunt, and Play Store). Each product accumulates:
- Product Hunt: upvotes, comment count, launch date
- GitHub: star count, star growth rate (daily/weekly delta), fork count, language
- Play Store / App Store: rating, download count, review count, low-star review count

**[P1] Product trending score**
Rank products by a composite trending score based on: recent engagement growth rate (not absolute size), recency of launch or major update, and volume of associated complaints/needs. Products with both high engagement AND high complaint volume rank highest (biggest opportunity signal).

**[P1] Product detail view (`/products/:id`)**
Click a product card to see:
- Product overview: name, description, platform(s), launch date, key metrics
- Complaint/need breakdown: aggregated user complaints and needs about this product, grouped by theme
- Sentiment summary: overall sentiment, top complaint themes, intensity
- Related AI briefs: briefs that reference complaints about this product
- Source link: direct link to the product's page on its source platform

**[P1] Product card platform sources**
Each product card shows which platforms it was found on (multi-platform badge). Products appearing on multiple platforms with complaints on each rank higher in the trending list.

**[P1] Products sorted by trending score and recency**
Default sort: trending score (composite of engagement growth + complaint volume). Secondary sort: most recently launched/updated first. Users can toggle between "Trending" and "New" sort modes.

**[P1] Free / Pro product access**
Free users see the product list with basic metrics. Pro users see the full product detail view including complaint breakdown, sentiment analysis, and related briefs.

### 5.6 Authentication & User Accounts

**[P0] Google OAuth login**
Users can sign up and log in via Google. No login required to browse the feed or view brief titles.

**[P1] Email/password login**
Alternative login method for users who prefer not to use Google.

**[P0] User profile**
Minimal profile: display name, email, account tier (Free/Pro), created date.

### 5.7 Bookmarks

**[P1] Bookmark feed items**
Logged-in users can bookmark any feed card. Bookmarked items appear in a `/bookmarks` page.

**[P1] Bookmark briefs**
Logged-in users can bookmark AI briefs for later review.

**[P1] Bookmarks page (`/bookmarks`)**
A dedicated page listing all bookmarked items (feed posts and briefs), sorted by bookmark date.

### 5.8 Tracking & Notifications

**[P1] Keyword tracking**
Logged-in Pro users can register keywords (e.g., "invoicing", "onboarding") to track. When new posts matching tracked keywords appear in the feed, the user is notified.

**[P1] Domain tracking**
Logged-in Pro users can register domains (e.g., "HR tech", "e-commerce") to monitor. Matches are based on keyword/topic relevance within the domain.

**[P1] In-app notifications**
A notification center showing new matches for tracked keywords/domains since the user's last visit.

**[P1] Weekly digest email**
Pro users receive a weekly email summarizing: new needs matching their tracked keywords/domains, new AI briefs relevant to their interests, and overall trending topics.

### 5.9 Pro Tier & Payments

**[P0] Free tier**
Full feed access. AI brief titles + summaries only. 3 deep dives/day. No bookmarks, tracking, or notifications.

**[P0] Pro tier ($9/mo)**
Full AI briefs. Unlimited deep dives. Bookmarks. Keyword/domain tracking. In-app notifications. Weekly digest email.

**[P0] Stripe integration**
Payment processing via Stripe. Monthly subscription. Users can upgrade, downgrade, and cancel from their account settings.

### 5.10 General

**[P0] Responsive design**
Works on desktop and mobile browsers. Feed is the primary mobile experience.

**[P0] Fast initial load**
Feed page loads and displays content within 2 seconds on a standard connection. No login gate, no splash screen.

**[P0] SEO-friendly rendering**
Feed and briefs pages are server-rendered for search engine indexing. Each brief has a unique, shareable URL.

**[P0] Analytics instrumentation**
Track key events via PostHog: feed page views, card clicks (with source), tag filter usage, brief page views, brief detail views, source link clicks, deep dive views, bookmark actions, tracking registration, upgrade/downgrade events.

---

## 6. User Flows

### 6.1 New visitor — Feed browsing

```
Landing page (/)
  → User sees unified feed (no login required)
  → Scrolls through platform-styled, tagged cards
  → [Optional] Taps a tag filter → feed re-sorts
  → [Optional] Clicks trending keyword in side panel → feed filters
  → Clicks a card → opens original post in new tab
```

### 6.2 Brief discovery

```
User navigates to /briefs (via nav)
  → Sees brief cards (title, summary, post count, score)
  → Clicks a brief card
    → Free user: sees title + summary, prompted to upgrade for full detail
    → Pro user: sees full brief (sources, alternatives, opportunity signal)
  → Clicks source evidence link → opens original post in new tab
```

### 6.3 Deep dive

```
User clicks "deep dive" on a feed card or within a brief
  → Free user (under daily limit): sees need detail (frequency, intensity, sources, related clusters)
  → Free user (over limit): prompted to upgrade
  → Pro user: full detail view, unlimited
  → Clicks source post link → original post in new tab
  → [Optional] Clicks related brief → navigates to that brief
```

### 6.4 Sign up & upgrade

```
User clicks "Sign up" or hits a gated feature (full brief, 4th deep dive, bookmarks, tracking)
  → Google OAuth flow → account created (Free tier)
  → [Optional] User navigates to account settings → clicks "Upgrade to Pro"
  → Stripe checkout → subscription active → Pro features unlocked
```

### 6.5 Tracking setup

```
Pro user navigates to /tracking (via nav or account settings)
  → Adds keywords (e.g., "invoicing", "onboarding")
  → Adds domains (e.g., "HR tech")
  → Next pipeline cycle: matching posts are flagged
  → User sees matches in notification center on next visit
  → Weekly digest email sent on Monday with matches + relevant new briefs
```

### 6.6 Product discovery

```
User navigates to /products (via nav)
  → Sees trending product cards (name, platform, metrics, complaint count)
  → [Optional] Toggles between "Trending" and "New" sort
  → Clicks a product card
    → Free user: sees product overview + complaint count summary, detail blurred
    → Pro user: sees full product detail (complaint breakdown, sentiment, related briefs)
  → Clicks source link → opens product page on source platform in new tab
  → Clicks related brief → navigates to /briefs/:id
  → Clicks a specific complaint → navigates to /needs/:id
```

### 6.7 Bookmarking

```
Logged-in user browses feed or briefs
  → Clicks bookmark icon on a card
  → Item saved to /bookmarks
  → User navigates to /bookmarks to review saved items
```

---

## 7. Scope

### In scope

- Data pipeline: fetch → tag → rank → store → cluster → generate briefs (all sources)
- Data sources: Reddit (API), Product Hunt (API), Play Store (scraping), App Store (scraping), GitHub Trending (API + scraping)
- Unified feed with tag filtering, platform-native cards, source link-through, trending keywords
- AI Briefs page with detail view, cycle history
- Products page with trending/new products paired with aggregated complaints, product detail view
- Deep dive need detail view with frequency, intensity, sources, related clusters
- Google OAuth + email/password authentication
- User accounts with Free / Pro tiers
- Bookmarks (feed items + briefs)
- Keyword and domain tracking with in-app notifications
- Weekly digest email for Pro users
- Stripe payments for Pro subscription ($9/mo)
- Responsive web (desktop + mobile)
- SEO-friendly server rendering
- PostHog analytics instrumentation

### Out of scope

- Real-time data — feed updates on a fixed schedule, not live
- Full business plan generation — briefs are starting points, not final documents
- Complex analytics dashboard UI (SparkToro/Exploding Topics style)
- Marketing automation or landing page builder
- Brand monitoring tool
- Native mobile app
- Team/organization accounts
- API access for third-party integrations
- Custom data source configuration by users

---

## 8. Assumptions, Constraints & Dependencies

### Assumptions

| Assumption | Validation needed |
|-----------|-------------------|
| Builders spend 5+ hours/week on manual need discovery | User interviews (n=10) |
| LLM (Haiku-tier) can reliably tag posts into categories with acceptable accuracy | Tag 1,000 Reddit posts, measure accuracy vs. manual labels |
| ~2,000 posts/cycle is sufficient volume to generate meaningful clusters | Pipeline dry run on real data |
| AI-generated briefs are useful enough to act on | Generate 10 sample briefs, get feedback from 5 target users |
| Users will discover the site through organic channels (Product Hunt launch, Twitter, Indie Hackers) | Landing page pre-signup + launch experiment |
| Public data from Reddit/Product Hunt/Play Store/App Store/GitHub can be legally collected under current API terms | Legal review per platform |
| $9/mo price point is viable for target users | Landing page price testing |

### Constraints

- **Solo developer:** zzoo handles PM, design, and full-stack development
- **Budget:** Minimize infrastructure costs; LLM costs ~$1-2/cycle for tagging + brief generation
- **Legal:** Must comply with Reddit API TOS (post-2024 pricing changes), Product Hunt API terms, Play Store and App Store scraping policies, GitHub API TOS (rate limits: 5,000 req/hr authenticated), GDPR
- **No real-time:** Pipeline is batch-based; feed freshness depends on cycle frequency

### Dependencies

| Dependency | Risk | Mitigation |
|-----------|------|------------|
| Reddit API availability and rate limits | Medium — Reddit has changed API pricing before | Monitor TOS, implement rate limiting, cache aggressively |
| Product Hunt API access | Low — public API available | Standard API integration |
| Play Store / App Store scraping stability | Medium — scraping targets can change HTML structure | Use established scraping libraries, monitor for breakage |
| GitHub API / Trending page | Low — API is stable; `/trending` page has no official API but structure is stable | Use GitHub REST API for star tracking; fall back to scraping `/trending` |
| LLM API (Haiku-tier) availability and pricing | Low — multiple providers available | Abstract LLM calls behind a provider interface |
| Stripe API for payments | Low — stable, well-documented | Standard integration |
| Google OAuth | Low — stable | Standard OAuth 2.0 flow |
| Email delivery service (digest) | Low — multiple providers (Resend, SendGrid, etc.) | Use a managed email service |

### Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| LLM tagging accuracy is too low — feed quality degrades | Medium | Medium | Nothing is hidden, only mis-prioritized; iteratively improve prompts; human spot-check samples |
| AI briefs feel generic or unsupported | High | Medium | Mandatory source linking; template constraints; quality review of first cycles |
| Reddit API policy change blocks data collection | High | Low | Diversify sources early; cache historical data; monitor TOS changes |
| Low initial traffic — no organic discovery | Medium | Medium | Planned Product Hunt launch; build-in-public on Twitter; post in target subreddits |
| Clustering produces noisy or overlapping groups | Medium | Medium | Experiment with embedding similarity vs. LLM-based grouping; tune cluster count |
| Pro conversion too low to sustain costs | Medium | Medium | Validate willingness-to-pay early; adjust free/pro boundary based on data |
| Email digest deliverability issues | Low | Low | Use established email service; monitor bounce rates |

---

## 9. Pricing

| | Free | Pro ($9/mo) |
|---|------|-------------|
| Feed access | Full | Full |
| AI Brief titles + summaries | Yes | Yes |
| Full AI Brief detail | No | Yes |
| Deep dives | 3/day | Unlimited |
| Products list (basic metrics) | Yes | Yes |
| Full product detail (complaints, sentiment, related briefs) | No | Yes |
| Bookmarks | No | Yes |
| Keyword/domain tracking | No | Yes |
| In-app notifications | No | Yes |
| Weekly digest email | No | Yes |

---

## 10. Timeline & Milestones

| Milestone | Deliverable |
|-----------|-------------|
| **M1 — Pipeline** | Data fetching from all sources → LLM tagging → clustering → brief generation running end-to-end |
| **M2 — Feed + Briefs + Products** | Feed UI + Briefs UI + Products UI + deep dive deployed, pipeline running on schedule |
| **M3 — Auth + Pro** | Google OAuth, user accounts, Stripe payments, free/pro gating |
| **M4 — Engagement** | Bookmarks, keyword/domain tracking, in-app notifications, weekly digest email |
| **M5 — Launch** | Product Hunt launch, analytics instrumented, initial user feedback cycle |

---

## 11. Appendix

- [Product Brief](./product-brief.md) — Problem space, hypotheses, competitive landscape, pricing hypothesis
- User interviews — TBD
- Technical architecture — TBD
- LLM tagging accuracy benchmarks — TBD
