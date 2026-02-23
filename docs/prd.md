# idea-fork -- PRD

**Status:** Active
**Last Updated:** 2026-02-23

---

## 1. Problem

Builders (indie hackers, early-stage founders, PMs) need validated product ideas grounded in real user pain. Discovery is entirely manual: browsing Reddit, scanning app store reviews, hoping to spot patterns. No tool takes users from raw complaints to synthesized, actionable product briefs.

**Why now:** LLMs can tag, cluster, and synthesize unstructured text at low cost. The full pipeline from raw post to product brief is technically and economically feasible.

---

## 2. Target Users

| Persona | Need |
|---------|------|
| Indie hacker / solo dev | Find a real problem worth solving |
| Early-stage founder | Validate market pain before investing |
| Product manager | Identify unmet needs beyond internal feedback |

---

## 3. Solution

idea-fork aggregates user complaints, clusters them by theme, and generates product opportunity briefs -- every claim backed by source posts.

**Three experiences:**
1. **Feed** -- Tagged complaints from Reddit, app stores. Browse, filter, search.
2. **AI Briefs** -- Synthesized opportunity briefs with demand signals and source attribution.
3. **Products** -- Trending products paired with aggregated complaints. Find gaps.

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
- [P0] Reddit + RSS + App Store + Google Play ingestion; Product Hunt + App Store + Play Store products
- [P0] Gemini LLM tagging (post_type, topics, sentiment)
- [P0] Embedding clustering (Gemini + HDBSCAN) + brief generation with attribution
- [P0] Google Trends integration
- [P1] Deduplication, quality scoring

### General
- [P0] No login for browsing. Responsive. SEO-friendly.
- [P1] Analytics (page views, brief reads, link clicks)

---

## 6. Scope

**In:** Feed, briefs, products, search, data pipeline, no-login browsing, responsive web (Next.js + FastAPI), Korean/English i18n.

**Out:** Business plan generation, analytics dashboards, marketing automation, real-time alerting, native mobile, paid tier (validate demand first).

**Future:** Premium features, more data sources (X, HN, SO, G2), brief export, collaboration.

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Reddit API policy change | Multi-source abstraction |
| Briefs feel generic | Prompt engineering + user feedback loop |
| LLM tagging accuracy | Narrow categories, few-shot prompting |
| Legal challenge | Comply with API TOS, snippets + links only |

---

## 8. Timeline

| Phase | Target |
|-------|--------|
| Phase 1: MVP (pipeline + all pages live) | 8 weeks |
| Phase 2: Validate & iterate | +4 weeks |
