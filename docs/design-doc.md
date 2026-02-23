# idea-fork — Software Architecture Design Document

**Status**: Draft
**Author**: zzoo
**Date**: 2026-02-20
**PRD Reference**: [docs/prd.md](/docs/prd.md)

---

## 1. Context & Scope

### 1.1 Problem Statement

Builders (indie hackers, early-stage founders, PMs) spend 5+ hours/week manually browsing Reddit, app stores, and forums to find product ideas grounded in real pain. No tool covers the end-to-end journey from raw user complaint to synthesized product opportunity brief. LLM costs have dropped enough to make a full tagging → clustering → synthesis pipeline economically viable for a solo developer.

### 1.2 System Context Diagram

```
                          ┌──────────────────────────────────────┐
                          │           idea-fork system           │
                          │                                      │
  ┌────────┐   browse     │  ┌──────────┐      ┌─────────────┐  │
  │  User  │◀────────────▶│  │  Web App │◀────▶│  API Server │  │
  │(browser│              │  │ (Next.js)│      │  (FastAPI)   │  │
  └────────┘              │  └──────────┘      └──────┬──────┘  │
                          │                           │         │
                          │                    ┌──────▼──────┐  │
                          │                    │  PostgreSQL  │  │
                          │                    │    (Neon)    │  │
                          │                    └──────▲──────┘  │
                          │                           │         │
                          │                    ┌──────┴──────┐  │
                          │                    │ Data Pipeline│  │
                          │                    │  (scheduled) │  │
                          │                    └──────┬──────┘  │
                          └───────────────────────────┼─────────┘
                                                      │
                          ┌───────────────────────────┼─────────┐
                          │     External Services     │         │
                          │  ┌──────────┐  ┌──────────▼──────┐  │
                          │  │Reddit API│  │  Gemini API     │  │
                          │  └──────────┘  │(LLM + Embedding)│  │
                          │  ┌──────────┐  └─────────────────┘  │
                          │  │PH API    │  ┌─────────────────┐  │
                          │  └──────────┘  │  Google Trends   │  │
                          │  ┌──────────┐  └─────────────────┘  │
                          │  │RSS Feeds │  ┌────────────────┐   │
                          │  └──────────┘  │ App Store / GP  │   │
                          │                └────────────────┘   │
                          └─────────────────────────────────────┘
```

**Actors:**
- **Anonymous users** — browse feed, read briefs, view products, rate briefs. No login required for MVP.
- **Reddit API** — source of raw user complaints (ingestion target).
- **RSS Feeds** — tech news from Hacker News, TechCrunch, etc. (ingestion target).
- **Product Hunt API** — source of trending/new products (ingestion target + competitive context for briefs).
- **Google Trends** — search interest data included as demand signals in briefs.
- **App Store / Google Play** — source of app reviews and ratings (ingestion target).
- **Google Gemini API** — tagging (Gemini Flash), embedding (Gemini Embedding), brief synthesis (Gemini Flash). HDBSCAN for clustering (local, no API call).

**Data flows:**
- **Inbound (complaints)**: Reddit API, RSS Feeds, App Store, Google Play → Data Pipeline → PostgreSQL (raw posts, tags, clusters, briefs)
- **Inbound (products)**: Product Hunt API → Data Pipeline → PostgreSQL (products + competitive context in briefs)
- **Inbound (trends)**: Google Trends → Data Pipeline → demand signals in briefs
- **Read path**: User → Web App (Next.js SSR) → API Server → PostgreSQL → rendered page
- **Write path (MVP)**: Brief ratings only — User → API → PostgreSQL

### 1.3 Assumptions

| # | Assumption | If Wrong |
|---|---|---|
| 1 | Multi-source ingestion (Reddit, App Store, Google Play, Product Hunt) provides strong signal for MVP launch | Need to evaluate per-platform signal quality and adjust source weights |
| 2 | LLM tagging accuracy ≥ 85% with few-shot prompting | Need human-in-the-loop review or fine-tuned model |
| 3 | Read-heavy workload (100:1 read/write ratio in MVP) | May need write optimization earlier |
| 4 | < 10K daily active users for first 6 months | Scaling strategy can remain simple |
| 5 | Eventual consistency acceptable for feed/brief freshness (minutes, not seconds) | Would need real-time pipeline, significantly more complex |

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Serve feed pages with < 200ms TTFB (p95) for SEO and user experience
- Ingest and tag 10K+ posts/day across all sources (Reddit, App Store, Google Play, Product Hunt) with ≤ $5/day LLM cost
- Generate briefs from post clusters with full source attribution (every claim → source post)
- Support 500 WAU within 3 months with zero-login browsing
- Deploy and operate as a solo developer with < 2 hours/week ops overhead

### 2.2 Non-Goals

- **Real-time ingestion** — batch processing on a schedule (hourly/daily) is sufficient for MVP
- **User accounts / authentication** — MVP is fully anonymous. Session-based ratings only
- **Multi-region deployment** — single region (us-east) is sufficient for global MVP audience
- **Paid tier / billing** — validate demand first; waitlist only
- **Mobile native app** — responsive web only
- **Complex analytics dashboard** — basic page views and brief reads via PostHog

---

## 3. High-Level Architecture

### 3.1 Architecture Style

**System Architecture: Single service + scheduled pipeline (Request-Response + batch async)**

This is a content-heavy read app with a batch data pipeline. The user-facing path is standard request-response: user requests page → API queries database → returns data. The data pipeline runs on a schedule (cron), not triggered by user actions. No inter-service communication, no event bus needed.

*Rationale*: Solo developer, MVP stage, read-dominant workload. A modular monolith or microservice split would add operational overhead without benefit. The pipeline is a separate scheduled process but shares the same codebase and database — not a separate service. If the pipeline grows complex enough to warrant separation (e.g., processing millions of posts), it can be extracted later.

*Rejected alternatives*:
- **Event-driven (Pub/Sub)**: Overkill. There's one data producer (pipeline) and one consumer (the read API). No fan-out, no real-time requirements. Would add Pub/Sub cost and complexity for zero benefit.
- **CQRS**: The read/write models are nearly identical in MVP. Briefs are pre-computed by the pipeline — this is already a form of "read optimization" without the formal CQRS overhead.
- **Microservices (separate pipeline service)**: Adds deployment, networking, and monitoring overhead. Solo developer can't justify the ops cost.

**Code Structure: Hexagonal (Ports & Adapters)**

The API has meaningful domain logic (not just CRUD) — tagging rules, clustering heuristics, brief quality scoring — and multiple integration points (Reddit API, LLM APIs, PostgreSQL) that may change. Hexagonal architecture isolates domain logic from infrastructure, making it testable and adaptable.

*Rationale*: The project integrates with Reddit API (may change to other platforms), multiple LLM providers (may swap models/providers), and PostgreSQL (adapter could change). Ports and adapters let us swap these without touching domain logic.

*Rejected alternatives*:
- **Layered**: Simpler, but layers tend to leak when integrating multiple external APIs. The pipeline's LLM integration would bleed into the service layer.
- **Clean Architecture**: More boilerplate than hexagonal for the same isolation benefit. Overkill for a solo developer.

### 3.2 Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare CDN                           │
│                 (static assets, edge caching)                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│  Web App — Vercel (MVP) → Cloudflare Workers (post-MVP)         │
│  Technology: Next.js 16 + React 19 + Tailwind CSS 4             │
│  Responsibility: SSR pages (feed, briefs, products), SEO,       │
│                  static generation where possible                │
│  Communication: Calls API Server via REST (internal fetch)       │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST (JSON)
┌─────────────────────▼───────────────────────────────────────────┐
│  API Server — GCP Cloud Run                                     │
│  Technology: Python 3.12 + FastAPI + SQLAlchemy 2.0 (async)     │
│  Responsibility: REST API for feed, briefs, products, ratings.  │
│                  Data pipeline orchestration (scheduled).         │
│  Communication: Reads/writes PostgreSQL. Calls Reddit API and   │
│                 LLM APIs during pipeline runs.                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ SQL (asyncpg)
┌─────────────────────▼───────────────────────────────────────────┐
│  Database — Neon (PostgreSQL)                                   │
│  Technology: PostgreSQL 16 (Neon serverless)                    │
│  Responsibility: All persistent state — posts, tags, clusters,  │
│                  briefs, products, ratings.                      │
│  Communication: Accessed only by API Server.                    │
└─────────────────────────────────────────────────────────────────┘

External Services:
- Reddit API — data source for user complaints (called by pipeline)
- Product Hunt API — data source for trending/new products (called by pipeline)
- App Store / Google Play — data source for app reviews (called by pipeline)
- LLM APIs (Anthropic, OpenAI) — tagging, clustering, brief generation (called by pipeline)
- PostHog — user analytics (client-side + server-side events)
- Sentry — error tracking (both web and API)
```

### 3.3 Component Overview

The API server is organized into domain modules following hexagonal architecture:

**Domain Modules:**

| Module | Responsibility | Critical Path? |
|---|---|---|
| **post** | Raw user complaints. CRUD, filtering, search, tagging state. | Yes — feed is the landing page |
| **brief** | AI-generated opportunity briefs. Brief lifecycle, source attribution, ratings. | Yes — core value proposition |
| **product** | Trending products paired with complaints. Product info, complaint aggregation. | Yes — MVP feature |
| **pipeline** | Data ingestion + LLM processing. Reddit fetching, tagging, clustering, brief generation. | No — runs offline, not user-facing |

**Module relationships:**
- `brief` depends on `post` (briefs are synthesized from post clusters)
- `product` depends on `post` (products are paired with complaints)
- `pipeline` writes to `post`, `brief`, and `product` — it's the data producer
- Feed/Brief/Product read APIs are independent of each other (no cross-module queries on the read path)

**Frontend Feed Structure:**

The feed page uses a two-tier filter system:
1. **Post type tabs** — Horizontal tab bar (All + 7 actionable types). Maps to `?post_type=` URL param and `GET /v1/posts?post_type=` API query.
2. **Tag filter chips** — Independent tag-based filter (`?tag=`). Both filters can be combined (`?post_type=complaint&tag=saas`).

Each post card displays a `post_type` badge alongside sentiment and category badges.

---

## 4. Data Architecture

### 4.1 Data Flow

**Flow 1: Pipeline — Complaint sources → tagged posts → clusters → briefs**

```
Reddit API ─────────┐
RSS Feeds ──────────┤──fetch──▶ Raw posts ──Gemini tag──▶ Tagged posts ──embed+HDBSCAN──▶ Clusters ──Gemini synthesize──▶ Briefs
App Store reviews ──┤     │                        │                              │       (+ Trends + PH)        │
Google Play reviews ┘  store in DB         update DB (tags +              store in DB                    store in DB
                      (posts table)     post_type + sentiment)         (clusters table)               (briefs table)

Tagging assigns each post a `post_type` from 10 categories:
- **Actionable** (7): `need`, `complaint`, `feature_request`, `alternative_seeking`, `comparison`, `question`, `review`
- **Non-actionable** (3): `general_discussion`, `praise`, `showcase`

Only actionable post types are included as clustering input (ACTIONABLE_POST_TYPES filter). Non-actionable posts remain in the feed but are excluded from brief generation.
```

Clustering uses Gemini Embedding API for vectorization + HDBSCAN (scikit-learn) for automatic cluster detection. Each cluster is then labeled by a lightweight Gemini LLM call. This replaces the previous approach of sending all posts to the LLM for grouping, improving scalability and cost.

**Flow 1b: Pipeline — Product Hunt → products**

```
Product Hunt API ──fetch──▶ Trending/new products ──store in DB──▶ products table
                                                         │
                                              link to complaint posts
                                              via product name matching
```

Consistency: Pipeline runs as a single transaction per batch. Posts are tagged, then clustered, then briefs are generated — sequential within a pipeline run. Eventual consistency is acceptable (users see new data on next page load).

**Flow 2: User reads feed**

```
User ──GET /feed──▶ API Server ──query──▶ PostgreSQL (posts + tags)
                        │
                   filter/sort/paginate
                        │
                   ◀── JSON response ◀──
```

Consistency: Strong — reads directly from the primary database. No cache layer in MVP (Neon's connection pooling + query optimization is sufficient for expected load).

**Flow 3: User reads a brief**

```
User ──GET /briefs/:id──▶ API Server ──query──▶ PostgreSQL (brief + source posts)
                              │
                         join brief with linked posts
                              │
                         ◀── JSON response ◀──
```

### 4.2 Storage Strategy

**PostgreSQL (Neon) — single database, all persistent state**

| Data Category | Examples | Why PostgreSQL |
|---|---|---|
| Transactional | Posts, tags, clusters, briefs, ratings, products | Relational model fits naturally. Need joins (brief → source posts), filtering (tags), full-text search (feed keyword search). |
| Analytical (light) | Post counts per cluster, demand signals, trending scores | Computed during pipeline runs, stored as denormalized columns. No need for a separate analytics store at MVP scale. |

- **Consistency model**: Strong consistency for all reads (single primary, no read replicas in MVP).
- **Retention**: Posts older than 12 months archived (soft delete). Briefs retained indefinitely.

*Why not a document store (MongoDB)?*: The data is highly relational — briefs reference many posts, posts belong to many clusters, products link to posts. PostgreSQL handles this natively. Adding a document store would double the ops surface for a solo developer.

*Why Neon over Supabase?*: Neon's scale-to-zero pricing is critical for a pre-revenue MVP. Serverless branching simplifies development workflows. Supabase's bundled Auth/Realtime aren't needed (no auth in MVP, no real-time features).

### 4.3 Caching Strategy

**MVP: No application-level caching.**

Rationale: At < 10K DAU, Neon + Cloud Run can serve the read load directly. Adding Redis adds infrastructure cost and cache invalidation complexity. The pipeline writes new data in batches — pages can be statically generated or ISR'd by Next.js for the most common views.

**Post-MVP upgrade path**: If feed pages become a hot path:
1. Next.js ISR (Incremental Static Regeneration) with 5-minute revalidation for feed listing pages
2. Redis (GCP Memorystore) for API-level caching if ISR isn't sufficient

---

## 5. Infrastructure & Deployment

### 5.1 Compute Platform

| Container | Platform | Rationale |
|---|---|---|
| Web App | **Vercel** (MVP) → Cloudflare Workers (post-MVP) | Vercel for rapid MVP deployment — preview deploys, zero-config Next.js, built-in analytics. Migrate to Cloudflare Workers (via OpenNext) when cost optimization matters. |
| API Server | **GCP Cloud Run** | Container-based, auto-scales to zero, supports Python/FastAPI natively. Generous free tier (2M requests/month). Cold starts (~1-2s) acceptable for API calls behind SSR. |
| Data Pipeline | **GCP Cloud Run Jobs** (or Cloud Scheduler + Cloud Run) | Same codebase as API server, triggered on a cron schedule. No always-on infrastructure cost. |
| Database | **Neon** (us-east-1) | Scale-to-zero PostgreSQL. ~$0 at low usage, predictable scaling. Co-located with Cloud Run (us-east4) for low latency. |

*Rejected alternatives*:
- **Cloudflare Workers for API**: FastAPI is Python — can't run on V8 runtime. Would require rewriting in TypeScript or using WASM (not practical for Python ML/LLM libraries).
- **AWS Lambda for pipeline**: Adds a second cloud provider. GCP Cloud Run Jobs keeps everything in one ecosystem with unified billing and auth.

### 5.2 Deployment Strategy

```
Developer ──push──▶ GitHub ──trigger──▶ GitHub Actions
                                            │
                            ┌───────────────┼───────────────┐
                            ▼               ▼               ▼
                      Web: Vercel      API: Cloud Run   Pipeline: Cloud Run Jobs
                     (auto-deploy)    (build container   (same container,
                                       + deploy)        cron trigger)
```

- **Web**: Vercel auto-deploys on push to main. Preview deploys on PRs.
- **API**: GitHub Actions builds Docker image → pushes to GCP Artifact Registry → deploys to Cloud Run. Rolling update (zero-downtime).
- **Rollback**: Vercel: instant rollback to previous deployment. Cloud Run: traffic split to previous revision.

### 5.3 Environment Topology

| Environment | Web | API | Database | Purpose |
|---|---|---|---|---|
| **Development** | localhost:3000 | localhost:8080 | Neon branch | Local dev |
| **Preview** | Vercel preview URL | — (uses prod API or staging) | Neon branch | PR review |
| **Production** | Vercel production | Cloud Run (prod) | Neon main branch | Live |

No staging environment in MVP. Neon's branching model provides isolated database environments for development and preview without a separate instance.

---

## 6. Cross-Cutting Concerns

### 6.1 Authentication & Authorization

**MVP: No authentication.** All content is public. Brief ratings use anonymous session identifiers (cookie-based, no PII).

**Post-MVP upgrade path**: Google OAuth2 + self-issued JWT for optional accounts (bookmarking, personalized feeds). RBAC enforced in API middleware. Access token (15min, in-memory) + refresh token (30 days, httpOnly cookie).

### 6.2 Observability

| Concern | Tool | Details |
|---|---|---|
| **Error tracking** | Sentry | Both web (Next.js) and API (FastAPI). Source maps for web. |
| **User analytics** | PostHog | Client-side: page views, brief reads, source link clicks. Server-side: pipeline metrics (posts ingested, briefs generated). |
| **Logging** | Cloud Run built-in (Cloud Logging) | Structured JSON logs from FastAPI. Log levels: INFO for requests, WARNING for retries, ERROR for failures. |
| **Metrics** | Cloud Run built-in (Cloud Monitoring) | Request latency, error rate, instance count. Custom metrics for pipeline (posts/batch, LLM latency, cost). |
| **Alerting** | Cloud Monitoring alerts | Critical: API error rate > 5%, pipeline failure. Warning: LLM cost > daily budget, latency p95 > 500ms. |

No distributed tracing in MVP — single service, no inter-service calls to trace.

### 6.3 Error Handling & Resilience

| Concern | Strategy |
|---|---|
| **Reddit API failures** | Retry with exponential backoff (3 attempts, 1s/2s/4s). If persistent, skip batch and alert. Pipeline doesn't block user-facing API. |
| **Product Hunt API failures** | Retry with backoff (3 attempts). If persistent, skip batch. Products page shows stale data until next successful fetch. |
| **App Store / Google Play failures** | Retry with backoff (3 attempts). If scraping blocked or API unavailable, skip batch and alert. Other sources continue independently. |
| **LLM API failures** | Retry with backoff (3 attempts). If persistent, store untagged posts and retry in next pipeline run. Briefs with failed synthesis marked as "pending." |
| **Database connection failures** | SQLAlchemy connection pool with retry. Cloud Run auto-restarts unhealthy instances. |
| **Rate limiting** | Reddit API: respect rate limit headers, throttle requests. LLM APIs: budget-based throttling (stop pipeline if daily cost exceeds threshold). |
| **Timeouts** | API endpoints: 10s timeout. Pipeline LLM calls: 30s per request. Reddit API calls: 15s. |

### 6.4 Security

| Concern | Approach |
|---|---|
| **Data in transit** | TLS 1.3 everywhere (Vercel, Cloud Run, Neon all enforce by default) |
| **Data at rest** | Neon encrypts at rest by default (AES-256) |
| **Secrets** | GCP Secret Manager for API keys (Reddit, LLM providers). Accessed via environment variables in Cloud Run. Vercel environment variables for web. Never in code. |
| **Input validation** | Pydantic models validate all API inputs. Parameterized SQL queries (SQLAlchemy) prevent injection. |
| **XSS prevention** | React escapes output by default. No raw HTML injection. CSP headers via Next.js config. |
| **Rate limiting** | API rate limiting via Cloud Run concurrency settings + application-level rate limiter (e.g., slowapi) for brief rating endpoint. |
| **CORS** | API allows only the web app origin. No wildcard. |
| **GDPR** | No PII collected in MVP (no accounts). Anonymous session IDs for ratings are not PII. Posts are public Reddit data with links to originals — only snippets stored, not full content. |

### 6.5 Performance & Scalability

**Expected load (MVP):**
- 500 WAU → ~100 DAU → ~10 concurrent users peak
- ~50 req/s peak (page loads + API calls)
- 10K+ posts/day ingested across all sources (Reddit, App Store, Google Play, Product Hunt), ~100 briefs/week generated

**Bottleneck analysis:**

| Potential Bottleneck | Mitigation |
|---|---|
| Feed listing query (filter + sort + paginate) | PostgreSQL indexes on tags, created_at. pg_trgm for keyword search. |
| Brief detail page (brief + source posts join) | Pre-computed source post references stored in brief row (denormalized JSON array of post IDs + snippets). |
| Pipeline LLM calls (tagging 10K posts) | Batch tagging with smaller model (Haiku/GPT-4o-mini). Async HTTP calls. Budget-throttled. |
| Cold starts (Cloud Run) | Min instances = 1 for API service during business hours. Pipeline cold start acceptable (not user-facing). |

**Scaling triggers (post-MVP):**
- If p95 latency > 300ms → add Neon read replica
- If DAU > 10K → add Redis caching layer
- If pipeline processing > 4 hours/day → separate pipeline to dedicated Cloud Run Job with more CPU

---

## 7. Integration Points

| Service | Provides | Protocol | Failure Mode | Fallback |
|---|---|---|---|---|
| **Reddit API** | Raw posts (titles, bodies, subreddit, scores, timestamps) | REST (public JSON) | Rate limits, downtime, policy changes | Retry with backoff. If down > 1 hour, skip batch. Abstract data source layer for platform additions. |
| **RSS Feeds** | Tech news articles (HN, TechCrunch, etc.) | HTTP + feedparser | Feed down, format changes | Retry per-feed. Skip failed feeds, continue with others. |
| **Product Hunt API** | Trending/new products + competitive context for briefs | GraphQL (API token) | Rate limits, downtime | Retry with backoff. If down, skip batch. Briefs generated without competitive data. |
| **Google Trends** (pytrends) | Keyword interest, related queries, trend direction | REST (unofficial) | Rate limits, blocking | Graceful degradation. If unavailable, briefs generated without trend data. |
| **App Store / Google Play** | App reviews and ratings | Scraping or third-party API (TBD) | Blocking, API changes | Retry with backoff. If unavailable, skip batch. Other sources continue independently. |
| **Google Gemini API** | Post tagging (Flash), embeddings (Embedding model), brief synthesis (Flash) | REST (API key) | Rate limits, downtime, cost overruns | Retry with backoff. Budget circuit breaker stops pipeline if daily cost > threshold. |
| **Neon** | PostgreSQL database | PostgreSQL wire protocol (asyncpg) | Connection limits, maintenance windows | Connection pooling (Neon's built-in pgbouncer). Cloud Run retries failed connections. |
| **PostHog** | User analytics | Client-side JS SDK + REST API | Downtime | Non-blocking. Analytics failures don't affect user experience. Fire-and-forget. |
| **Sentry** | Error tracking | SDK (async) | Downtime | Non-blocking. Errors still logged to Cloud Logging. |

---

## 8. Migration & Rollout

Not applicable — greenfield project. No existing system to migrate from.

**MVP rollout plan:**
1. Phase 1 (MVP): Deploy pipeline (Reddit, App Store, Google Play ingestion + Product Hunt products) + feed, products, AI briefs pages all live. Full MVP deployed.
2. Phase 2 (Validate): Collect feedback, measure retention, decide on paid tier

Feature flags (via PostHog) for:
- New brief generation algorithm rollout
- New data source ingestion (when adding platforms beyond MVP sources)

---

## 9. Risks & Open Questions

### 9.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Reddit API policy change breaks ingestion | High | Medium | Abstract data source interface (port). Design pipeline to support multiple sources from day one. Store raw API responses for reprocessing. |
| LLM briefs feel generic / low quality | High | Medium | Invest in prompt engineering with few-shot examples. User rating feedback loop informs prompt iteration. Manual quality review of sample briefs weekly. |
| LLM tagging accuracy < 85% | Medium | Low | Start with narrow categories. Few-shot prompting. If accuracy is low, add human review queue (post-MVP). |
| Neon cold start latency spikes | Medium | Low | Keep API server min-instances=1 to maintain warm connections. Neon's connection pooler mitigates cold starts. |
| LLM costs exceed budget | Medium | Medium | Use smallest effective model per task (Haiku for tagging, larger model only for synthesis). Daily budget circuit breaker in pipeline. Monitor cost per brief. |
| SEO performance insufficient | Medium | Low | Next.js SSR/SSG ensures crawlable pages. Structured data (JSON-LD) for briefs. Sitemap generation. |

### 9.2 Open Questions

| # | Question | Options | Info Needed | Owner |
|---|---|---|---|---|
| ~~1~~ | ~~Clustering algorithm~~ — **Resolved**: Embedding clustering (Gemini Embedding + HDBSCAN). Cheaper, scalable, automatic cluster count. LLM used only for labeling each cluster. | — | — | zzoo |
| 2 | Brief generation — one LLM call per brief or chain-of-thought with multiple calls? | A: Single call (cheaper, faster) B: Multi-step (research → outline → write, higher quality) | Test both, compare quality ratings | zzoo |
| 3 | Feed search — PostgreSQL full-text search (pg_trgm + tsvector) vs. external search service? | A: PostgreSQL built-in (simpler, no extra infra) B: Typesense/Meilisearch (better relevance, more ops) | Evaluate pg FTS quality on sample data | zzoo |
| 4 | Pipeline scheduling — hourly vs. daily? | A: Hourly (fresher data, higher LLM cost) B: Daily (cheaper, acceptable for MVP) | Estimate LLM cost per run, user expectations for freshness | zzoo |
| 5 | Korean localization — MVP or post-MVP? | A: MVP (next-intl from day one) B: Post-MVP (English only first) | Target audience analysis — Korean indie hackers vs. global | zzoo |

---

## 10. Architecture Decision Records (ADRs)

### ADR-1: Python (FastAPI) for Backend

- **Status**: Accepted
- **Context**: The backend has heavy LLM API integration (tagging, clustering, synthesis), requiring libraries like `anthropic`, `openai`, `sentence-transformers`, and `scikit-learn` for clustering. The data pipeline is ML-adjacent.
- **Decision**: Python 3.12 with FastAPI.
- **Alternatives Considered**:
  - **Rust (Axum)**: Better performance and lower cloud costs. Rejected because the LLM/ML library ecosystem in Rust is immature. Calling Python from Rust (PyO3) adds complexity. The bottleneck is LLM API latency, not server-side compute — Rust's speed advantage is minimal here.
  - **TypeScript (Node.js)**: Good LLM library support. Rejected because Python's data processing ecosystem (pandas, scikit-learn, sentence-transformers) is significantly richer for the pipeline workload. FastAPI's async performance is comparable to Node for I/O-bound work.
- **Consequences**: (+) Rich ML/LLM ecosystem, fast development, strong async support. (-) Higher memory footprint than Rust, slower cold starts on Cloud Run (~1-2s vs ~200ms).

### ADR-2: Single Service + Scheduled Pipeline (not Microservices)

- **Status**: Accepted
- **Context**: Solo developer operating an MVP. The system has two workloads: a user-facing read API and a background data pipeline. Both share the same database and domain models.
- **Decision**: Single FastAPI service for the API. Pipeline runs as a scheduled Cloud Run Job using the same codebase. Not separate services.
- **Alternatives Considered**:
  - **Microservices (separate API + pipeline service)**: Rejected — adds Docker image management, networking, service discovery, and monitoring for two services. Solo developer can't justify the ops cost. The workloads don't need independent scaling yet.
  - **Event-driven (Pub/Sub between pipeline and API)**: Rejected — there's one producer (pipeline) and one consumer pattern (API reads DB). Pub/Sub adds latency and cost for a communication pattern that's already handled by shared database writes.
- **Consequences**: (+) Single codebase, single deployment pipeline, shared domain models, minimal ops. (-) Pipeline and API scale together (acceptable at MVP load). Extraction to separate services is straightforward if needed.

### ADR-3: Hexagonal Architecture (Ports & Adapters) for Code Structure

- **Status**: Accepted
- **Context**: The API integrates with multiple external services (Reddit API, Anthropic, OpenAI, PostgreSQL) that may change. Domain logic includes tagging rules, clustering heuristics, and brief quality scoring — not trivial CRUD.
- **Decision**: Hexagonal architecture with ports (interfaces) and adapters (implementations) for all external integrations.
- **Alternatives Considered**:
  - **Layered architecture**: Simpler, less boilerplate. Rejected because multiple external API integrations would leak through layers. Swapping LLM providers or adding data sources would require changes across layers.
  - **Clean architecture**: Same isolation benefits but more rigid layer structure and boilerplate. Overkill for a solo developer with 4 domain modules.
- **Consequences**: (+) LLM provider swappable without domain changes, testable domain logic with mocked ports, clear dependency direction. (-) More upfront boilerplate (port interfaces, adapter implementations).

### ADR-4: Neon (PostgreSQL) as Sole Data Store

- **Status**: Accepted
- **Context**: The data model is relational (posts ↔ clusters ↔ briefs, products ↔ posts). Need full-text search, filtering, pagination, and joins. Budget-sensitive solo developer.
- **Decision**: Neon serverless PostgreSQL as the single data store. No Redis, no document store, no search service.
- **Alternatives Considered**:
  - **Supabase**: Good managed PostgreSQL with extras. Rejected because Neon's scale-to-zero pricing is better for a pre-revenue MVP, and Supabase's Auth/Realtime/Storage bundle isn't needed.
  - **PostgreSQL + Redis**: Redis for caching feed queries. Rejected — adds infrastructure cost and cache invalidation complexity for a load that PostgreSQL can handle directly at MVP scale.
  - **PostgreSQL + Meilisearch**: Better search relevance. Rejected — PostgreSQL's pg_trgm + tsvector is good enough for keyword search. Adding a search service doubles ops overhead.
- **Consequences**: (+) Single data store, minimal ops, zero cost at low usage, great developer workflow (branching). (-) May need to add caching (Redis) or search (Meilisearch) if load grows beyond PostgreSQL's comfortable range.

### ADR-5: GCP Cloud Run for API Compute

- **Status**: Accepted
- **Context**: Need a container platform for Python/FastAPI. Solo developer prioritizes low ops overhead and cost.
- **Decision**: GCP Cloud Run for both the API server and pipeline jobs.
- **Alternatives Considered**:
  - **Cloudflare Workers**: Can't run Python natively (V8 runtime only). Would require rewriting in TypeScript or complex WASM compilation. Rejected.
  - **AWS Lambda + API Gateway**: Viable, but would split the cloud ecosystem (Neon is best on GCP/AWS, but mixing AWS Lambda + GCP services adds complexity). Lambda's 15-minute timeout is also a constraint for pipeline jobs.
  - **Fly.io**: Good developer experience. Rejected because GCP's ecosystem cohesion (Cloud Run + Cloud Scheduler + Cloud Logging + Secret Manager) reduces cognitive overhead for a solo developer.
- **Consequences**: (+) Container-based (any language), auto-scales to zero, generous free tier, GCP ecosystem cohesion. (-) Cold starts (~1-2s for Python), vendor lock-in to GCP for compute (mitigated by containerization).

### ADR-6: Next.js 16 on Vercel (MVP) for Frontend

- **Status**: Accepted
- **Context**: SEO is critical (feed and brief pages must be indexable). The web app is read-heavy with server-rendered content. Solo developer needs fast iteration.
- **Decision**: Next.js 16 (App Router) deployed on Vercel for MVP. Migrate to Cloudflare Workers (via OpenNext) post-MVP for cost optimization.
- **Alternatives Considered**:
  - **Cloudflare Workers from day one**: Better long-term cost. Rejected for MVP because OpenNext adds deployment complexity, and Vercel's DX (preview deploys, zero-config) accelerates MVP iteration.
  - **Astro**: Excellent for content-heavy sites. Rejected because the project already has React components (FSD structure in place), and Astro's React integration adds a layer of complexity vs. native Next.js.
  - **SPA (Vite + React)**: No SSR, poor SEO. Rejected — SEO is a P0 requirement.
- **Consequences**: (+) Best-in-class SSR/SSG, zero-config deployment, preview deploys, fast iteration. (-) Vercel cost scales with traffic (plan migration to Cloudflare if costs grow). Vendor-coupled to Vercel's deployment model (mitigated by OpenNext escape hatch).

### ADR-7: Embedding Clustering (Gemini + HDBSCAN) over LLM Clustering

- **Status**: Accepted
- **Context**: The pipeline clusters posts by theme to generate briefs. The original approach sent all posts to the LLM for grouping — expensive, slow, and limited by context window size.
- **Decision**: Replace LLM clustering with Gemini Embedding API (vectorize posts) + HDBSCAN (density-based clustering). LLM is used only for labeling each cluster (short, cheap call).
- **Alternatives Considered**:
  - **Full LLM clustering**: Send all posts + prompt to group them. Rejected — O(n) token cost, limited by context window (~50 posts max per call), and grouping accuracy degrades with volume.
  - **K-means on embeddings**: Requires specifying cluster count upfront. Rejected — HDBSCAN automatically determines cluster count and handles noise points.
  - **Sentence-transformers (local embeddings)**: No API cost. Rejected — Gemini embeddings are higher quality and the API cost is negligible compared to the synthesis LLM calls.
- **Consequences**: (+) Handles thousands of posts efficiently, automatic cluster count, noise detection (unclustered outliers). (-) Requires `scikit-learn` + `numpy` dependencies; HDBSCAN may produce many small clusters on sparse data.

### ADR-8: Anonymous Sessions for Brief Ratings (No Auth in MVP)

- **Status**: Accepted
- **Context**: PRD requires no-login browsing as P0. The only "write" action in MVP is rating briefs (thumbs up/down). Need to prevent vote spam without requiring accounts.
- **Decision**: Anonymous session-based ratings. Generate a random session ID stored in an httpOnly cookie. Rate-limit to 1 rating per brief per session. No user accounts.
- **Alternatives Considered**:
  - **Device fingerprinting**: More robust against cookie clearing. Rejected — privacy concern, potential GDPR issue even for anonymous data, and adds a fingerprinting library dependency.
  - **Require login for ratings**: Most accurate. Rejected — adding friction to the only interactive feature would reduce feedback volume. PRD explicitly says "no login required."
  - **No rate limiting (just count all ratings)**: Simplest. Rejected — trivially gameable, ratings would be meaningless.
- **Consequences**: (+) Zero friction, privacy-respecting, simple implementation. (-) Users can reset ratings by clearing cookies (acceptable for MVP — ratings are directional signal, not precise metrics).
