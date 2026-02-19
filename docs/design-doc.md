# idea-fork — Software Architecture Design Document

**Status:** Draft
**Author:** zzoo
**Date:** 2026-02-19
**PRD Reference:** [PRD](./prd.md) | [Product Brief](./product-brief.md) | [UX Strategy](./ux-strategy.md)

---

## 1. Context & Scope

### 1.1 Problem Statement

Builders spend hours manually browsing Reddit, app stores, and forums to find user pain points worth building for. idea-fork automates this: a periodic pipeline fetches posts from multiple platforms, LLM-tags them, clusters similar needs, and generates AI product briefs. The web app surfaces these as a feed and briefs page — "Product Hunt for problems."

This system needs to exist now because Haiku-tier LLM costs (~$1-2/cycle) make the full pipeline economically viable for the first time, and no existing tool (Gummysearch, SparkToro, Exploding Topics) bridges the gap from raw complaints to actionable business opportunities.

### 1.2 System Context Diagram

```
                          ┌─────────────────────────────────┐
                          │          idea-fork               │
                          │                                  │
  ┌─────────┐   fetch     │  ┌──────────┐   ┌────────────┐  │        ┌──────────┐
  │ Reddit  │────────────▶│  │ Pipeline │──▶│ PostgreSQL │◀─┤◀──────▶│ Browsers │
  │ API     │             │  │  (batch) │   │  (Neon)    │  │  API   │ (users)  │
  └─────────┘             │  └────┬─────┘   └────────────┘  │        └──────────┘
  ┌─────────┐   fetch     │       │              ▲          │
  │ Product │────────────▶│       │              │          │
  │ Hunt API│             │       ▼              │          │
  └─────────┘             │  ┌──────────┐   ┌────────┐     │        ┌──────────┐
  ┌─────────┐   scrape    │  │ LLM API  │   │  Web   │     │        │ Google   │
  │ Play    │────────────▶│  │(tagging, │   │  App   │─────┤◀──────▶│ OAuth    │
  │ Store   │             │  │ briefs)  │   │(Next.js│     │        └──────────┘
  └─────────┘             │  └──────────┘   └────────┘     │
  ┌─────────┐   scrape    │                                 │        ┌──────────┐
  │ App     │────────────▶│                                 │◀──────▶│ Stripe   │
  │ Store   │             │                                 │        └──────────┘
  └─────────┘             │                                 │
                          │                                 │        ┌──────────┐
                          │                                 │───────▶│ PostHog  │
                          │                                 │        └──────────┘
                          │                                 │
                          │                                 │        ┌──────────┐
                          │                                 │───────▶│ Resend   │
                          │                                 │        │ (email)  │
                          └─────────────────────────────────┘        └──────────┘
```

**Actors:**
- **Browsers (users):** Indie hackers, founders, PMs browsing the feed and briefs. No login required for read-only access.
- **Reddit API, Product Hunt API:** Structured data sources fetched via official APIs.
- **Play Store, App Store:** Scraped sources (HTML parsing).
- **LLM API (Haiku-tier):** Tags posts, generates embeddings, generates brief text.
- **Google OAuth:** Social login provider.
- **Stripe:** Payment processing for Pro subscriptions.
- **PostHog:** Analytics (client-side and server-side event tracking).
- **Resend:** Outbound email delivery for weekly digest.

### 1.3 Assumptions

| # | Assumption | If Wrong... |
|---|-----------|-------------|
| 1 | ~2,000 posts/cycle is sufficient volume for meaningful clusters | Pipeline may need higher frequency or more subreddits |
| 2 | Haiku-tier LLM can tag posts with >80% accuracy | May need fine-tuning or a more capable model, increasing cost |
| 3 | Embedding similarity (pgvector) is sufficient for need clustering | May need LLM-based grouping, increasing pipeline cost and latency |
| 4 | Feed page can serve <2s TTFB with SSR from edge | May need aggressive caching or static generation fallback |
| 5 | Reddit API remains accessible at current free tier | May need to purchase API access or rely on other sources |
| 6 | Single pipeline run completes within 30 minutes | May need to parallelize source fetching or split into stages |
| 7 | Solo developer can operate this system without dedicated ops | Architecture must minimize operational surface area |

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Serve the feed page with <2s TTFB on first load, SSR for SEO indexability
- Run the full pipeline (fetch → tag → cluster → brief) within 30 minutes per cycle
- Handle 1,000 daily active users within 3 months with no infrastructure changes
- Keep total infrastructure cost under $50/month at 1K DAU (excluding LLM costs)
- Zero-downtime deployments for both frontend and backend
- Pipeline failures are isolated — a failed cycle does not take down the web app

### 2.2 Non-Goals

- **Real-time data.** The feed updates on a fixed schedule (every 6-24h). No WebSocket, no SSE, no live updates.
- **Multi-region deployment.** Single region (us-east) is sufficient for a global English-speaking audience. CDN handles edge delivery.
- **Native mobile app.** Responsive web only.
- **Team/org accounts.** Single-user accounts only.
- **API access for third parties.** The web app is the only consumer.
- **Complex analytics dashboard.** The product is a feed and briefs, not a BI tool.
- **Self-hosted LLM.** Use managed LLM APIs. Revisit only if costs become prohibitive at scale.

---

## 3. High-Level Architecture

### 3.1 Architecture Style

**System Architecture: Single-service API + scheduled batch pipeline (hybrid request-response + batch)**

The web-facing API is request-response: browser makes HTTP requests, API reads from the database, returns JSON or SSR HTML. The pipeline is a scheduled batch job that runs independently on a timer. These are two separate deployment units sharing a single database.

This is not event-driven. There is no inter-service communication, no message broker needed, no pub/sub. The pipeline writes to the database; the API reads from it. The database is the integration point.

**Rationale:** This is a solo-developer project serving <10K users. The pipeline runs every 6-24h and has no real-time requirements. Adding a message broker (Pub/Sub, Redis queues) would increase operational complexity with zero user-facing benefit. The batch model matches the product's "periodic cycle" concept exactly.

**Alternatives considered:**
- *Event-driven pipeline (Pub/Sub between stages):* Each pipeline stage publishes an event for the next stage. Rejected because the pipeline is sequential (fetch → tag → cluster → brief), there is no fan-out to multiple consumers, and the added infrastructure (Pub/Sub, dead-letter handling, retry logic) is not justified for a single-consumer sequential pipeline.
- *Task queue (Celery/ARQ):* Separate workers consume tasks from a Redis queue. Rejected because there is only one pipeline job running at a time, making a task queue an over-abstraction. A single Cloud Run Job is simpler.

**Code Structure: Layered architecture**

The backend API is CRUD-dominant: read posts, read briefs, read user profile, write bookmarks, write tracking keywords. The "business logic" (tagging, clustering, brief generation) lives entirely in the pipeline, not the API. The API layer is thin — routes → service functions → database queries. Hexagonal would add port/adapter boilerplate without payoff for this read-heavy, integration-light API.

The pipeline is a linear script: fetch → transform → store. It does not need the testability benefits of hexagonal architecture because its correctness is validated by output quality (brief accuracy, cluster coherence), not unit test coverage of business rules.

**Rationale:** Match architecture complexity to problem complexity. A layered structure is the fastest to build, easiest to understand, and sufficient for a CRUD API. If the API grows complex business rules later (e.g., recommendation algorithms, personalization), introduce hexagonal for those specific modules.

**Alternatives considered:**
- *Hexagonal (ports & adapters):* Rejected for the API because the domain logic is thin. The primary complexity is in the pipeline, which is a batch script — not a long-lived service where adapter swapping matters.
- *Clean architecture:* Even more boilerplate than hexagonal. Rejected for the same reasons, amplified.

### 3.2 Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare (Edge)                            │
│  ┌───────────────────────────────────────────┐                  │
│  │         Next.js Frontend                   │                  │
│  │  (SSR via OpenNext on Cloudflare Workers)  │                  │
│  │  - Feed page (/)                           │                  │
│  │  - Briefs page (/briefs, /briefs/:id)     │                  │
│  │  - Deep dive (/needs/:id)                 │                  │
│  │  - Auth, account, bookmarks, tracking     │                  │
│  └────────────────────┬──────────────────────┘                  │
│                       │ HTTPS (fetch)                            │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GCP (us-east4)                               │
│                                                                  │
│  ┌────────────────────────────┐   ┌──────────────────────────┐  │
│  │    FastAPI Backend          │   │   Pipeline Job            │  │
│  │    (Cloud Run Service)      │   │   (Cloud Run Job)         │  │
│  │                             │   │                           │  │
│  │  - REST API for frontend    │   │  - Fetch sources          │  │
│  │  - Auth (JWT issuance)      │   │  - LLM tagging            │  │
│  │  - Feed/brief queries       │   │  - Embedding generation   │  │
│  │  - Bookmark/tracking CRUD   │   │  - Clustering (pgvector)  │  │
│  │  - Stripe webhook handler   │   │  - Brief generation       │  │
│  │  - Deep dive access gating  │   │  - Triggered by Cloud     │  │
│  │                             │   │    Scheduler (cron)       │  │
│  └──────────┬─────────────────┘   └──────────┬────────────────┘  │
│             │                                 │                   │
│             │          ┌──────────────────┐   │                   │
│             └─────────▶│   Neon PostgreSQL │◀──┘                   │
│                        │   (+ pgvector)    │                       │
│                        │                   │                       │
│                        │  - posts          │                       │
│                        │  - briefs         │                       │
│                        │  - need_clusters  │                       │
│                        │  - users          │                       │
│                        │  - bookmarks      │                       │
│                        │  - tracked_keywords│                      │
│                        │  - pipeline_cycles │                      │
│                        └──────────────────┘                       │
│                                                                   │
│  ┌──────────────────────────┐                                     │
│  │   Cloud Scheduler         │                                     │
│  │   (cron trigger)          │────triggers────▶ Pipeline Job       │
│  │   e.g. every 12h          │                                     │
│  └──────────────────────────┘                                     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

| Container | Technology | Responsibility | Communication |
|-----------|-----------|----------------|---------------|
| **Frontend** | Next.js 15 (App Router) on Cloudflare Workers via OpenNext | SSR pages, client-side interactivity, PostHog event emission | HTTPS to FastAPI backend |
| **Backend API** | Python 3.12, FastAPI, SQLAlchemy 2.0 async | REST API for all frontend data needs, auth, payment webhooks | HTTPS from frontend; TCP to Neon |
| **Pipeline Job** | Python 3.12, scheduled Cloud Run Job | Fetch → tag → embed → cluster → brief generation | TCP to Neon; HTTPS to Reddit/PH/LLM APIs |
| **Database** | Neon PostgreSQL (with pgvector) | Primary data store for all application state | TCP from API and pipeline |
| **Scheduler** | GCP Cloud Scheduler | Triggers pipeline on a cron schedule | HTTP trigger to Cloud Run Job |

### 3.3 Component Overview

**Backend API modules:**

| Module | Responsibility | Critical Path? |
|--------|---------------|---------------|
| `auth` | Google OAuth callback, JWT issuance/validation, session management | Yes — gates all authenticated features |
| `feed` | Query posts by tag/engagement/keyword, paginate, return feed data | Yes — primary page |
| `briefs` | Query briefs by cycle, return brief detail with source evidence | Yes — second-most-visited page |
| `needs` | Query need clusters, return deep dive data (frequency, intensity, sources) | Yes — conversion trigger page |
| `bookmarks` | CRUD bookmarks for posts and briefs per user | No |
| `tracking` | CRUD tracked keywords, query matches | No |
| `payments` | Stripe checkout session creation, webhook handler for subscription events | Yes — revenue |
| `users` | User profile, subscription status | No |

**Pipeline stages (sequential, single job):**

| Stage | Input | Output | LLM Cost |
|-------|-------|--------|----------|
| 1. Fetch | Source APIs/scraping targets | Raw posts (~2,000) | $0 |
| 2. Tag | Raw posts | Tagged posts (complaint/need/feature-request/discussion/self-promo/other) | ~$0.50 (Haiku, ~2K posts) |
| 3. Embed | Tagged posts | Post embeddings (vector per post) | ~$0.05 (text-embedding-3-small) |
| 4. Store | Tagged + embedded posts | Rows in `posts` table | $0 |
| 5. Cluster | Post embeddings (new + recent) | ~50 need clusters | $0 (algorithmic) |
| 6. Rank | Need clusters | Ranked clusters by volume × intensity × gap | $0 |
| 7. Brief | Top ~10 clusters | AI-generated briefs with source evidence | ~$0.50 (Haiku, ~10 briefs) |

Total estimated LLM cost per cycle: **~$1-2**

---

## 4. Data Architecture

### 4.1 Data Flow

**Flow 1: Pipeline cycle (batch, every 6-24h)**

```
Reddit/PH/PlayStore/AppStore
        │
        ▼
  [1. Fetch raw posts] ──▶ In-memory post list
        │
        ▼
  [2. LLM tags each post] ──▶ Tagged post list (with category)
        │
        ▼
  [3. Embed each post] ──▶ Post + embedding vector (1536-dim)
        │
        ▼
  [4. Store in Neon] ──▶ `posts` table (with tag, embedding, engagement metrics)
        │                  `pipeline_cycles` table (cycle metadata)
        ▼
  [5. Cluster] ──▶ Run HDBSCAN on embeddings (new + last 30 days of posts)
        │           ──▶ `need_clusters` table (cluster centers, member post IDs)
        ▼
  [6. Rank clusters] ──▶ Score = volume × intensity × competitive_gap
        │                  Update `need_clusters.rank_score`
        ▼
  [7. Generate briefs] ──▶ LLM generates brief for top ~10 clusters
                            ──▶ `briefs` table (summary, sources, metrics, opportunity)
```

**Consistency:** Strong consistency within each pipeline stage (sequential writes to Neon). The pipeline writes complete cycle data atomically — all posts for a cycle are tagged and stored before clustering begins. The web API reads committed data only.

**Flow 2: User browses feed (request-response)**

```
Browser ──GET /api/feed?tag=complaint&cursor=X──▶ FastAPI
                                                     │
                                                     ▼
                                               Query `posts` table
                                               (WHERE tag IN (...),
                                                ORDER BY engagement_score DESC,
                                                LIMIT 20, cursor-based)
                                                     │
                                                     ▼
                                               Return JSON ──▶ Browser renders
```

**Consistency:** Strong — reads from primary Neon instance. No read replicas, no eventual consistency concerns.

**Flow 3: User upgrades to Pro**

```
Browser ──POST /api/payments/checkout──▶ FastAPI ──creates checkout session──▶ Stripe
                                                                                │
Browser ◀──redirect to Stripe hosted checkout──────────────────────────────────┘
                                                                                │
Stripe ──webhook (checkout.session.completed)──▶ FastAPI                        │
                                                    │                           │
                                               Update `users.tier = 'pro'`     │
                                               Store Stripe customer/sub ID     │
                                                    │                           │
Browser ◀──redirect back with success param─────────────────────────────────────┘
```

### 4.2 Storage Strategy

**Neon PostgreSQL (primary store):**

- **What:** All application data — posts, briefs, clusters, users, bookmarks, tracked keywords, pipeline cycle metadata, post embeddings (pgvector).
- **Why relational:** The data model is relational — posts belong to clusters, clusters produce briefs, users have bookmarks, users track keywords. Relationships, joins, and transactions are core operations. PostgreSQL with pgvector handles both relational queries and vector similarity search, avoiding a separate vector database.
- **Consistency:** Strong consistency. All reads and writes go to the primary instance.
- **Retention:** Posts older than 90 days are archived (soft-deleted, excluded from feed queries but retained for brief source evidence). Briefs are retained indefinitely. Pipeline cycle metadata retained for 1 year.

**Why not a separate vector database (Pinecone, Qdrant, etc.):**

pgvector on Neon supports HNSW indexes for approximate nearest-neighbor search. At ~2K posts/cycle and ~60K posts over 30 days, the vector index is small enough for pgvector to handle efficiently. A separate vector database adds another service to manage, another connection to configure, and another point of failure — not justified at this scale. Revisit if post volume exceeds 500K or similarity search latency exceeds 100ms.

### 4.3 Caching Strategy

**No dedicated cache layer (no Redis) in v1.**

The primary read queries (feed, briefs) are served directly from Neon. At 1K DAU with typical read patterns (~5 feed page views per session, ~20 posts per page), the query load is ~100K queries/day or ~1.2 QPS average, ~10 QPS peak. Neon handles this trivially.

Caching is applied at the edge instead:

- **Cloudflare CDN:** Cache SSR pages for public (unauthenticated) content with short TTLs (5-10 minutes). The feed data changes only every 6-24h (pipeline cycle frequency), so aggressive caching is safe.
- **Next.js ISR (Incremental Static Regeneration):** Revalidate feed and briefs pages on a timer matching the pipeline cycle frequency. Serves stale-while-revalidate for near-instant page loads.
- **HTTP Cache-Control headers:** API responses for public feed/brief data include `Cache-Control: public, max-age=300, s-maxage=600` (5min browser, 10min CDN).

**Why no Redis:**

Adding Redis (GCP Memorystore) introduces a $30-50/month minimum cost, a new service to monitor, and cache invalidation complexity. The access pattern (batch writes every 6-24h, read-heavy with stable data) is well-served by CDN caching + Neon's connection pooling. Redis becomes justified if: (a) authenticated users need personalized feeds that can't be CDN-cached, or (b) the deep dive rate-limit counter needs sub-ms latency. For (b), the counter can live in the database with a simple upsert.

---

## 5. Infrastructure & Deployment

### 5.1 Compute Platform

| Component | Platform | Rationale |
|-----------|----------|-----------|
| **Frontend** | Cloudflare Workers (via OpenNext) | Edge SSR for global low-latency TTFB. Predictable pricing. The PRD requires <2s initial load and SEO-friendly rendering — edge SSR delivers both. |
| **Backend API** | GCP Cloud Run (service) | Container-based, auto-scaling, supports Python + FastAPI. Generous free tier. Cold starts acceptable (Python API cold start ~2-3s, warmed by min-instances=1). |
| **Pipeline Job** | GCP Cloud Run (job) | Same container image as API but run as a job with a 30-minute timeout. No need for a separate worker infrastructure. Cloud Run Jobs support scheduled execution via Cloud Scheduler. |
| **Database** | Neon (us-east-1) | Scale-to-zero pricing (critical for solopreneur cost management). Serverless branching for dev/staging. pgvector extension for embeddings. |
| **Scheduler** | GCP Cloud Scheduler | Native integration with Cloud Run Jobs. Cron expression configurable (e.g., `0 */12 * * *` for every 12h). |

**Why GCP Cloud Run over Cloudflare Workers for backend:**

The backend uses Python with heavy dependencies (FastAPI, SQLAlchemy, httpx, scikit-learn for clustering, anthropic SDK). Cloudflare Workers are limited to V8 runtime (JavaScript/WASM). Python workers on Cloudflare require WASM compilation, which is experimental and doesn't support the full Python ecosystem. Cloud Run runs any Docker container natively.

**Why Cloudflare for frontend, GCP for backend (mixed ecosystem):**

This violates the "platform cohesion principle" but is justified: Cloudflare Workers provide the best edge SSR price/performance ratio for Next.js, while GCP Cloud Run is the only practical option for a Python backend with heavy ML/AI dependencies. The cross-cloud network hop (Cloudflare edge → GCP us-east4) adds ~10-20ms latency, acceptable given the product has no real-time requirements.

**Scaling model:**

- Frontend: Auto-scaled by Cloudflare globally. No configuration needed.
- Backend API: Cloud Run auto-scales 0→N instances. Min instances = 1 (avoids cold starts for first request). Max instances = 10 (sufficient for 10K+ concurrent requests).
- Pipeline: Runs as a single instance per execution. No concurrent pipeline runs.

### 5.2 Deployment Strategy

```
PR merge to main
      │
      ▼
GitHub Actions CI
      │
      ├──▶ [Frontend] Build Next.js → deploy to Cloudflare Workers (wrangler)
      │
      ├──▶ [Backend] Build Docker image → push to GCP Artifact Registry
      │        → deploy to Cloud Run (new revision, traffic shift 100%)
      │
      └──▶ [Pipeline] Same Docker image as backend
             → Cloud Run Job uses latest image automatically
```

- **Frontend:** Deployed via `wrangler deploy`. Cloudflare Workers deployments are atomic and instant. Rollback = redeploy previous version.
- **Backend:** Cloud Run revision-based deployment. New revisions receive 100% traffic immediately (no canary — at this scale, canary adds complexity without meaningful risk reduction). Rollback = route traffic to previous revision via `gcloud run services update-traffic`.
- **Database migrations:** Run as a pre-deploy step in CI. Alembic migrations executed against Neon before deploying the new backend revision. Migrations must be backwards-compatible (new code can run against old schema during rollout).

### 5.3 Environment Topology

| Environment | Frontend | Backend | Database | Purpose |
|------------|---------|---------|----------|---------|
| **Local dev** | `next dev` (localhost:3000) | `uvicorn` (localhost:8000) | Neon branch (dev) | Development |
| **Preview** | Cloudflare Workers preview URL (per-PR) | Cloud Run revision (tagged, no traffic) | Neon branch (per-PR) | PR review |
| **Production** | Cloudflare Workers (custom domain) | Cloud Run service (latest revision) | Neon main branch | Live |

Neon's branching model eliminates the need for a separate staging database. Each PR gets its own Neon branch, which is a copy-on-write fork of production data. This provides production-realistic testing without cost or data management overhead.

---

## 6. Cross-Cutting Concerns

### 6.1 Authentication & Authorization

**Auth flow:**

```
Browser ──"Login with Google"──▶ Google OAuth2 consent screen
                                        │
                                        ▼
Browser ◀──redirect with auth code──── Google
        │
        ▼
Browser ──POST /api/auth/google {code}──▶ FastAPI
                                             │
                                        Exchange code for Google tokens
                                        Get user profile (email, name)
                                        Upsert user in database
                                        Issue JWT access + refresh tokens
                                             │
                                             ▼
Browser ◀── { access_token, user } ─────── FastAPI
            Set refresh_token as httpOnly cookie
```

**Token lifecycle:**
- **Access token:** 15 minutes, stored in memory (JavaScript variable), sent as `Authorization: Bearer` header.
- **Refresh token:** 30 days, stored as `httpOnly`, `Secure`, `SameSite=Lax` cookie. Rotated on each refresh (old token invalidated).
- **Refresh endpoint:** `POST /api/auth/refresh` — validates refresh cookie, issues new access + refresh tokens.

**Authorization model:** Simple tier-based access control (not full RBAC).

| Tier | Permissions |
|------|------------|
| Anonymous | Read feed, read brief titles/summaries, 3 deep dives/day (session-tracked via cookie) |
| Free (registered) | Same as anonymous + bookmarks |
| Pro | Everything — full briefs, unlimited deep dives, tracking, notifications |

**Enforcement:** Middleware in FastAPI. A `get_current_user` dependency extracts the JWT, resolves the user, and injects the user object (or `None` for anonymous) into route handlers. Tier checks happen in route handlers or service functions, not middleware (to keep middleware simple).

**Deep dive rate limit for anonymous users:** Tracked via a signed, httpOnly cookie containing a counter and date. Not tamper-proof against determined users (clearing cookies resets the counter), but sufficient for honest gating. Database-backed rate limiting adds per-request overhead for a feature that is primarily a conversion nudge, not a hard security boundary.

### 6.2 Observability

**Logging:**
- Structured JSON to stdout (Cloud Run captures stdout → Cloud Logging automatically).
- Log fields: `timestamp`, `level`, `request_id` (UUID, generated per request), `user_id` (if authenticated), `message`, `extra`.
- Log levels: `ERROR` for failures requiring attention, `WARNING` for degraded behavior, `INFO` for request lifecycle and pipeline stage completion.
- Pipeline logging: Each stage logs start/end with counts (e.g., "Tagged 1,847 of 2,012 posts, 165 failed").

**Metrics:**
- **PostHog (user-facing):** All events from PRD Section 5.9 and UX Strategy Section 10.2 — feed views, card clicks, brief views, paywall events, auth events, upgrade events.
- **Cloud Run built-in (infra):** Request count, latency (p50/p95/p99), error rate, instance count, CPU/memory utilization. No custom Prometheus setup needed — Cloud Run exports these to Cloud Monitoring automatically.
- **Pipeline-specific:** Cycle duration, posts fetched per source, tagging success rate, cluster count, briefs generated. Logged as structured events, queryable in Cloud Logging.

**Alerting:**
- Cloud Run error rate > 5% over 5 minutes → Notify via Cloud Monitoring alert (email or PagerDuty).
- Pipeline job failure → Cloud Scheduler + Cloud Run Job failure notification (built-in).
- Stripe webhook processing failure → Log as ERROR, alert on error count > 0 in 1 hour.

No distributed tracing. There are only two services (frontend → API), and the pipeline is a single job. Request IDs in logs provide sufficient correlation.

### 6.3 Error Handling & Resilience

**API error handling:**

- All API errors return structured JSON: `{ "error": { "code": "string", "message": "string" } }`.
- HTTP status codes follow REST conventions: 400 for validation errors, 401 for auth failures, 403 for tier violations, 404 for not found, 429 for rate limits, 500 for unexpected errors.
- Unhandled exceptions are caught by FastAPI's exception handler, logged with stack trace, and returned as 500 with a generic message (no stack trace in response).

**Pipeline resilience:**

- Each source fetch (Reddit, PH, Play Store, App Store) is independent. If one source fails, the others continue. The pipeline logs the failure and produces a partial cycle (better than no cycle).
- LLM API calls include retry with exponential backoff (3 attempts, 1s/2s/4s). If tagging fails for a post after retries, the post is stored without a tag (tagged as `other`).
- The pipeline is idempotent by cycle ID. Re-running a failed cycle replaces partial data with complete data (upsert semantics on `cycle_id + source_post_id`).

**Frontend resilience:**

- API errors are caught at the fetch layer. Failed feed loads show an inline error with a retry button (per UX Strategy Section 9.1).
- Stale content is acceptable — if the API is down, the CDN serves the last cached version of public pages.

**Timeouts:**

| Call | Timeout | Rationale |
|------|---------|-----------|
| Frontend → API | 10s | Feed/brief queries should complete in <200ms; 10s accommodates cold starts |
| API → Neon | 5s | Database queries should complete in <100ms |
| Pipeline → LLM API (per post) | 30s | LLM responses can vary; 30s is generous |
| Pipeline → Reddit/PH API | 15s | External APIs, includes rate-limit retry waits |
| Pipeline → Play/App Store scrape | 30s | Scraping can be slow depending on page load |
| Pipeline total | 30 min | Cloud Run Job timeout; the full cycle should complete in 10-20 min |

### 6.4 Security

**Transport:** TLS 1.3 everywhere. Cloudflare terminates TLS for the frontend. Cloud Run terminates TLS for the API. Neon connections use TLS by default.

**Data at rest:** Neon encrypts data at rest by default (AES-256). No additional application-level encryption needed — the system stores no PCI-regulated data (Stripe handles card details).

**Secrets management:** GCP Secret Manager for all secrets (database connection string, LLM API key, Stripe API keys, Google OAuth client secret, JWT signing key). Secrets are injected as environment variables into Cloud Run at deploy time. Never stored in code or CI configuration.

**Input validation:** Pydantic models validate all API request bodies. Query parameters validated via FastAPI's built-in type system. No raw SQL — SQLAlchemy ORM prevents SQL injection. Next.js auto-escapes React output, preventing XSS.

**Rate limiting:** Applied at two layers:
1. **Cloudflare:** Bot protection and DDoS mitigation (automatic, included in free plan).
2. **API:** Rate limit authenticated endpoints at 60 requests/minute per user (implemented via a simple in-memory counter per user ID, acceptable at single-instance scale). Increase to Redis-backed rate limiting if scale demands multiple API instances.

**OWASP considerations:**

| Risk | Mitigation |
|------|-----------|
| Injection (SQL, NoSQL) | SQLAlchemy ORM, parameterized queries |
| XSS | React auto-escaping, CSP headers |
| Broken auth | JWT with short expiry, httpOnly refresh cookies, CSRF protection via SameSite cookies |
| SSRF | Pipeline fetches from a hardcoded allowlist of source URLs only |
| Sensitive data exposure | No PII beyond email/name; Stripe handles payments; no logs of tokens |

### 6.5 Performance & Scalability

**Expected load profile:**

| Phase | DAU | API QPS (avg) | API QPS (peak) | Database connections |
|-------|-----|--------------|----------------|---------------------|
| Launch (month 1) | 100 | 0.5 | 5 | 2-3 |
| Growth (month 3) | 1,000 | 5 | 50 | 5-10 |
| Scale (month 12) | 10,000 | 50 | 500 | 20-50 |

**Bottleneck analysis:**

1. **Feed query performance:** The feed is the highest-traffic query. It reads from the `posts` table filtered by tag and ordered by engagement score. With proper indexes (tag, engagement_score, created_at) and cursor-based pagination, this query stays fast at any volume. At 500K posts, a filtered query with a B-tree index returns in <10ms.

2. **Pipeline LLM calls:** The pipeline's bottleneck is LLM API calls (~2K posts × 1 call per post). At ~200ms per Haiku call, sequential processing takes ~7 minutes. Parallelizing with `asyncio.gather` (batches of 50 concurrent calls) reduces this to ~1-2 minutes. This is the first optimization to apply if cycle duration exceeds 20 minutes.

3. **Clustering:** HDBSCAN on ~60K embeddings (30 days of posts) with 1536 dimensions. Estimated wall-clock time: 30-60 seconds. This is acceptable. If post volume grows 10x, switch to mini-batch KMeans or reduce the embedding window.

**Scaling triggers:**

| Trigger | Current | Action |
|---------|---------|--------|
| API latency p95 > 500ms | Not expected at 1K DAU | Add read replica or Redis cache for feed queries |
| Cloud Run instance count consistently > 5 | Growth indicator | Increase max instances, consider Neon connection pooling (pgbouncer) |
| Pipeline duration > 25 minutes | Approaching timeout | Parallelize source fetching, batch LLM calls more aggressively |
| Database size > 10GB | ~1 year of data | Implement post archival (soft delete posts older than 90 days from feed queries) |

---

## 7. Integration Points

| Service | What It Provides | Protocol | Failure Mode | Fallback |
|---------|-----------------|----------|-------------|----------|
| **Reddit API** | Subreddit posts (title, body, upvotes, comments, URL) | REST (OAuth2) | Rate limit (429), downtime | Skip Reddit for this cycle; other sources continue |
| **Product Hunt API** | Product comments | GraphQL | Rate limit, downtime | Skip PH for this cycle |
| **Play Store** | App reviews (1-3 stars) | HTTP scraping (google-play-scraper) | HTML structure changes, blocking | Skip Play Store; monitor for scraper breakage |
| **App Store** | App reviews (1-3 stars) | HTTP scraping (app-store-scraper) | HTML structure changes, blocking | Skip App Store; monitor for scraper breakage |
| **Anthropic API (Haiku)** | Post tagging, brief generation | REST | Rate limit, downtime, model deprecation | Retry with backoff; if persistent, delay cycle and alert |
| **OpenAI API (embeddings)** | Post embedding vectors | REST | Rate limit, downtime | Retry with backoff; fallback to Anthropic voyage if OpenAI is unavailable |
| **Google OAuth** | User authentication | OAuth2 | Downtime (rare) | Login fails gracefully; existing sessions continue working |
| **Stripe** | Payment processing, subscription management | REST + webhooks | Webhook delivery delay | Webhook retries (Stripe retries for 72h); subscription status check on login |
| **Resend** | Weekly digest email delivery | REST | Delivery failure | Log failure; retry once; skip if persistent (email is not critical path) |
| **PostHog** | Analytics event ingestion | REST (client-side JS SDK) | Ingestion failure | Events are fire-and-forget; no user-facing impact |

**SLA dependencies:** No external service is on the critical path for page loads. The API reads from the database only. All external services (LLM, source APIs, Stripe, Resend) are either pipeline-time dependencies or async webhook dependencies. If Neon is down, the site is down — this is the only hard dependency for user-facing requests (mitigated by Neon's 99.95% SLA).

---

## 8. Migration & Rollout

Not applicable — greenfield project, no existing system to migrate from.

**Phased rollout strategy (from PRD Section 10):**

| Phase | Deliverable | Infra Required |
|-------|------------|---------------|
| **M1 — Pipeline** | End-to-end pipeline running on schedule | Neon, Cloud Run Job, Cloud Scheduler, LLM API, source APIs |
| **M2 — Feed + Briefs** | Web app serving feed and briefs | + Cloudflare Workers (frontend), Cloud Run Service (API) |
| **M3 — Auth + Pro** | Google OAuth, Stripe payments, tier gating | + Google OAuth, Stripe integration |
| **M4 — Engagement** | Bookmarks, tracking, notifications, email digest | + Resend |
| **M5 — Launch** | PostHog instrumentation, performance tuning | + PostHog |

Each phase is independently deployable and usable. M1 can run without a web app (pipeline populates the database). M2 serves a read-only site. M3 adds user accounts. This avoids big-bang launches and allows validation at each step.

---

## 9. Risks & Open Questions

### 9.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Reddit API policy change blocks data collection | High — Reddit is the highest-volume source | Low (current terms allow read access) | Diversify to more sources early; cache historical data; monitor TOS changes quarterly |
| LLM tagging accuracy below 80% | Medium — feed quality degrades, user trust drops | Medium | Nothing is hidden (only mis-prioritized); iteratively improve prompts; run weekly accuracy spot-checks on 50 random posts |
| Play/App Store scraper breaks due to HTML changes | Medium — lose two data sources | Medium | Use maintained open-source scraping libraries; pin versions; set up alerts on scraper failures |
| Clustering produces noisy or overlapping groups | Medium — briefs feel generic or redundant | Medium | Tune HDBSCAN min_cluster_size; experiment with LLM-based dedup pass on clusters; manually review first 5 cycles |
| Neon cold start adds latency to first API request | Low — mitigated by Cloud Run min instances and Neon autoscaling | Low | Enable Neon autoscaling (auto-suspend after 5 min idle, wake in <1s); Cloud Run min instances = 1 keeps API warm |
| OpenNext on Cloudflare Workers has compatibility issues with Next.js 15 | Medium — deployment blocker | Medium | Test early in M2; fallback to Vercel if OpenNext is unreliable |
| Pipeline exceeds 30-minute Cloud Run Job timeout | Low — estimated 10-20 min | Low | Parallelize LLM calls; increase timeout to 60 min if needed (Cloud Run supports up to 24h for jobs) |

### 9.2 Open Questions

| # | Question | Options | Information Needed | Decision Owner |
|---|---------|---------|-------------------|---------------|
| 1 | What embedding model to use? | (a) OpenAI text-embedding-3-small ($0.02/1M tokens, 1536 dim), (b) Anthropic Voyage ($0.01/1M tokens), (c) Open-source model via HuggingFace | Benchmark embedding quality on a sample of ~100 Reddit posts — measure cluster coherence | zzoo |
| 2 | What clustering algorithm? | (a) HDBSCAN (density-based, no need to specify k), (b) KMeans (fast, requires k), (c) LLM-based grouping (highest quality, highest cost) | Run HDBSCAN vs KMeans on sample data; evaluate cluster quality manually | zzoo |
| 3 | Pipeline frequency? | (a) Every 6h, (b) Every 12h, (c) Daily | Balance between data freshness and LLM cost ($1-2/cycle × 4 cycles/day = $4-8/day at 6h) | zzoo |
| 4 | OpenNext stability for Next.js 15? | (a) Use OpenNext on Cloudflare, (b) Fall back to Vercel | Test OpenNext with a Next.js 15 skeleton app on Cloudflare Workers during M2 | zzoo |
| 5 | Legal review of source platform TOS? | (a) Reddit API TOS compliant, (b) Needs legal review, (c) Switch to RSS feeds | Review Reddit API TOS (especially post-2024 pricing changes), Play Store scraping legality | zzoo |
| 6 | Anonymous deep-dive rate limit mechanism? | (a) Signed cookie (simple, bypassable), (b) IP-based (more robust, CDN complication), (c) Fingerprint-based | Cookie is simplest and matches the UX strategy (rate limit is a nudge, not a hard wall) | zzoo |

---

## 10. Architecture Decision Records (ADRs)

### ADR-1: Python (FastAPI) for Backend

- **Status:** Accepted
- **Context:** The backend serves a REST API and runs an AI pipeline with heavy LLM integration (Anthropic SDK, embedding generation, HDBSCAN clustering). Language choice is a one-way door.
- **Decision:** Python 3.12 with FastAPI.
- **Alternatives Considered:**
  - *Rust (Axum):* Superior performance and type safety. Rejected because the pipeline requires Python-only libraries (anthropic SDK, scikit-learn, google-play-scraper). Writing the pipeline in Python and the API in Rust means two codebases, two deployment pipelines, two dependency trees — unacceptable for a solo developer.
  - *TypeScript (Node.js/Hono):* Could share language with the frontend. Rejected because the ML/AI ecosystem (clustering, embeddings, scraping libraries) is significantly stronger in Python.
- **Consequences:** (+) Fast iteration, rich AI/ML ecosystem, single language for API + pipeline. (-) Higher memory usage and slower cold starts than Rust. Acceptable because the API is not latency-critical (CDN-cached public content) and the pipeline runs as a background job.

### ADR-2: Single-Service API + Batch Pipeline (Not Microservices, Not Event-Driven)

- **Status:** Accepted
- **Context:** The system has two workloads: a web API (request-response) and a data pipeline (batch). These could be structured as separate microservices with event-driven communication, or as a single codebase with two runtime modes.
- **Decision:** Monorepo with a single Python codebase. The API and pipeline share models, utilities, and the database connection layer. Deployed as two Cloud Run targets (service for API, job for pipeline).
- **Alternatives Considered:**
  - *Microservices + Pub/Sub:* Separate API service, separate pipeline service, communicating via GCP Pub/Sub. Rejected because there are only two components, they are not independently scalable (the pipeline runs once every 12h), and Pub/Sub adds $10-20/month and operational complexity for zero benefit.
  - *Event-driven pipeline (stage-by-stage):* Each pipeline stage is a separate Cloud Function triggered by Pub/Sub. Rejected because the pipeline is sequential — there is no fan-out, no concurrent consumers, no benefit from event-driven decomposition.
- **Consequences:** (+) One codebase, one deployment pipeline, shared code (models, DB layer), minimal operational surface. (-) API and pipeline are coupled at the code level (shared schema changes require deploying both). Acceptable because they share the same database schema by design.

### ADR-3: Layered Code Structure (Not Hexagonal)

- **Status:** Accepted
- **Context:** Internal code organization for the backend.
- **Decision:** Layered architecture — routes → services → repositories (data access). No ports/adapters abstraction.
- **Alternatives Considered:**
  - *Hexagonal (ports & adapters):* Domain logic isolated from infrastructure via interfaces. Rejected because the API has minimal domain logic — it is primarily read queries with tier-based access checks. The pipeline is a linear script, not a long-lived service. The testability benefit of hexagonal (mocking adapters) is not needed when integration tests against a Neon branch provide better coverage.
  - *Clean architecture:* Even more layers. Rejected for the same reasons as hexagonal, amplified.
- **Consequences:** (+) Less boilerplate, faster development, easier for a solo developer to navigate. (-) If the API grows complex business rules (e.g., personalized feed ranking, recommendation engine), the lack of domain isolation will make refactoring harder. Mitigated by introducing hexagonal for specific complex modules when needed, not across the entire codebase.

### ADR-4: Neon PostgreSQL (Not Supabase, Not Cloud SQL)

- **Status:** Accepted
- **Context:** Need a PostgreSQL database that supports pgvector, has low operational overhead, and minimizes cost for a solopreneur.
- **Decision:** Neon (us-east-1).
- **Alternatives Considered:**
  - *Supabase:* Bundled auth, real-time, storage. Rejected because idea-fork uses Google OAuth (not Supabase Auth), has no real-time requirements, and no file storage needs. Supabase's bundled features provide no value here, and its pricing does not scale to zero.
  - *GCP Cloud SQL:* Full PostgreSQL control. Rejected because it requires always-on instances ($30-50/month minimum), manual backup configuration, and more ops overhead. Neon's scale-to-zero and branching model are superior for a solopreneur's development workflow and cost profile.
- **Consequences:** (+) Scale-to-zero (pay only for what you use), branching for dev/PR environments, managed pgvector, serverless. (-) Neon does not support all PostgreSQL extensions (e.g., pg_cron). If scheduled database maintenance tasks are needed, they must run from the pipeline or Cloud Scheduler, not from within PostgreSQL. Acceptable.

### ADR-5: Cloudflare Workers (Frontend) + GCP Cloud Run (Backend)

- **Status:** Accepted
- **Context:** The frontend requires edge SSR for <2s TTFB globally and SEO. The backend requires Python container support. No single platform excels at both.
- **Decision:** Split — Cloudflare Workers for frontend (Next.js via OpenNext), GCP Cloud Run for backend (FastAPI).
- **Alternatives Considered:**
  - *Vercel (frontend) + Cloud Run (backend):* Vercel is the simplest Next.js hosting. Rejected as the long-term choice because Vercel's pricing scales aggressively with traffic. Acceptable as a fallback if OpenNext proves unreliable (see Risk in Section 9.1).
  - *Cloud Run for everything:* Run both frontend and backend on Cloud Run. Rejected because Cloud Run SSR is single-region (no edge), resulting in higher TTFB for non-US users. The PRD requires <2s TTFB; edge SSR ensures this globally.
  - *Cloudflare for everything:* Run the backend as a Cloudflare Worker. Rejected because Cloudflare Workers use V8 runtime, which doesn't support Python natively (WASM Python is experimental and doesn't support scikit-learn, SQLAlchemy, etc.).
- **Consequences:** (+) Best-in-class for each workload. (-) Mixed cloud ecosystem increases cognitive load (two dashboards, two CLI tools, two billing accounts). Mitigated by CI/CD automation (GitHub Actions handles both deployments) and clear separation of concerns.

### ADR-6: Next.js 15 (App Router) for Frontend

- **Status:** Accepted
- **Context:** The frontend needs SSR for SEO, client-side interactivity for infinite scroll and filters, and responsive design. Framework choice is a one-way door.
- **Decision:** Next.js 15 with App Router.
- **Alternatives Considered:**
  - *Astro:* Excellent for content-heavy sites with minimal interactivity. Rejected because idea-fork has significant client-side interactivity (infinite scroll, tag filter re-sorting, auth modals, optimistic bookmark updates). Astro's island architecture adds friction for interactive features.
  - *SvelteKit:* Smaller bundle, good SSR. Rejected because the UI toolkit recommendation (shadcn/ui, Radix UI) is React-only. Rebuilding all accessible components in Svelte is not viable for a solo developer.
  - *Remix:* Good SSR with progressive enhancement. Rejected because Cloudflare Workers support for Remix is less mature than for Next.js (via OpenNext). Also, the Next.js ecosystem (shadcn/ui, React libraries) is larger.
- **Consequences:** (+) Mature ecosystem, shadcn/ui compatibility, strong SSR + client interactivity, large community. (-) Next.js bundle size is larger than alternatives. Mitigated by code splitting (automatic with App Router) and edge CDN caching.

### ADR-7: Google OAuth + Self-Issued JWT (Not Supabase Auth, Not Auth0)

- **Status:** Accepted
- **Context:** The product needs social login (Google OAuth). The PRD specifies Google OAuth as P0 and email/password as P1.
- **Decision:** Implement Google OAuth directly (OAuth2 authorization code flow) and issue self-managed JWTs from the FastAPI backend.
- **Alternatives Considered:**
  - *Supabase Auth:* Managed auth with social providers. Rejected because the project doesn't use Supabase for the database, so adding Supabase Auth introduces a dependency on a service not otherwise used. Also, Supabase Auth stores users in its own database, creating a data ownership split.
  - *Auth0:* Managed auth service. Rejected because Auth0's free tier has a 7,500 MAU limit and the paid tier starts at $23/month. For a solopreneur building a product with uncertain growth, self-managed JWT avoids recurring auth costs.
  - *NextAuth.js (Auth.js):* Client-side auth library for Next.js. Rejected because the auth state needs to be validated on the FastAPI backend (for tier checks, API authorization). Splitting auth between Next.js (session) and FastAPI (validation) creates complexity. Centralizing JWT issuance in FastAPI makes the backend the single source of truth for auth state.
- **Consequences:** (+) Full control over auth flow, no third-party dependency, no user data split, no recurring auth cost. (-) Must implement token refresh, token revocation, and security best practices manually. Mitigated by following established JWT patterns (short-lived access token, httpOnly refresh cookie, token rotation).
