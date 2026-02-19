# idea-fork — Software Architecture Design Document

**Status:** Draft
**Author:** zzoo
**Date:** 2026-02-19
**PRD Reference:** [docs/prd.md](./prd.md)
**UX Strategy Reference:** [docs/ux-strategy.md](./ux-strategy.md)

---

## 1. Context & Scope

### 1.1 Problem Statement

Builders waste 5+ hours/week manually browsing Reddit, app store reviews, and forums to find user pain points worth building for. idea-fork runs a periodic batch pipeline that fetches posts from four platforms (Reddit, Product Hunt, Play Store, App Store), tags them with an LLM, clusters similar needs, and generates AI product briefs — then serves the results as a feed-style website where builders browse ranked complaints and read opportunity assessments. No existing tool covers the full path from raw complaint discovery to actionable business opportunity.

### 1.2 System Context Diagram

```
                                    ┌─────────────────┐
                                    │   idea-fork      │
                                    │   (this system)  │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
              ┌─────▼──────┐          ┌──────▼──────┐         ┌──────▼──────┐
              │  Pipeline   │          │  Web App    │         │  Database   │
              │  (Python)   │          │  (Next.js)  │         │  (Neon PG)  │
              └─────┬──────┘          └──────┬──────┘         └─────────────┘
                    │                        │
        ┌───────────┼───────────┐    ┌───────┼────────┐
        │           │           │    │       │        │
   ┌────▼───┐ ┌────▼───┐ ┌────▼──┐ │  ┌────▼──┐ ┌──▼────┐
   │ Reddit │ │Product │ │Play/  │ │  │Stripe │ │Google │
   │  API   │ │Hunt API│ │App    │ │  │  API  │ │OAuth  │
   └────────┘ └────────┘ │Store  │ │  └───────┘ └───────┘
                         │Scrape │ │
                         └───────┘ │
                              ┌────▼───┐  ┌────────┐  ┌────────┐
                              │ LLM    │  │PostHog │  │ Resend │
                              │(Claude)│  │        │  │(email) │
                              └────────┘  └────────┘  └────────┘
```

**Actors:**
- **Anonymous visitors** — Browse feed and brief summaries, no auth
- **Free registered users** — Bookmarks, 3 deep dives/day
- **Pro subscribers ($9/mo)** — Full briefs, unlimited deep dives, tracking, notifications, digest email

**Data flows:**
- **Inbound (pipeline):** Posts from 4 platforms → LLM tagging → clustering → brief generation → stored in Neon
- **Outbound (web):** Neon → server-rendered pages → browser. PostHog events from browser. Stripe webhooks. Resend digest emails.

### 1.3 Assumptions

| Assumption | If Wrong |
|---|---|
| ~2,000 posts per pipeline cycle is manageable volume | May need to shard pipeline or increase cycle frequency |
| Haiku-tier LLM ($1-2/cycle) handles tagging + clustering + briefs within budget | Need prompt optimization or cheaper model |
| Reddit API remains accessible at current terms | Largest data source disappears; must lean on other 3 sources |
| Solo developer for foreseeable future | Architecture would need to evolve toward team-scale patterns |
| Global audience, English-only content | No i18n, no regional data isolation |
| Feed freshness at 6-24h intervals is acceptable (not real-time) | Would need streaming architecture — fundamentally different system |

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Feed page loads in <2s on standard connection (server-rendered, no client-side data fetch for initial render)
- Pipeline completes a full cycle (fetch → tag → cluster → briefs) within 30 minutes for ~2,000 posts
- LLM costs stay under $2 per pipeline cycle at Haiku-tier pricing
- Infrastructure cost under $50/month at <1,000 DAU (scale-to-zero where possible)
- SEO-indexable: feed and brief pages server-rendered with unique URLs and OpenGraph meta
- Zero-downtime deployments for the web app
- All source data traceable to original posts (every brief and feed card links to source)

### 2.2 Non-Goals

- **Real-time feed updates.** The pipeline is batch. No WebSockets, no SSE, no polling for new data.
- **Multi-region deployment.** Single region (us-east) is sufficient for a global English-speaking audience. CDN handles static asset distribution.
- **Microservices.** Two deployable units (web app + pipeline) is the ceiling. No service mesh, no API gateway, no inter-service communication protocol.
- **Custom ML models.** We use off-the-shelf LLM APIs for tagging/clustering/briefs. No training, no fine-tuning, no model hosting.
- **Native mobile app.** Responsive web only. No React Native, no push notifications.
- **Team features.** No organizations, no shared workspaces, no RBAC beyond free/pro.
- **API access.** No public API for third-party integrations.

---

## 3. High-Level Architecture

### 3.1 Architecture Style

**System Architecture: Two-unit hybrid (request-response web + batch pipeline)**

The system has two distinct runtime modes:

1. **Web app** — Request-response. User requests a page, server queries the database, returns rendered HTML. Standard Next.js SSR pattern.
2. **Pipeline** — Batch job triggered on a schedule. Fetches external data, processes it through LLM calls, writes results to the database. No user interaction during execution.

These two units share a database but have no runtime communication. The pipeline writes, the web app reads. The database is the integration point.

**Rationale:** This is the simplest architecture that satisfies the requirements. The web app and pipeline have completely different runtime characteristics (interactive vs. batch), different scaling needs (scale by concurrent users vs. scale by data volume), and different language requirements (TypeScript for SSR vs. Python for LLM orchestration). Separating them avoids compromising either. A single monolith would force Python for SSR (awkward) or TypeScript for LLM pipelines (less ecosystem support). Microservices would add operational overhead that a solo developer cannot justify.

**Alternatives considered:**
- *Single Next.js monolith with API routes calling LLMs:* Rejected. Long-running pipeline jobs (10-30 min) don't fit the request-response model of API routes or serverless functions. Timeout limits on Cloudflare Workers (30s) and Vercel (60s) make this impractical.
- *Three services (frontend + API + pipeline):* Rejected. The web API layer is thin CRUD reads — Next.js API routes handle this without a separate backend service. Adding a third deployable unit increases ops burden without proportional benefit.

**Code Structure: Layered (both units)**

Both the Next.js app and the Python pipeline use layered architecture internally. The domain logic is straightforward: the web app is mostly database reads with paywall enforcement, and the pipeline is a linear sequence of steps. Hexagonal architecture's port/adapter indirection adds boilerplate without payoff here — the web app won't swap its database, and the pipeline's external integrations (Reddit API, LLM API) are tightly coupled to their APIs by nature.

**Rationale:** Solo developer, speed of delivery is priority. Layered is the fastest to scaffold, easiest to navigate, and sufficient for the complexity level. If business logic grows (e.g., complex ranking algorithms, custom clustering), specific modules can be refactored toward hexagonal without rewriting the whole app.

### 3.2 Container Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Cloudflare (Edge)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          Next.js App (Cloudflare Workers)              │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ SSR Pages    │  │ API Routes   │  │ Middleware   │  │  │
│  │  │ /, /briefs,  │  │ /api/auth,   │  │ (auth check, │  │  │
│  │  │ /needs/:id   │  │ /api/stripe, │  │  rate limit) │  │  │
│  │  │              │  │ /api/bookmark│  │              │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │  │
│  │         │                 │                             │  │
│  └─────────┼─────────────────┼─────────────────────────────┘  │
│            │                 │                                │
└────────────┼─────────────────┼────────────────────────────────┘
             │                 │
             │    ┌────────────▼──────────────┐
             │    │       Neon PostgreSQL      │
             │    │       (us-east-1)          │
             ├───▶│                            │◀──────┐
             │    │  posts, clusters, briefs,  │       │
             │    │  users, subscriptions,     │       │
             │    │  bookmarks, tracking       │       │
             │    └───────────────────────────┘       │
             │                                        │
┌────────────┼────────────────────────────────────────┼────────┐
│            │         GCP (us-east4)                  │        │
│  ┌─────────▼──────────────────────────────────┐     │        │
│  │      Pipeline Worker (Cloud Run Job)        │     │        │
│  │                                             │     │        │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │     │        │
│  │  │ Fetchers │ │ LLM      │ │ Clustering │  │─────┘        │
│  │  │ (Reddit, │ │ Tagger   │ │ + Brief    │  │              │
│  │  │  PH, App │ │          │ │ Generator  │  │              │
│  │  │  Stores) │ │          │ │            │  │              │
│  │  └──────────┘ └──────────┘ └────────────┘  │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │      Cloud Scheduler (cron trigger)         │              │
│  │      "0 */6 * * *" (every 6 hours)          │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘

External Services:
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Stripe   │  │ Google   │  │ PostHog  │  │ Resend   │
  │ (payment)│  │ OAuth    │  │(analytics│  │ (email)  │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

| Container | Technology | Responsibility | Communication |
|---|---|---|---|
| **Next.js App** | Next.js 15+ on Cloudflare Workers (via OpenNext) | SSR pages, API routes (auth, Stripe webhooks, CRUD), middleware (auth check, rate limiting) | HTTPS to Neon (connection pooling via Neon serverless driver). HTTPS to Stripe, Google OAuth, PostHog. |
| **Pipeline Worker** | Python 3.12 on GCP Cloud Run Job | Periodic batch: fetch → tag → rank → cluster → generate briefs → write to Neon | HTTPS to Reddit API, Product Hunt API, Play/App Store scrapers, LLM API (Claude Haiku). PostgreSQL wire protocol to Neon. |
| **Neon PostgreSQL** | Neon Serverless Postgres (us-east-1) | All persistent storage: posts, tags, clusters, briefs, users, subscriptions, bookmarks, tracked keywords, notifications | PostgreSQL wire protocol (with connection pooling). Serverless driver for edge runtime. |
| **Cloud Scheduler** | GCP Cloud Scheduler | Triggers pipeline on a configurable cron schedule (default: every 6 hours) | HTTPS to Cloud Run Job (triggering execution) |

### 3.3 Component Overview

**Next.js App — Internal Components:**

| Module | Responsibility | Critical Path? |
|---|---|---|
| **Feed** | Feed page SSR, tag filtering (client-side re-sort), infinite scroll pagination, card rendering | Yes — landing page |
| **Briefs** | Brief list SSR, brief detail SSR, cycle navigation, free/pro content gating (blur + paywall) | Yes — core value |
| **Deep Dive** | Need detail SSR, frequency/intensity display, source post listing, daily limit enforcement | Yes — conversion trigger |
| **Auth** | Google OAuth flow (NextAuth.js), session management, JWT access/refresh tokens | Yes — required for any gated feature |
| **Billing** | Stripe Checkout session creation, webhook handler (subscription lifecycle), pro status checks | Yes — revenue |
| **Bookmarks** | Bookmark CRUD, bookmarks page | No |
| **Tracking** | Keyword CRUD, match querying, notification count | No |
| **Middleware** | Auth verification, pro tier check, deep dive rate limiting, request logging | Yes — enforces all access rules |

**Pipeline Worker — Internal Components:**

| Module | Responsibility | Critical Path? |
|---|---|---|
| **Fetchers** | Platform-specific data fetchers: Reddit API client, Product Hunt API client, Play Store scraper, App Store scraper | Yes — no data = no product |
| **Tagger** | Sends posts to Haiku-tier LLM with tagging prompt, parses response, stores tag | Yes — feed quality |
| **Ranker** | Computes engagement score per post using platform-native signals (upvotes, comments, helpfulness votes) | Yes — feed ordering |
| **Clusterer** | Generates embeddings for tagged posts (complaint/need/feature-request only), clusters via cosine similarity or LLM-based grouping, stores clusters | Yes — brief quality |
| **Brief Generator** | Selects top ~10 clusters, sends to LLM with brief-generation prompt (problem summary, source evidence, alternatives, opportunity signal), stores briefs | Yes — core value |
| **Orchestrator** | Runs the full pipeline in sequence: fetch → tag → rank → store → cluster → generate briefs. Handles retries, logging, error reporting. | Yes — coordinates everything |

---

## 4. Data Architecture

### 4.1 Data Flow

**Flow 1: Pipeline cycle (write path)**

```
Cloud Scheduler triggers Pipeline Worker
  │
  ▼
Fetch ~2,000 posts from 4 platforms
  │
  ▼
Deduplicate (by source_url)
  │
  ▼
LLM tags each post → complaint|need|feature-request|discussion|self-promo|other
  │
  ▼
Compute engagement score per post (platform-specific formula)
  │
  ▼
Store posts + tags + scores to `posts` table
  │
  ▼
Generate embeddings for complaint/need/feature-request posts
  │
  ▼
Cluster posts (new + recent from last N cycles) → ~50 clusters
  │
  ▼
Rank clusters by: volume × intensity × competitive gap
  │
  ▼
Store clusters + post-cluster mappings to `clusters` / `cluster_posts` tables
  │
  ▼
Generate AI briefs for top ~10 clusters
  │
  ▼
Store briefs to `briefs` table with cluster references
  │
  ▼
Update `pipeline_cycles` table with metadata (timestamp, post count, cluster count, brief count)
```

**Consistency guarantee:** Pipeline writes are transactional per stage. If tagging completes but clustering fails, tagged posts are persisted and the next cycle can resume from clustering. Each stage is idempotent — rerunning with the same input produces the same output.

**Flow 2: Feed page load (read path)**

```
User requests / (feed page)
  │
  ▼
Next.js SSR → Middleware checks auth (optional, for personalization)
  │
  ▼
Server component queries Neon:
  SELECT posts with tags, engagement scores, platform metadata
  FROM posts
  WHERE cycle_id = latest AND tag IN ('complaint','need','feature-request')
  ORDER BY tag_priority, engagement_score DESC
  LIMIT 20
  │
  ▼
Render HTML with platform-styled cards, tag badges, metrics
  │
  ▼
Return server-rendered page (cached at edge for anonymous users)
  │
  ▼
Client hydrates → infinite scroll fetches next batches via API route
```

**Consistency guarantee:** Strong consistency. The web app reads from the primary Neon instance. No read replicas, no eventual consistency. Acceptable because read load is modest (<1,000 DAU target) and Neon handles this without issues.

**Flow 3: Upgrade to Pro (write path)**

```
User clicks "Upgrade to Pro" → redirect to Stripe Checkout
  │
  ▼
Stripe Checkout completes → Stripe sends webhook to /api/stripe/webhook
  │
  ▼
Webhook handler verifies signature, extracts subscription data
  │
  ▼
UPDATE users SET tier = 'pro', stripe_subscription_id = ?, stripe_customer_id = ?
  │
  ▼
Return 200 to Stripe
  │
  ▼
User redirected back to original page with ?upgrade=success query param
  │
  ▼
Page reads user.tier from session → paywall elements removed
```

### 4.2 Storage Strategy

**Single database: Neon PostgreSQL**

Everything lives in one Postgres database. This is deliberate. The data model is relational (posts belong to clusters, clusters belong to cycles, briefs reference clusters, bookmarks reference posts/briefs, users have subscriptions). A single relational database avoids the complexity of cross-store joins, distributed transactions, and data synchronization.

| Data Category | Storage | Why Postgres | Retention |
|---|---|---|---|
| **Posts** (fetched content, tags, scores) | Neon PG | Relational — posts have tags, belong to cycles, referenced by clusters and bookmarks | Keep last 90 days of posts. Older posts archived (soft-delete, excluded from queries). |
| **Clusters** (grouped needs, rankings) | Neon PG | Relational — clusters belong to cycles, contain multiple posts, referenced by briefs | Keep all clusters. They are small (50/cycle × 4 cycles/day = 200/day). |
| **Briefs** (AI-generated) | Neon PG | Relational — briefs reference clusters and posts, have cycle metadata | Keep all briefs permanently. Core content of the product. |
| **Users** (profile, tier, Stripe IDs) | Neon PG | Relational — standard user table | Permanent |
| **Subscriptions** (Stripe subscription state) | Neon PG | Denormalized from Stripe webhooks. Single source of truth for tier checks. | Permanent |
| **Bookmarks** | Neon PG | Join table — user × (post or brief) | Permanent per user |
| **Tracked keywords** | Neon PG | Simple key-value per user | Permanent per user |
| **Notifications** (keyword match flags) | Neon PG | Computed during pipeline cycle — "these posts match user X's keywords" | Keep last 30 days |
| **Pipeline cycle metadata** | Neon PG | Cycle ID, timestamp, counts, status | Permanent (small, useful for debugging) |
| **Embeddings** (for clustering) | Neon PG with pgvector | Vector similarity search for clustering. pgvector extension on Neon. | Keep latest cycle + 2 previous (rolling window for cluster stability) |

**Why not separate stores:**
- *Redis for caching:* Not needed at <1,000 DAU. Neon handles the read load. Postgres connection pooling via Neon's serverless driver is sufficient. If latency becomes an issue, add edge caching at the CDN level first (zero additional infra).
- *Elasticsearch for search:* No full-text search requirement. Tag filtering is a simple WHERE clause. Trending keywords are precomputed by the pipeline.
- *S3/R2 for files:* No file uploads. All content is text. Briefs are stored as structured JSON in Postgres.

### 4.3 Caching Strategy

**Edge caching (Cloudflare CDN) — not application-level caching.**

| What | Cache Where | TTL | Invalidation |
|---|---|---|---|
| Feed page (anonymous) | Cloudflare edge (stale-while-revalidate) | 5 minutes | Pipeline cycle completion triggers cache purge via Cloudflare API |
| Brief list page (anonymous) | Cloudflare edge | 5 minutes | Same trigger |
| Brief detail page | Cloudflare edge | 1 hour (content doesn't change between cycles) | Pipeline cycle purge |
| Static assets (JS, CSS, images) | Cloudflare edge | 1 year (content-hashed filenames) | Immutable |
| API responses (authenticated) | No edge cache | N/A | N/A — authenticated responses are per-user |

**Rationale:** Edge caching handles the performance requirement (<2s load) without adding a Redis or Memcached layer. The content is batch-produced — it changes at most every 6 hours. Between cycles, the same data is served to every anonymous user. This is a perfect fit for CDN caching.

**No application-level caching (no Redis) because:**
- Data changes at most 4 times/day (pipeline cycles). CDN cache covers this.
- Authenticated read paths (bookmarks, tracking matches) are low-volume and per-user — not cacheable.
- Adding Redis means another piece of infrastructure to monitor, pay for, and maintain. Not justified at this scale.

---

## 5. Infrastructure & Deployment

### 5.1 Compute Platform

| Unit | Platform | Rationale |
|---|---|---|
| **Next.js App** | Cloudflare Workers (via OpenNext) | Edge SSR for best TTFB globally. Predictable pricing. CDN built-in. Scale-to-zero for cost efficiency. |
| **Pipeline Worker** | GCP Cloud Run Job | Container-based, runs to completion, auto-terminates (no idle cost). Supports long-running executions (up to 24h). Python runtime with full library access (unlike Workers' V8 constraint). |
| **Cron Trigger** | GCP Cloud Scheduler | Triggers Cloud Run Job on schedule. Simpler than building cron into the pipeline itself. |

**Alternatives considered:**
- *Vercel for Next.js:* Better DX for rapid prototyping, but cost grows unpredictably with traffic. Cloudflare's pricing is more predictable for a solo developer. Migration path exists if DX friction is too high early on — start with Vercel, migrate to Cloudflare when traffic justifies it.
- *Cloudflare Workers for pipeline:* Rejected. V8 runtime can't run Python data science libraries (pandas, scikit-learn for clustering). 30-second CPU time limit is insufficient for a pipeline that runs 10-30 minutes.
- *GCP Cloud Run (always-on) for pipeline:* Rejected. The pipeline runs for ~20 minutes every 6 hours. Paying for 24/7 compute is wasteful. Cloud Run Jobs run to completion and shut down.

**Cold start considerations:**
- Cloudflare Workers: Near-zero cold starts (<5ms). Not a concern.
- Cloud Run Job: Cold start is ~5-10 seconds for a Python container. Acceptable — the pipeline runs for minutes, so a few seconds of startup is negligible.

**Scaling model:**
- Next.js on Workers: Auto-scales at the edge per-request. No configuration needed.
- Pipeline on Cloud Run Job: Single instance per execution. No concurrent scaling needed — the pipeline is a single sequential batch. If data volume grows beyond what one instance can process in 30 minutes, the pipeline can be parallelized by platform (one job per source) using Cloud Run Job parallelism.

### 5.2 Deployment Strategy

**Next.js App:**
- Git push to `main` → GitHub Actions → Build Next.js → Deploy to Cloudflare Workers via Wrangler CLI
- Cloudflare handles zero-downtime deployment (new version is deployed atomically, old version drains)
- Rollback: `wrangler rollback` to previous version

**Pipeline Worker:**
- Git push to `main` → GitHub Actions → Build Docker image → Push to GCP Artifact Registry → Update Cloud Run Job
- Cloud Run Job runs the new image on next scheduled trigger
- Rollback: Update Cloud Run Job to point to previous image tag

**No blue-green or canary needed.** The web app is stateless and deploys atomically on Workers. The pipeline is a batch job — if it fails, the previous cycle's data is still served. Users see stale-but-valid data until the next successful cycle.

### 5.3 Environment Topology

| Environment | Purpose | Differences from Production |
|---|---|---|
| **Local** | Development | SQLite or local Postgres. Pipeline runs against sample data (no real API calls). Next.js dev server. |
| **Preview** | PR review | Cloudflare Workers preview deployment (auto-deployed per PR). Neon branch database (zero-cost fork of production schema, no production data). Pipeline not deployed in preview — feed shows seed data. |
| **Production** | Live | Cloudflare Workers production. Neon main branch. Cloud Run Job on cron schedule. Real API keys. |

**No staging environment.** For a solo developer, preview deployments per PR + Neon branching provides sufficient pre-production validation without the cost and maintenance of a persistent staging environment.

---

## 6. Cross-Cutting Concerns

### 6.1 Authentication & Authorization

**Authentication flow:**

```
User clicks "Sign in" → Google OAuth 2.0 (via NextAuth.js)
  │
  ▼
Google returns profile (email, name, avatar)
  │
  ▼
NextAuth.js creates or updates user record in Neon
  │
  ▼
Issues session:
  - Access token: JWT, 15-minute expiry, stored in httpOnly secure cookie
  - Refresh token: 30-day expiry, stored in httpOnly secure cookie
  - Session contains: user_id, email, tier (free|pro)
  │
  ▼
Middleware reads session cookie on every request
  - Valid session → attach user context to request
  - Expired access token → auto-refresh from refresh token
  - No session → anonymous user (full feed access, limited features)
```

**Authorization model: Tier-based (not RBAC)**

There are only two tiers: `free` and `pro`. Authorization checks are simple boolean conditions in middleware/route handlers:

| Resource | Anonymous | Free | Pro |
|---|---|---|---|
| Feed (read) | Yes | Yes | Yes |
| Brief titles/summaries | Yes | Yes | Yes |
| Brief full detail | No | No | Yes |
| Deep dive (3/day) | Yes | Yes (counted) | Yes (unlimited) |
| Bookmarks | No | Yes | Yes |
| Tracking | No | No | Yes |
| Notifications | No | No | Yes |

**Deep dive rate limiting:** Stored in a `deep_dive_counts` table keyed by user_id (or anonymous session fingerprint) + date. Checked in middleware before rendering the deep dive page. Resets daily at midnight UTC.

**Where auth is enforced:** Next.js middleware. Every request passes through a middleware chain that:
1. Parses the session cookie (if present)
2. Attaches user context (or anonymous context) to the request
3. For protected routes, checks tier and feature access
4. For rate-limited features, checks and increments counters

Auth is never enforced in the database (no row-level security). The middleware is the single enforcement point.

### 6.2 Observability

**Logging:**

| Component | What is Logged | Where |
|---|---|---|
| Next.js App | Request logs (method, path, status, latency, user_id), auth events (login, logout, token refresh), Stripe webhook events, errors with stack traces | Cloudflare Workers Logpush → aggregation (Cloudflare dashboard or pipe to external) |
| Pipeline Worker | Stage start/end with timing (fetch: 45s, tag: 120s, cluster: 90s, briefs: 60s), post counts per source, LLM call durations and costs, errors with full context | GCP Cloud Logging (built into Cloud Run) |

Structured JSON logs in both components. Log levels: `error` (things that need attention), `warn` (unexpected but handled), `info` (pipeline stage transitions, auth events).

**Metrics:**

| Metric | Source | Alert Threshold |
|---|---|---|
| Pipeline cycle duration | Pipeline logs | >45 minutes (warn), >60 minutes (error) |
| Pipeline stage failure count | Pipeline logs | Any failure (error) |
| Posts fetched per source per cycle | Pipeline logs | <100 from any source (warn — may indicate API issue) |
| LLM cost per cycle | Pipeline logs (token counts × pricing) | >$5 per cycle (error) |
| Feed page p95 latency | Cloudflare analytics | >2s (warn), >4s (error) |
| Stripe webhook failures | API route logs | Any 5xx response (error) |
| Auth error rate | Middleware logs | >5% of auth attempts in 15 min (error) |

**Tracing:** Not needed. The system has two independent units with no inter-service calls. Pipeline stages are traced via structured logs (start/end timestamps per stage). Web requests are simple (SSR or API route → single DB query → response).

**Alerting:** Pipeline failures and Stripe webhook errors alert immediately (Sentry). Performance degradation alerts via Cloudflare analytics (email). PostHog for business metrics (non-alerting, dashboard only).

### 6.3 Error Handling & Resilience

**Pipeline resilience:**

| Failure | Handling | Retry? |
|---|---|---|
| Reddit API rate limited (429) | Exponential backoff: 1s, 2s, 4s, 8s, 16s. Max 5 retries. | Yes |
| Product Hunt API error | Same retry policy as Reddit | Yes |
| Play/App Store scraping failure (HTML changed) | Log error, skip source for this cycle, alert via Sentry | No (requires code fix) |
| LLM API error (500, timeout) | Retry 3 times with 2s backoff. If still failing, skip remaining untagged posts — they'll be picked up next cycle. | Yes (limited) |
| LLM returns unparseable response | Log the response, mark post as `tag: other`, continue | No |
| Database write failure | Retry 3 times. If persistent, abort cycle and alert. Previous cycle's data remains valid. | Yes (limited) |

**Key principle:** The pipeline is designed to produce partial results rather than no results. If Reddit fails but the other 3 sources succeed, the cycle completes with data from 3 sources. The feed always has something to show.

**Web app resilience:**

| Failure | Handling |
|---|---|
| Database query fails | Return 500 error page with "Something went wrong" message and retry button. Edge-cached pages continue to serve stale content for anonymous users. |
| Stripe webhook delivery fails | Stripe retries automatically (up to 3 days). Webhook handler is idempotent — processing the same event twice is safe. |
| Google OAuth provider down | Show error on auth modal: "Sign-in failed. Please try again." No fallback to email/password in v1. |

**Timeout budgets:**

| Operation | Timeout |
|---|---|
| SSR database query | 5 seconds |
| API route database query | 5 seconds |
| LLM API call (tagging, single post) | 30 seconds |
| LLM API call (brief generation, single cluster) | 60 seconds |
| External API fetch (per source) | 30 seconds per request, 5 minutes total per source |
| Stripe Checkout session creation | 10 seconds |

### 6.4 Security

**Transport:**
- All traffic over HTTPS (TLS 1.3). Cloudflare terminates TLS at the edge.
- Neon connections use TLS by default (enforced by Neon).

**Data at rest:**
- Neon encrypts data at rest (AES-256). No additional encryption needed.
- No PII beyond email address and display name (from Google OAuth). No passwords stored (OAuth only in v1).

**Secret management:**
- Cloudflare Workers: Secrets stored in Wrangler secrets (encrypted at rest, injected as environment variables at runtime).
- Cloud Run: Secrets stored in GCP Secret Manager, mounted as environment variables.
- Secrets include: Neon database URL, Stripe secret key, Stripe webhook signing secret, Google OAuth client secret, LLM API key, Resend API key, PostHog API key.

**Input validation:**
- All user input (bookmark IDs, keyword strings, query parameters) validated via Zod schemas in API routes.
- Keyword tracking input: max 50 characters, alphanumeric + spaces + hyphens only, max 20 keywords per user.
- No user-generated content displayed to other users (no XSS vector from user input). All displayed content comes from the pipeline (which is admin-controlled) or external sources (rendered as text, not HTML).

**Rate limiting:**
- Deep dive: 3/day per anonymous session (fingerprint-based) or per user_id. Enforced in middleware.
- API routes: 60 requests/minute per IP for unauthenticated requests, 120/minute for authenticated. Enforced at Cloudflare level (rate limiting rules).
- Stripe webhook: Signature verification on every webhook. Reject without valid signature.

**OWASP considerations:**
- *Injection:* Parameterized queries via Drizzle ORM. No raw SQL.
- *Broken auth:* httpOnly secure cookies for tokens. No tokens in localStorage. CSRF protection via SameSite cookie attribute.
- *Sensitive data exposure:* Stripe customer/subscription IDs stored but never exposed to the client. User tier is derived server-side.
- *SSRF:* Pipeline fetches are to a fixed list of known URLs (Reddit API, Product Hunt API, known App Store/Play Store URLs). No user-controlled URLs.

### 6.5 Performance & Scalability

**Expected load profile:**

| Metric | Launch (Month 1) | Target (Month 3) | Growth Ceiling (this architecture) |
|---|---|---|---|
| DAU | ~100 | ~1,000 | ~10,000 |
| Peak concurrent users | ~20 | ~200 | ~2,000 |
| Feed page views/day | ~300 | ~3,000 | ~30,000 |
| Database queries/sec (peak) | ~5 | ~50 | ~500 |
| Pipeline cycles/day | 4 | 4 | 4 (can increase frequency) |
| Posts per cycle | ~2,000 | ~2,000 | ~10,000 (with more sources/subreddits) |

**Bottleneck analysis:**

| Bottleneck | Mitigation | When It Matters |
|---|---|---|
| **Feed query latency** | Edge cache (CDN) for anonymous users. Database indexes on `cycle_id`, `tag`, `engagement_score`. | Day 1 — affects every user |
| **LLM API throughput** | Batch tagging (send 10 posts per LLM call where possible). Parallel requests (5 concurrent). | Day 1 — pipeline duration |
| **Neon connection limits** | Neon serverless driver with connection pooling. Web app uses ~10 connections. Pipeline uses ~5. Well within Neon free/pro tier limits. | >1,000 concurrent users |
| **Embedding storage** | pgvector with HNSW index. Keep only last 3 cycles of embeddings (~6,000 vectors). | >10,000 posts per cycle |

**Scaling triggers:**
- If feed page p95 latency exceeds 2s despite edge caching → investigate query performance, add database indexes.
- If pipeline duration exceeds 30 minutes → parallelize fetchers (one Cloud Run Job per source, triggered in parallel by Cloud Scheduler).
- If Neon connection count approaches limits → switch from serverless driver to connection pooler (PgBouncer via Neon's built-in pooler).
- If DAU exceeds 10,000 → evaluate Neon read replica for read-heavy queries. This architecture supports ~10K DAU before needing this.

---

## 7. Integration Points

### 7.1 Reddit API

| Aspect | Detail |
|---|---|
| **Provides** | Posts from 10 target subreddits (title, body, upvotes, comment count, author, permalink, timestamp) |
| **Protocol** | REST API (OAuth2 app-only auth). JSON responses. |
| **Rate limit** | 100 requests/minute per OAuth token. Paginated (25-100 posts per request). |
| **Failure mode** | 429 (rate limited) → retry with backoff. 503 → retry. 403 → check OAuth token expiry, re-authenticate. |
| **Fallback** | If Reddit is completely down, pipeline continues with other 3 sources. Feed is sparse but functional. |
| **SLA dependency** | Medium. Reddit is the largest data source (~50% of posts). Extended outage degrades feed quality. |

### 7.2 Product Hunt API

| Aspect | Detail |
|---|---|
| **Provides** | Product comments (body, upvotes, created_at, product name, product URL) |
| **Protocol** | GraphQL API (API key auth). |
| **Rate limit** | Generous (documented as 500 req/15min for API v2). |
| **Failure mode** | Standard retry policy. |
| **Fallback** | Pipeline continues without PH data. |
| **SLA dependency** | Low. Smaller volume than Reddit (~15% of posts). |

### 7.3 Play Store / App Store Scrapers

| Aspect | Detail |
|---|---|
| **Provides** | 1-3 star reviews from SaaS-related categories (review text, star rating, helpfulness votes, app name, timestamp) |
| **Protocol** | HTTP scraping via established libraries (google-play-scraper, app-store-scraper for Python). |
| **Rate limit** | Self-imposed: 2 requests/second to avoid blocking. |
| **Failure mode** | HTML structure change → scraper breaks → Sentry alert → requires code fix. Retry won't help. |
| **Fallback** | Pipeline continues without affected store's data. |
| **SLA dependency** | Medium. Scrapers are fragile by nature. Monitor closely. |

### 7.4 LLM API (Claude Haiku)

| Aspect | Detail |
|---|---|
| **Provides** | Post tagging (complaint/need/feature-request/discussion/self-promo/other). Brief generation (problem summary, alternatives, opportunity signal). |
| **Protocol** | REST API (Anthropic Messages API). |
| **Rate limit** | Per-key rate limits (typically 1000 req/min for Haiku tier). |
| **Failure mode** | 429 → retry with backoff. 500 → retry. Unparseable response → log, mark as `other`, continue. |
| **Fallback** | If LLM is completely unavailable, pipeline stores untagged posts and skips brief generation. Next cycle reprocesses untagged posts. |
| **SLA dependency** | High for briefs (core value), medium for tagging (feed still shows posts, just unranked). |
| **Cost control** | Track token usage per cycle. Alert if cost exceeds $5/cycle. Use Haiku (cheapest tier) exclusively. |

### 7.5 Stripe

| Aspect | Detail |
|---|---|
| **Provides** | Payment processing, subscription management, customer portal |
| **Protocol** | REST API + webhooks (HTTPS) |
| **Webhook events consumed** | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` |
| **Failure mode** | Webhook delivery failure → Stripe retries for up to 3 days. Handler is idempotent. Checkout API failure → user sees error, can retry. |
| **SLA dependency** | High for upgrade flow. Low for ongoing operation (subscription status is cached in local DB). |

### 7.6 Google OAuth

| Aspect | Detail |
|---|---|
| **Provides** | User authentication (email, name, avatar) |
| **Protocol** | OAuth 2.0 (Authorization Code flow via NextAuth.js) |
| **Failure mode** | Google down → auth unavailable. Feed and anonymous features still work. |
| **SLA dependency** | Medium. Only blocks new sign-ups and re-authentication. Existing sessions remain valid (JWT-based). |

### 7.7 Resend (Email)

| Aspect | Detail |
|---|---|
| **Provides** | Transactional email delivery (weekly digest) |
| **Protocol** | REST API |
| **Failure mode** | API error → retry 3 times with backoff. If persistent, skip digest for this week, alert via Sentry. |
| **SLA dependency** | Low. Digest email is a retention feature, not core. |

### 7.8 PostHog

| Aspect | Detail |
|---|---|
| **Provides** | Analytics event tracking, funnels, user behavior analysis |
| **Protocol** | Client-side JavaScript SDK (browser → PostHog cloud) |
| **Failure mode** | PostHog down → analytics events silently dropped. No impact on user experience. |
| **SLA dependency** | None. Fire-and-forget. |

---

## 8. Migration & Rollout

Not applicable — greenfield project, no existing system to migrate from.

**Launch rollout plan:**

| Phase | What Ships | Who Can Access |
|---|---|---|
| **Alpha** | Pipeline + Feed + Briefs (read-only, no auth) | Developer only (localhost + preview) |
| **Beta** | + Auth + Pro tier + Stripe + Deep dive | Invite-only (shared URL, no public marketing) |
| **Launch** | + Bookmarks + Tracking + Digest email + PostHog analytics | Public (Product Hunt launch, Twitter, Indie Hackers) |

Feature flags (via environment variables, not a feature flag service) control which features are visible. No need for LaunchDarkly at this scale — a simple `FEATURE_BOOKMARKS=true` environment variable is sufficient.

---

## 9. Risks & Open Questions

### 9.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Neon serverless driver compatibility with Cloudflare Workers edge runtime** | Web app can't query database from edge | Low (Neon explicitly supports this) | Test early in development. Fallback: use Neon's HTTP API (slower but guaranteed compatible). |
| **OpenNext maturity for Cloudflare Workers** | Next.js features break on Workers | Medium | Track OpenNext releases. Fallback: deploy to Vercel initially, migrate to Cloudflare later. |
| **LLM tagging accuracy below usable threshold** | Feed quality degrades, users see irrelevant content | Medium | Test with 1,000 labeled posts before building UI. Iterate prompts. Worst case: feed shows all posts unsorted (still useful, just less curated). |
| **pgvector clustering quality** | Clusters are noisy, briefs are incoherent | Medium | Compare embedding-based clustering vs. LLM-based grouping on sample data. May need to use LLM for clustering instead of embeddings (higher cost but better quality). |
| **Reddit API terms change (again)** | Largest data source becomes unavailable or expensive | Low-Medium | Diversify data sources early. Cache historical Reddit data. Monitor API terms proactively. |
| **Scraper breakage (Play/App Store)** | Reviews from 2 of 4 sources stop flowing | Medium | Use maintained open-source scraper libraries. Set up Sentry alerts on scraper failures. Acceptable degradation — feed still works with 2 sources. |
| **Cloudflare Workers 128MB memory limit** | SSR of large feed pages fails | Low | Paginate aggressively (20 cards per SSR render). Brief detail pages are small. |

### 9.2 Open Questions

| # | Question | Options | Information Needed | Decision Owner |
|---|---|---|---|---|
| 1 | **Embedding model for clustering: which model?** | (A) OpenAI `text-embedding-3-small` — cheap, fast, 1536 dims. (B) Anthropic embedding (if/when available). (C) Local model via sentence-transformers in pipeline container. | Cost per cycle for ~2,000 embeddings. Quality comparison on sample data. | zzoo |
| 2 | **Clustering algorithm: embedding similarity vs. LLM-based grouping?** | (A) Cosine similarity + DBSCAN/HDBSCAN on embeddings — fast, cheap, automated. (B) LLM-based: send batches of posts to LLM, ask it to group them — slower, more expensive, potentially higher quality. (C) Hybrid: embed for rough clusters, then LLM to refine/merge. | Quality comparison on 500 sample posts. Cost difference. | zzoo |
| 3 | **Anonymous deep dive rate limiting: how to identify anonymous users?** | (A) IP-based — simple but shared IPs cause false limits. (B) Browser fingerprint (cookie-based session) — more accurate but cookies can be cleared. (C) Combination of IP + cookie. | Acceptable false-positive rate. How aggressively to enforce for anonymous users. | zzoo |
| 4 | **Start with Vercel (simpler DX) or Cloudflare Workers (cheaper at scale)?** | (A) Vercel for MVP, migrate to Cloudflare if the product succeeds. (B) Cloudflare from day one to avoid migration. | How much friction does OpenNext add vs. native Vercel? Is the migration path smooth? | zzoo |
| 5 | **Pipeline scheduling: fixed interval or adaptive?** | (A) Fixed every 6 hours — simple, predictable. (B) Adaptive based on new post volume — more efficient but more complex. | Whether post volume is consistent enough that fixed scheduling doesn't waste cycles. | zzoo — start with fixed, revisit after 2 weeks of data. |

---

## 10. Architecture Decision Records (ADRs)

### ADR-1: Next.js for Web Application

- **Status:** Accepted
- **Context:** The web app needs server-side rendering for SEO (feed and brief pages indexable), fast initial load (<2s), and a responsive UI with client-side interactivity (tag filtering, infinite scroll, paywall modals). The UX strategy specifies shadcn/ui + Tailwind CSS.
- **Decision:** Next.js 15+ (App Router) as the full-stack web framework. Server components for SSR pages, API routes for CRUD operations, middleware for auth/rate-limiting.
- **Alternatives Considered:**
  - *Remix:* Good SSR, but smaller ecosystem. shadcn/ui is designed for Next.js. Cloudflare Workers support for Remix is mature, but the component library ecosystem tilts toward Next.js. Rejected for ecosystem fit.
  - *Astro + API backend:* Astro is excellent for content sites but lacks the client-side interactivity patterns needed (infinite scroll, optimistic UI for bookmarks, client-side tag filtering). Would need a separate API backend anyway. Rejected for requiring more moving parts.
  - *SvelteKit:* Strong SSR and performance, but team familiarity and component library ecosystem favor React/Next.js. Rejected for ecosystem size.
- **Consequences:**
  - Positive: Large ecosystem, shadcn/ui compatibility, excellent SSR, API routes eliminate need for separate backend, strong Cloudflare Workers support (via OpenNext).
  - Negative: App Router has a learning curve. OpenNext adds a compatibility layer (potential bugs). Bundle size is larger than Svelte/Astro equivalents (mitigated by SSR — initial HTML is server-rendered).

### ADR-2: Two-Unit System (Next.js Web + Python Pipeline)

- **Status:** Accepted
- **Context:** The system has two fundamentally different workloads: (1) a user-facing web application serving pre-computed content, and (2) a batch data pipeline that fetches, tags, clusters, and generates content using LLM APIs. These workloads differ in runtime (interactive vs. long-running batch), language needs (TypeScript for SSR vs. Python for LLM/ML), and scaling (per-request vs. per-cycle).
- **Decision:** Two independently deployable units sharing a Postgres database. No runtime communication between them — the database is the integration point.
- **Alternatives Considered:**
  - *Single Next.js monolith:* Pipeline as Next.js API routes or cron jobs. Rejected — pipeline runs 10-30 minutes, exceeding serverless timeout limits (30s on Workers, 60s on Vercel). Would also force TypeScript for LLM orchestration where Python ecosystem is stronger.
  - *Three-unit system (frontend + API + pipeline):* Rejected — the API layer is thin CRUD reads that Next.js API routes handle perfectly. A third deployable unit adds operational overhead without payoff for a solo developer.
  - *Shared runtime (Python for both web + pipeline):* Rejected — Python SSR frameworks (Django, FastAPI + Jinja) are inferior to Next.js for the interactive, SEO-friendly frontend this product needs. Would sacrifice frontend DX and component ecosystem (shadcn/ui, Radix).
- **Consequences:**
  - Positive: Each unit uses the optimal language for its workload. Independent deployment and scaling. Pipeline failures don't affect the web app (previous cycle's data serves). Simple mental model.
  - Negative: Two codebases to maintain (TypeScript + Python). Database schema shared across codebases requires coordination. No type sharing between units.

### ADR-3: Layered Architecture (Both Units)

- **Status:** Accepted
- **Context:** Need to choose internal code organization for both the Next.js app and Python pipeline. The web app is mostly database reads with access control. The pipeline is a linear sequence of processing stages.
- **Decision:** Layered architecture for both units. Next.js: pages → API routes → data access (Drizzle ORM). Python: orchestrator → stage modules → data access (SQLAlchemy or psycopg3).
- **Alternatives Considered:**
  - *Hexagonal (ports & adapters):* Provides infrastructure abstraction. Rejected — the web app won't swap its database or auth provider. The pipeline's external integrations (Reddit API, LLM API) are tightly coupled to specific APIs. Hexagonal's port/adapter indirection adds boilerplate without a realistic swap scenario.
  - *Clean architecture:* Strictest separation. Rejected — overkill for the domain complexity level. There are no complex business rules — the web app enforces access tiers and serves data. The pipeline runs a fixed sequence of stages.
- **Consequences:**
  - Positive: Minimal boilerplate, fast to scaffold, easy for a solo developer to navigate. Natural fit for Next.js App Router conventions (pages → server components → data fetching).
  - Negative: Layers can leak (data access concerns bleeding into pages). If domain logic grows significantly (e.g., complex ranking algorithms, personalization), specific modules may need refactoring toward hexagonal boundaries. This is acceptable as a future concern.

### ADR-4: Neon PostgreSQL (Single Database)

- **Status:** Accepted
- **Context:** Need persistent storage for posts, clusters, briefs, users, subscriptions, bookmarks, tracked keywords, embeddings, and pipeline metadata. Data is relational (posts belong to clusters, clusters to cycles, etc.). Budget-sensitive solo developer.
- **Decision:** Single Neon PostgreSQL database with pgvector extension for embeddings. Both the web app and pipeline connect to the same database.
- **Alternatives Considered:**
  - *Supabase:* Offers bundled Auth, Storage, Realtime. Rejected — idea-fork uses Google OAuth (NextAuth.js), has no file storage needs, and has no real-time features. Supabase's bundles don't save development time here. Neon's serverless model (scale-to-zero) is better for cost control.
  - *Neon + Redis (caching):* Rejected — data changes at most 4x/day (pipeline cycles). Edge CDN caching handles read performance. Adding Redis increases infrastructure cost and operational surface without measurable benefit at <1,000 DAU.
  - *Neon + Pinecone/Weaviate (vector store):* Rejected — pgvector on Neon handles the embedding volume (~6,000 vectors for a 3-cycle rolling window). A dedicated vector database adds cost and complexity for a workload that fits comfortably in Postgres.
  - *Separate read/write databases (CQRS):* Rejected — read/write ratio is modest (not 10:1+), single Neon instance handles both without strain at target scale.
- **Consequences:**
  - Positive: Single database = single source of truth, no cross-store synchronization, simple backups, simple schema management. Neon's scale-to-zero keeps costs near $0 when idle. Serverless driver works on Cloudflare Workers edge runtime.
  - Negative: Single point of failure (mitigated by Neon's managed redundancy). pgvector performance may not scale beyond ~100K vectors (acceptable — rolling window keeps it under 20K). Schema changes require coordinating both codebases.

### ADR-5: Cloudflare Workers for Frontend Hosting

- **Status:** Proposed (see Open Question #4)
- **Context:** Need edge hosting for Next.js SSR to achieve <2s page loads globally. Two main options: Cloudflare Workers (via OpenNext) or Vercel (native Next.js hosting).
- **Decision:** Cloudflare Workers via OpenNext as the target platform. However, if OpenNext compatibility issues cause significant friction during early development, start with Vercel and migrate to Cloudflare before traffic grows.
- **Alternatives Considered:**
  - *Vercel:* Native Next.js support, best DX, zero configuration. Rejected as primary target because pricing becomes unpredictable at scale ($20/mo base + per-request charges). Acceptable as a temporary starting point.
  - *GCP Cloud Run for Next.js:* Rejected — Cloud Run is not edge-distributed. SSR would happen in a single region, increasing latency for non-US users. Also requires container management.
  - *Self-hosted on VPS (e.g., Fly.io, Railway):* Rejected — requires managing Node.js runtime, scaling, SSL, CDN integration. Too much operational overhead for a solo developer.
- **Consequences:**
  - Positive: Edge SSR (lowest TTFB globally), predictable pricing, built-in CDN and caching, Cloudflare ecosystem benefits (rate limiting, DDoS protection).
  - Negative: OpenNext is a compatibility layer — not all Next.js features may work perfectly. Debugging edge runtime issues is harder than Node.js. 128MB memory limit requires attention to SSR payload sizes.

### ADR-6: GCP Cloud Run Job for Pipeline

- **Status:** Accepted
- **Context:** The pipeline is a batch job running every 6 hours for 10-30 minutes. It needs Python with data science libraries, unrestricted network access to external APIs, and no timeout limits shorter than 30 minutes.
- **Decision:** GCP Cloud Run Job triggered by GCP Cloud Scheduler.
- **Alternatives Considered:**
  - *Cloudflare Workers:* Rejected — V8 runtime can't run Python. 30-second CPU limit is insufficient.
  - *GCP Cloud Run (service, always-on):* Rejected — paying for 24/7 compute when the pipeline runs 4x20min = 80 minutes/day. Cloud Run Job runs to completion and terminates.
  - *GCP Cloud Functions:* Rejected — 9-minute max timeout (gen2) is insufficient for a 20-minute pipeline.
  - *AWS Lambda / Step Functions:* Rejected — mixing AWS and GCP adds billing complexity and cross-cloud latency for Neon access. GCP cohesion principle.
  - *GitHub Actions (scheduled workflow):* Tempting for simplicity. Rejected — 6-hour job frequency means lots of billable minutes. Cloud Run Job is cheaper for recurring compute. Also, GitHub Actions has a 6-hour timeout and unreliable scheduling (can be delayed by minutes-to-hours).
- **Consequences:**
  - Positive: Pay only for execution time (~80 CPU-minutes/day). No cold start concern (pipeline is long-running). Full Python ecosystem available. GCP ecosystem integration (Cloud Scheduler, Cloud Logging, Secret Manager).
  - Negative: Requires Docker containerization. GCP account setup and IAM configuration. Slightly more complex deployment than a simple cron job on a VPS.

### ADR-7: NextAuth.js for Authentication

- **Status:** Accepted
- **Context:** Need Google OAuth with session management. No email/password in v1. Sessions must work on Cloudflare Workers edge runtime.
- **Decision:** NextAuth.js (Auth.js v5) with the Drizzle adapter for Neon Postgres session/account storage.
- **Alternatives Considered:**
  - *Clerk:* Managed auth, excellent DX, drop-in UI components. Rejected — adds $25/mo+ at scale. The auth requirements are simple (Google OAuth only). NextAuth.js is free and sufficient.
  - *Supabase Auth:* Would require Supabase as the database (see ADR-4 for why we chose Neon). Rejected.
  - *Custom OAuth implementation:* Rejected — wheel reinvention. NextAuth.js handles the OAuth flow, token management, session storage, and CSRF protection.
  - *Lucia Auth:* Lightweight, edge-compatible. Viable alternative. Rejected in favor of NextAuth.js due to larger community, more documentation, and official Next.js integration. Would reconsider if NextAuth.js has edge runtime issues.
- **Consequences:**
  - Positive: Battle-tested OAuth flow, Drizzle adapter available, JWT sessions work on edge runtime, handles token refresh automatically.
  - Negative: NextAuth.js v5 (Auth.js) is still maturing — edge runtime support has had historical bugs. Session storage in Postgres adds a query per request (mitigated by JWT strategy — session data in the token, database lookup only on refresh).

### ADR-8: Drizzle ORM for Database Access (Web App)

- **Status:** Accepted
- **Context:** Need a TypeScript ORM/query builder for the Next.js app that works with Neon serverless driver on Cloudflare Workers edge runtime.
- **Decision:** Drizzle ORM with Neon serverless driver (`@neondatabase/serverless`).
- **Alternatives Considered:**
  - *Prisma:* Most popular TypeScript ORM. Rejected — Prisma Client requires a binary engine that doesn't run on Cloudflare Workers edge runtime. Prisma Accelerate (their edge proxy) adds latency and cost.
  - *Kysely:* Lightweight query builder, edge-compatible. Viable alternative. Rejected because Drizzle provides both query builder and schema management (migrations) in one tool, while Kysely requires a separate migration tool.
  - *Raw SQL (pg driver):* Rejected — no type safety, no schema management, error-prone for a solo developer.
- **Consequences:**
  - Positive: Edge-compatible, TypeScript-native, SQL-like syntax (no ORM magic), built-in migration support, works with Neon serverless driver.
  - Negative: Smaller ecosystem than Prisma (fewer guides, fewer community adapters). Schema-first approach requires defining schema in TypeScript (but this is also a benefit for type safety).

### ADR-9: Python Pipeline with psycopg3

- **Status:** Accepted
- **Context:** Pipeline needs to orchestrate LLM API calls, run clustering algorithms, and write results to Neon Postgres. Python is the chosen language (ADR-2).
- **Decision:** Python 3.12 with psycopg3 (async) for database access, httpx for HTTP calls, and scikit-learn for clustering (if using embedding-based approach).
- **Alternatives Considered:**
  - *SQLAlchemy async:* Full ORM with migration support. Rejected — pipeline writes are straightforward bulk inserts and updates. An ORM adds abstraction overhead without benefit. psycopg3 with parameterized queries is sufficient and more transparent.
  - *asyncpg:* Faster than psycopg3 for raw throughput. Rejected — psycopg3 is the official PostgreSQL adapter for Python, has better documentation, and the performance difference is negligible for batch workloads.
- **Consequences:**
  - Positive: Standard Python database adapter, async support for concurrent LLM calls, simple and well-documented.
  - Negative: No ORM means writing SQL manually (acceptable for the limited number of pipeline queries). Schema changes must be manually coordinated with Drizzle migrations in the web app.

### ADR-10: Stripe for Payments

- **Status:** Accepted
- **Context:** Need monthly subscription billing ($9/mo Pro tier) with upgrade, downgrade, and cancellation. PRD specifies Stripe.
- **Decision:** Stripe Checkout (hosted payment page) + Stripe Customer Portal (for subscription management) + Stripe Webhooks (for subscription state sync).
- **Alternatives Considered:**
  - *Lemon Squeezy:* Merchant of record (handles tax, compliance). Attractive for solo developers. Rejected — Stripe has better reliability track record, more extensive documentation, and the PRD explicitly specifies Stripe. Lemon Squeezy could be reconsidered if tax compliance becomes a burden.
  - *Paddle:* Similar to Lemon Squeezy (MoR). Rejected for same reasons.
- **Consequences:**
  - Positive: Industry-standard reliability. Hosted Checkout reduces PCI scope. Customer Portal provides self-service subscription management (no custom UI needed for cancel/downgrade). Webhooks provide real-time subscription state updates.
  - Negative: Stripe is not a merchant of record — zzoo is responsible for tax compliance (sales tax, VAT). May need to add tax calculation later (Stripe Tax or manual).

---

## Appendix: Technology Stack Summary

| Layer | Technology | Version |
|---|---|---|
| **Frontend framework** | Next.js (App Router) | 15+ |
| **Frontend hosting** | Cloudflare Workers (OpenNext) | — |
| **UI components** | shadcn/ui + Radix UI | — |
| **Styling** | Tailwind CSS | 4 |
| **Icons** | Lucide Icons | — |
| **Charts** | Recharts | — |
| **Frontend ORM** | Drizzle ORM | — |
| **Database driver (edge)** | @neondatabase/serverless | — |
| **Auth** | NextAuth.js (Auth.js v5) | — |
| **Database** | Neon PostgreSQL + pgvector | PG 16 |
| **Pipeline runtime** | Python | 3.12 |
| **Pipeline DB driver** | psycopg3 (async) | — |
| **Pipeline HTTP client** | httpx | — |
| **Pipeline clustering** | scikit-learn (HDBSCAN) or LLM-based | — |
| **LLM** | Claude Haiku (Anthropic API) | — |
| **Pipeline hosting** | GCP Cloud Run Job | — |
| **Cron scheduler** | GCP Cloud Scheduler | — |
| **Payments** | Stripe (Checkout + Webhooks) | — |
| **Email** | Resend | — |
| **Analytics** | PostHog (client-side SDK) | — |
| **Error tracking** | Sentry | — |
| **CI/CD** | GitHub Actions | — |
| **IaC** | Pulumi (TypeScript) | — |
| **Secret management** | Cloudflare Wrangler secrets + GCP Secret Manager | — |
