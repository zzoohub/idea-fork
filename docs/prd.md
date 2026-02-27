# idea-fork -- PRD

**Status:** Active
**Last Updated:** 2026-02-23

---

## 1. Problem

Builders (indie hackers, early-stage founders, PMs) need validated product ideas grounded in real user pain. Finding a good idea requires understanding two sides: **demand** (what users need and complain about) and **supply** (what products already exist). Only by mapping demand against supply can you spot genuine opportunities — unmet needs that no current product solves well.

Today this discovery is entirely manual: browsing Reddit and app store reviews for complaints, checking Product Hunt for what exists, and hoping to spot patterns. No tool connects these signals to surface the gap.

**Why now:** LLMs can tag, cluster, and synthesize unstructured text at low cost. The full pipeline from raw demand + supply signals to product brief is technically and economically feasible.

---

## 2. Target Users

| Persona | Need |
|---------|------|
| Indie hacker / solo dev | Find a real problem worth solving |
| Early-stage founder | Validate market pain before investing |
| Product manager | Identify unmet needs beyond internal feedback |

---

## 3. Solution

idea-fork maps **user demand against product supply** to surface actionable opportunities. It aggregates complaints/needs (demand), tracks new and trending products (supply), and uses AI to identify gaps where demand is high but supply is weak or absent.

**Three experiences:**
1. **Feed (Demand)** -- User complaints, needs, and feature requests from app store reviews and community platforms. The raw demand signal.
2. **Products (Supply)** -- New and trending products from Product Hunt, App Store, Play Store — paired with aggregated user complaints. Where supply exists and how it's failing.
3. **AI Briefs (Insight)** -- Synthesized opportunity briefs generated from demand-supply gaps, with source attribution. AI connects unmet demand to actionable product directions.

---

## 4. Goals & Metrics

| Goal | Metric | Target | Timeframe |
|------|--------|--------|-----------|
| Users find value | WAU browsing feed | 500 | 3 months |
| Briefs are useful | Thumbs up rate | >= 60% | 3 months |
| Users return | W1 retention | >= 30% | 3 months |
| Paid potential | Premium waitlist signups | 200 | 3 months |

**Counter-metric:** Brief quality score (manual review) -- speed must not degrade synthesis quality.

---

## 5. Functional Requirements (MVP)

### Feed
- [P0] Paginated complaint stream from Reddit, App Store, Google Play
- [P0] Post card: title/snippet, source, date, tags, link to original
- [P0] Post type classification (10 types via LLM, 7 actionable as filter tabs): `need`, `complaint`, `feature_request`, `alternative_seeking`, `comparison`, `question`, `review` (actionable) + `showcase`, `discussion`, `other` (non-actionable)
- [P0] Filter by post type + tag/category
- [P0] Search results page (`/search`) with tabs: All, Briefs, Products, Posts
- [P1] Filter by source, sort by recency/trending, keyword search

### AI Briefs
- [P0] Brief listing + detail pages with problem, demand signals, solution directions, source posts
- [P0] Every claim links to real source posts
- [P1] Rating (thumbs up/down, no login)

### Products
- [P0] Products from Product Hunt, App Store, Play Store with complaint pairing via tag matching
- [P0] Product detail: header, complaint summary (metrics: total mentions, critical complaints, frustration rate), complaint themes, user complaints (sort by recent/popular/critical, filter by post type), related briefs

### Data Pipeline
- [P0] **Demand sources (production):** App Store reviews, Play Store reviews, RSS (HN, TechCrunch)
- [P0] **Demand sources (local-only):** Reddit — manual pipeline trigger only, due to API policy restrictions. Data flows to production DB.
- [P0] **Supply sources:** Product Hunt (API), App Store, Play Store
- [P0] Gemini LLM tagging (post_type, topics, sentiment)
- [P0] Embedding clustering (Gemini + HDBSCAN) + brief generation with attribution
- [P0] Google Trends integration for trend context
- [P1] Deduplication, quality scoring
- [P1] Additional demand source: X/Twitter API v2 (pay-per-use credits, 2M post reads/month cap)

### General
- [P0] No login for browsing. Responsive. SEO-friendly.
- [P1] Analytics (page views, brief reads, link clicks)

---

## 5b. Data Access Architecture

**As-Is:** `User → Next.js (Vercel) → apiFetch() → FastAPI (Cloud Run) → Neon DB`
**To-Be (production):** `User → Next.js (Vercel) → data layer → Neon DB directly (via @neondatabase/serverless)`
**Future:** `User → Next.js (Vercel) → data layer → FastAPI (deployed) → Neon DB` (flip env var)

The API server (FastAPI) is used exclusively for the data pipeline and is not deployed to production for serving reads. The Next.js app queries Neon directly using `@neondatabase/serverless`. The data access layer is switchable via the `DATA_SOURCE` env var (`neon` for direct DB, `api` for API server).

The pipeline continues to run locally and writes to the production Neon DB. Only the web read path changes — writes (rating mutations) use Next.js Server Actions that query Neon directly.

When adding new data sources (e.g., X/Twitter) or if the API server is deployed to production, switching back requires only setting `DATA_SOURCE=api`.

---

## 6. Scope

**In:** Feed, briefs, products, search, data pipeline, no-login browsing, responsive web (Next.js + FastAPI), Korean/English i18n.

**Out:** Business plan generation, analytics dashboards, marketing automation, real-time alerting, native mobile, paid tier (validate demand first).

**Future:** Premium features, X/Twitter API integration (pay-per-use, batch complaint/need tweet collection), brief export, collaboration.

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Reddit API access denied | Reddit is local-only/manual. Production pipeline runs without Reddit. Multi-source strategy reduces dependency. |
| Play Store scraping blocked | `google_play_scraper` is unofficial; monitor for breakage, prepare fallback |
| Briefs feel generic | Prompt engineering + demand-supply gap analysis + user feedback loop |
| LLM tagging accuracy | Narrow categories, few-shot prompting |
| Legal challenge | App Store (public API), Product Hunt (official API), Reddit (local only). Comply with each platform's TOS. |

---

## 8. Timeline

| Phase | Target |
|-------|--------|
| Phase 1: MVP (pipeline + all pages live) | 8 weeks |
| Phase 2: Validate & iterate | +4 weeks |
