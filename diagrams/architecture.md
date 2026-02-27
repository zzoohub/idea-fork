# Software Architecture

## Overview

idea-fork is a monorepo application described as "Product Hunt for problems." It automatically surfaces real user complaints from Reddit, RSS feeds, Apple App Store, and Google Play Store, clusters them via an LLM pipeline (Google Gemini), and generates actionable product briefs for indie hackers and founders. The system also tracks products from Product Hunt and app stores, linking them to user complaints via shared tags to surface competitive intelligence.

The codebase is organized into three top-level modules:

| Module | Technology | Location |
|---|---|---|
| API Server | FastAPI, Python 3.12, SQLAlchemy, asyncpg | `services/api/` |
| Web Client | Next.js 16, React 19, Tailwind CSS v4, bun | `clients/web/` |
| Infrastructure | Pulumi (TypeScript), GCP, Neon | `infra/` |

**Architecture style**: Single-service API with hexagonal (ports and adapters) internal structure, a scheduled data pipeline running within the same service, and a Next.js frontend that can bypass the API in production by querying Neon PostgreSQL directly.

---

## System Context

```
                         +------------------+
                         |    End Users     |
                         | (Browser/Mobile) |
                         +--------+---------+
                                  |
                      HTTPS (Vercel Edge)
                                  |
                         +--------v---------+
                         |   Next.js Web    |
                         |   (Vercel SSR)   |
                         +--------+---------+
                                  |
              +-------------------+-------------------+
              |                                       |
     Production (DATA_SOURCE=neon)           Local Dev (apiFetch)
              |                                       |
     +--------v---------+               +-------------v-----------+
     |   Neon Postgres   |               |     FastAPI Server     |
     |   (Direct SQL)    |               |   (Cloud Run / local)  |
     +--------+----------+               +-------------+----------+
              |                                        |
              +--------------------+-------------------+
                                   |
                          +--------v---------+
                          |   PostgreSQL     |
                          |   (Neon DB)      |
                          +--------+---------+

  +--------------------------------------------------------------------+
  |                 Scheduled Pipeline (Cloud Scheduler)                |
  |                                                                    |
  |  Reddit --> +                                                      |
  |  RSS -----> | Fetch --> Tag (Gemini) --> Cluster (Embeddings +     |
  |  AppStore -> |           HDBSCAN) --> Synthesize (Gemini) --> DB   |
  |  PlayStore > +                                                     |
  |  PH ------> +  (Products upserted directly)                       |
  +--------------------------------------------------------------------+
```

### External Dependencies

| Service | Purpose | Adapter Location |
|---|---|---|
| Reddit (public JSON API) | Fetch user complaints from subreddits | `/services/api/src/outbound/reddit/client.py` |
| RSS Feeds (Hacker News, TechCrunch) | Fetch tech news posts | `/services/api/src/outbound/rss/client.py` |
| Apple App Store (iTunes API) | Search apps and fetch reviews | `/services/api/src/outbound/appstore/client.py` |
| Google Play Store (scraper) | Search apps and fetch reviews | `/services/api/src/outbound/playstore/client.py` |
| Product Hunt (GraphQL API) | Fetch recently launched products | `/services/api/src/outbound/producthunt/client.py` |
| Google Gemini (GenAI SDK) | Tagging, embedding, clustering labels, brief synthesis | `/services/api/src/outbound/llm/client.py` |
| Google Trends (pytrends) | Trend interest data for brief enrichment | `/services/api/src/outbound/trends/client.py` |
| Neon PostgreSQL | Primary data store | `/services/api/src/outbound/postgres/database.py` |
| PostHog | Product analytics (client-side) | `/clients/web/src/shared/analytics/provider.tsx` |
| Sentry | Error monitoring (API server) | Initialized in `/services/api/src/app/main.py` |

---

## Layers and Services

### API Server -- Hexagonal Architecture

The API follows hexagonal architecture (ports and adapters) with strict dependency rules: the domain layer has zero framework dependencies, and outer layers implement domain-defined Protocol interfaces.

```
+-----------------------------------------------------------------------+
|  app/main.py                                                          |
|  create_app() -- wires DI via lifespan context -> request.state       |
+-----------------------------------------------------------------------+
         |                    |                       |
   +-----v------+    +-------v--------+    +---------v---------+
   |  Inbound    |    |    Domain      |    |    Outbound       |
   |  (HTTP)     |    | (Pure Logic)   |    |  (Adapters)       |
   +-----+------+    +-------+--------+    +---------+---------+
         |                    |                       |
   Routers, DTOs,      Frozen dataclasses,     Postgres repos,
   FastAPI deps,        services, ports         LLM client,
   rate limiting        (Protocol ABCs)         Reddit/RSS/etc.
```

#### Domain Layer

Location: `/services/api/src/domain/`

The domain layer contains pure business logic with no framework dependencies. All models are frozen dataclasses. External dependencies are defined as `Protocol` abstract interfaces (ports).

| Module | Models | Ports | Service | Purpose |
|---|---|---|---|---|
| `domain/tag/` | `Tag` | `TagRepository` | `TagService` | Tag listing, trending tags, product tags |
| `domain/post/` | `Post`, `PostTag`, `PostListParams` | `PostRepository` | `PostService` | Post listing with cursor pagination, detail retrieval |
| `domain/brief/` | `Brief`, `BriefListParams` | `BriefRepository` | `BriefService` | Brief listing, slug-based retrieval |
| `domain/product/` | `Product`, `ProductMetrics`, `ProductWithPosts`, `RelatedBrief`, `ProductListParams` | `ProductRepository` | `ProductService` | Product listing, detail with posts/metrics/related briefs |
| `domain/rating/` | `Rating`, `CreateRatingRequest`, `UpdateRatingRequest` | `RatingRepository` | `RatingService` | Anonymous brief rating (upvote/downvote with feedback) |
| `domain/pipeline/` | `RawPost`, `RawProduct`, `TaggingResult`, `ClusteringResult`, `BriefDraft`, `PipelineRunResult` | `PipelineRepository`, `RedditClient`, `RssClient`, `LlmClient`, `TrendsClient`, `ProductHuntClient`, `AppStoreClient`, `PlayStoreClient` | `PipelineService` | Full data ingestion and processing pipeline |

**Cross-module dependencies** within the domain:
- `rating` depends on `brief` (validates brief existence before rating)
- `product` imports `Post` and `PostTag` from `post` (product detail includes related posts)
- `pipeline` imports `Post` from `post` (pipeline processes posts)

#### Inbound Layer (HTTP)

Location: `/services/api/src/inbound/http/`

All HTTP handling lives here: FastAPI routers, request/response DTOs (Pydantic models), dependency injection helpers, error handlers, and rate limiting.

**Public API routes** (`/v1/*`):

| Router | Prefix | Endpoints | File |
|---|---|---|---|
| Tags | `/v1/tags` | `GET /`, `GET /trending`, `GET /by-products` | `inbound/http/tag/router.py` |
| Posts | `/v1/posts` | `GET /`, `GET /{post_id}` | `inbound/http/post/router.py` |
| Briefs | `/v1/briefs` | `GET /`, `GET /{slug}` | `inbound/http/brief/router.py` |
| Products | `/v1/products` | `GET /`, `GET /{slug}` | `inbound/http/product/router.py` |
| Ratings | `/v1/briefs/{brief_id}/ratings` | `POST /`, `PATCH /` | `inbound/http/rating/router.py` |

**Internal API routes** (`/internal/*`):

| Router | Prefix | Endpoints | File |
|---|---|---|---|
| Pipeline | `/internal/pipeline` | `GET /status`, `GET /pending`, `POST /run` | `inbound/http/pipeline/router.py` |

**Cross-cutting HTTP concerns**:

- **Response envelope** (`inbound/http/response.py`): All responses wrapped as `{"data": ..., "meta": {...}}`. Meta includes `has_next` and `next_cursor` for paginated endpoints.
- **Cache-Control** (`inbound/http/response.py`): Collections 60s, detail 300s, static 3600s, mutations no-store.
- **Error handling** (`inbound/http/errors.py`): RFC 9457 `application/problem+json` format. Validation errors (422) include `errors` array with `{field, code, message}`.
- **Rate limiting** (`inbound/http/limiter.py`): `slowapi` keyed on `session_id` cookie or IP fallback. Applied to rating endpoints (10/minute).
- **Pipeline auth**: `X-Internal-Secret` header with HMAC constant-time comparison.

#### Outbound Layer (Adapters)

Location: `/services/api/src/outbound/`

Each adapter implements a domain port Protocol:

| Adapter | Domain Port | Technology | Key Details |
|---|---|---|---|
| `postgres/post_repository.py` | `PostRepository` | SQLAlchemy async + asyncpg | Cursor pagination, tag eager loading via `selectin` |
| `postgres/brief_repository.py` | `BriefRepository` | SQLAlchemy async + asyncpg | Slug-based lookup, published status filter |
| `postgres/product_repository.py` | `ProductRepository` | SQLAlchemy async + asyncpg | Tag-based post/brief joining, metrics aggregation |
| `postgres/rating_repository.py` | `RatingRepository` | SQLAlchemy async + asyncpg | Duplicate detection, denormalized vote counters |
| `postgres/tag_repository.py` | `TagRepository` | SQLAlchemy async + asyncpg | Trending tag query (by post volume in N days) |
| `postgres/pipeline_repository.py` | `PipelineRepository` | SQLAlchemy async + asyncpg | Advisory locks, upserts, cluster management |
| `llm/client.py` | `LlmClient` | Google GenAI SDK (`google-genai`) | Gemini Flash for tagging/clustering, Gemini Flash for synthesis. Embeddings via `gemini-embedding-001`. Retry with tenacity (3 attempts, exponential backoff). |
| `reddit/client.py` | `RedditClient` | httpx | Public JSON API, 2s sleep between subreddits, retry with tenacity |
| `rss/client.py` | `RssClient` | httpx + feedparser | SSRF protection (blocks private IPs/loopback), 20 entries per feed |
| `appstore/client.py` | `AppStoreClient` | httpx | iTunes Search + RSS review APIs, retry with tenacity |
| `playstore/client.py` | `PlayStoreClient` | google-play-scraper | Thread-delegated synchronous scraper, 0.5-1s throttling |
| `producthunt/client.py` | `ProductHuntClient` | httpx | GraphQL API, Bearer token auth, retry with tenacity |
| `trends/client.py` | `TrendsClient` | pytrends (thread-delegated) | Self-rate-limited (5s min interval), interest over 3 months |

**ORM models** (`outbound/postgres/models.py`): SQLAlchemy declarative models mapping to 10 database tables:
- `tag`, `post`, `post_tag` (M:N)
- `product`, `product_tag` (M:N), `product_post` (M:N)
- `brief`, `brief_source` (M:N with post)
- `cluster`, `cluster_post` (M:N with post)
- `rating`

**Domain mapper** (`outbound/postgres/mapper.py`): Pure functions converting ORM row objects to frozen domain dataclasses. Strict boundary -- no ORM objects leak into the domain.

#### App Wiring

Location: `/services/api/src/app/main.py`

`create_app()` is the composition root:
1. Reads settings from environment (pydantic-settings)
2. Creates `Database` (SQLAlchemy async engine, pool_size=10)
3. Instantiates all repository adapters and external client adapters
4. Constructs domain services, injecting adapters via constructor
5. Passes services into FastAPI lifespan context, exposing them via `request.state`
6. Registers routers, middleware (CORS), and exception handlers
7. Optionally initializes Sentry (production only)

**Configuration** (`shared/config.py`): `pydantic_settings.BaseSettings` with environment variables. Key settings include subreddit list, RSS feeds, LLM model names, App Store keywords, and pipeline fetch limits. Subreddit names are validated with regex.

---

### Web Client -- Feature-Sliced Design

The web client follows Feature-Sliced Design (FSD) with strict uni-directional import rules.

```
  app/            (Next.js App Router -- pages, layouts, route handlers)
    |
  views/          (Page-level components -- one per route)
    |
  widgets/        (Composed UI blocks -- navigation bar)
    |
  features/       (User interactions -- filter, rating, search, locale-switcher)
    |
  entities/       (Domain models -- post, brief, product, tag)
    |
  shared/         (Utilities, UI primitives, API client, DB queries, i18n, analytics)
```

**Import rule**: Each layer may only import from layers below it. Never import upward.

#### App Layer

Location: `/clients/web/app/`

Next.js 16 App Router with i18n path segments:

| Route | Page Component |
|---|---|
| `/[locale]` | Feed (post listing) |
| `/[locale]/briefs` | Briefs listing |
| `/[locale]/briefs/[slug]` | Brief detail |
| `/[locale]/products` | Products listing |
| `/[locale]/products/[slug]` | Product detail |
| `/[locale]/search` | Cross-entity search results |

**API route handlers** (`app/api/v1/`): Local development proxy that mirrors the FastAPI API shape. In production with `DATA_SOURCE=neon`, these are unused -- the frontend SSR queries Neon directly.

| Route Handler | Mirrors |
|---|---|
| `GET /api/v1/posts`, `GET /api/v1/posts/[id]` | FastAPI post endpoints |
| `GET /api/v1/briefs`, `GET /api/v1/briefs/[id]` | FastAPI brief endpoints |
| `GET /api/v1/products`, `GET /api/v1/products/[slug]` | FastAPI product endpoints |
| `POST /api/v1/briefs/[id]/ratings` | FastAPI rating endpoint |
| `GET /api/v1/tags/trending`, `GET /api/v1/tags/by-products` | FastAPI tag endpoints |
| `GET /api/v1/search` | Cross-entity search |

#### Views Layer

Location: `/clients/web/src/views/`

| View | File | Description |
|---|---|---|
| Feed | `views/feed/ui/feed-page.tsx` | Post feed with filtering (tag, source, sentiment, post_type), sorting, infinite scroll |
| Briefs listing | `views/briefs-listing/ui/briefs-listing-page.tsx` | Brief cards with sorting |
| Brief detail | `views/brief-detail/ui/brief-detail-page.tsx` | Full brief with source citations, demand signals, solution directions, rating |
| Products listing | `views/products-listing/ui/products-listing-page.tsx` | Product cards with category/period filtering |
| Product detail | `views/product-detail/ui/product-detail-page.tsx` | Product with signal posts, metrics, related briefs |
| Search results | `views/search-results/ui/search-results-page.tsx` | Cross-entity search (posts, briefs, products) |

#### Features Layer

Location: `/clients/web/src/features/`

| Feature | Files | Description |
|---|---|---|
| Filter | `features/filter/ui/filter-chip-bar.tsx` | Tag/type filter chips for feed |
| Rating | `features/rating/ui/brief-rating.tsx`, `features/rating/actions/rate-brief.ts` | Anonymous upvote/downvote with Server Actions |
| Search | `features/search/ui/search-overlay.tsx` | Search overlay with instant results |
| Locale Switcher | `features/locale-switcher/ui/locale-switcher.tsx` | Language dropdown (6 locales) |

#### Entities Layer

Location: `/clients/web/src/entities/`

| Entity | API | UI Components |
|---|---|---|
| Post | `entities/post/api/index.ts` | `post-card.tsx`, `post-snippet.tsx` |
| Brief | `entities/brief/api/index.ts` | `brief-card.tsx`, `brief-body.tsx`, `citation-ref.tsx`, `demand-signals.tsx`, `heat-badge.tsx` |
| Product | `entities/product/api/index.ts` | `product-card.tsx`, `product-header.tsx`, `signal-summary.tsx` |
| Tag | `entities/tag/api/index.ts` | (consumed via shared UI) |

#### Shared Layer

Location: `/clients/web/src/shared/`

| Module | Purpose | Key Files |
|---|---|---|
| `shared/api/` | API client (`apiFetch()`), TypeScript types, error handling | `client.ts`, `types.ts`, `errors.ts` |
| `shared/db/` | Direct Neon SQL queries (production) | `client.ts`, `queries/posts.ts`, `queries/briefs.ts`, `queries/products.ts`, `queries/ratings.ts`, `queries/tags.ts`, `queries/search.ts`, `pagination.ts` |
| `shared/ui/` | Design system primitives | `button.tsx`, `card.tsx`, `badge.tsx`, `chip.tsx`, `skeleton.tsx`, `search-input.tsx`, `rating-buttons.tsx`, `sort-dropdown.tsx`, `tab-bar.tsx`, etc. |
| `shared/i18n/` | Internationalization (next-intl) | `config.ts` (6 locales), `navigation.ts` (custom Link/redirect/useRouter), `routing.ts`, `request.ts` |
| `shared/analytics/` | PostHog integration | `provider.tsx`, `events.ts` (8 typed track functions) |
| `shared/lib/` | Utility functions | `format-relative-time.ts`, `sanitize-url.ts`, `compute-heat-level.ts`, `extract-subreddits.ts`, `format-time-range.ts`, `extract-demand-signals.ts`, `format-source.ts`, `use-infinite-scroll.ts` |
| `shared/lib/gsap/` | Animation hooks | `register.ts`, `presets.ts`, `use-scroll-reveal.ts`, `use-stagger-reveal.ts`, `use-card-hover.ts`, `use-reduced-motion.ts` |
| `shared/config/` | Environment config | `env.ts` (`API_URL` from `NEXT_PUBLIC_API_URL`) |

#### Dual Data Access Pattern

The most distinctive architectural pattern in the web client. Each entity API file (`entities/*/api/index.ts`) implements a runtime switch:

```typescript
// entities/post/api/index.ts (representative pattern)
const useDirectDB = process.env.DATA_SOURCE === "neon";

export async function fetchPosts(params?) {
  if (useDirectDB) {
    // Production: query Neon directly from Next.js SSR
    const { queryPosts } = await import("@/src/shared/db/queries/posts");
    return queryPosts(params);
  }
  // Local dev: proxy to FastAPI via HTTP
  return apiFetch<Post[]>(`/posts${qs ? `?${qs}` : ""}`);
}
```

**Production path** (`DATA_SOURCE=neon`): Next.js SSR imports `@neondatabase/serverless` and executes parameterized SQL directly against Neon. This eliminates the API server from the read path entirely, reducing latency and infrastructure cost.

**Local development path** (default): Next.js SSR calls the FastAPI API via `apiFetch()`, which routes through Next.js API route handlers (`app/api/v1/`) that proxy to `http://localhost:8080/v1`.

**Writes** (ratings) always go through Server Actions (`features/rating/actions/rate-brief.ts`) which execute SQL directly against Neon, including denormalized counter updates.

---

### Data Pipeline

The pipeline is not a separate service. It runs within the same FastAPI process, triggered by a Cloud Scheduler cron job that POSTs to `/internal/pipeline/run` with an `X-Internal-Secret` header.

Location: `/services/api/src/domain/pipeline/service.py`

#### Pipeline Stages

The pipeline executes five sequential stages, with parallelism within each stage:

**Stage 1 -- Fetch** (parallel data sources):
- Reddit: fetches newest posts from configured subreddits (25 per subreddit, 2s sleep between). Source: `outbound/reddit/client.py`.
- RSS: fetches from Hacker News (50+ point) and TechCrunch feeds. Source: `outbound/rss/client.py`.
- App Store: searches apps by keywords, then fetches reviews (semaphore concurrency=3). Source: `outbound/appstore/client.py`.
- Play Store: searches apps by keywords, then fetches reviews (semaphore concurrency=3). Source: `outbound/playstore/client.py`.
- Product Hunt: fetches 30 most recent products via GraphQL. Source: `outbound/producthunt/client.py`.
- All raw posts and products are upserted into PostgreSQL (deduplication by `source + external_id`).

**Stage 2 -- Tag** (batched, sequential):
- Fetches posts with `tagging_status = 'pending'`.
- Sends batches of 20 posts to Gemini Flash Lite.
- Each post receives: `sentiment` (positive/negative/neutral/mixed), `post_type` (10 categories), and 2-3 topic `tag_slugs`.
- LLM is prompted with existing tag slugs to maximize tag reuse.
- Failed batches are marked `tagging_status = 'failed'`.

**Stage 3 -- Score Products**:
- Recalculates `trending_score` and `signal_count` for all products based on tag-matched post activity.

**Stage 4 -- Cluster** (batched):
- Fetches tagged posts without cluster assignment.
- Generates embeddings via `gemini-embedding-001` (batches of 100).
- Runs HDBSCAN (min_cluster_size=3, min_samples=2) on embeddings.
- Labels each cluster via Gemini Flash Lite (extracts label, summary, and trend keywords).
- Noise posts assigned to "Miscellaneous" cluster.

**Stage 5 -- Brief Synthesis** (parallel, semaphore concurrency=3):
- Fetches clusters without briefs.
- For each cluster, fetches Google Trends data and related products in parallel.
- Sends cluster posts, trends data, and competitive products to Gemini Flash.
- Output: `BriefDraft` with title, slug, summary, problem_statement, opportunity, solution_directions, demand_signals, source_snapshots.
- Safety-filtered clusters are archived (not retried).

#### Concurrency Control

- **Advisory lock**: Pipeline acquires a PostgreSQL advisory lock before running. If another instance is already running, it exits immediately. Source: `PipelineRepository.acquire_advisory_lock()`.
- **Semaphores**: Review fetching (concurrency=3), brief generation (concurrency=3), cluster labeling (concurrency=3).
- **Retry**: All external API calls use tenacity with exponential backoff (3 attempts, 2-30s wait).

#### Post Type Taxonomy

10 categories defined in `/services/api/src/domain/post/models.py`:

| Actionable (7) | Non-actionable (3) |
|---|---|
| `need`, `complaint`, `feature_request`, `alternative_seeking`, `comparison`, `question`, `review` | `showcase`, `discussion`, `other` |

---

## Data Flow

### Flow 1: Pipeline Ingestion (Scheduled)

```
Cloud Scheduler (cron: "0 14 * * *" ET)
    |
    | POST /internal/pipeline/run
    | Header: X-Internal-Secret
    |
    v
FastAPI (Cloud Run)
    |
    +-- Fetch Stage (parallel) ---------------------------------+
    |     Reddit API ---> RawPost[]                             |
    |     RSS Feeds  ---> RawPost[]                             |
    |     App Store  ---> RawProduct[] + RawPost[] (reviews)    |
    |     Play Store ---> RawProduct[] + RawPost[] (reviews)    |
    |     Product Hunt -> RawProduct[]                          |
    |                                                           |
    |     Upsert all to PostgreSQL (dedup by source+external_id)|
    +-----------------------------------------------------------+
    |
    +-- Tag Stage (sequential batches of 20) ---+
    |     Pending posts --> Gemini Flash Lite    |
    |     Result: sentiment, post_type, tags     |
    |     Save to post + post_tag tables         |
    +-------------------------------------------+
    |
    +-- Score Stage -------------------------+
    |     Recalculate product trending_score |
    +----------------------------------------+
    |
    +-- Cluster Stage (batches of 200) ---------+
    |     Tagged posts --> Gemini Embeddings     |
    |     Embeddings --> HDBSCAN                 |
    |     Clusters --> Gemini Flash Lite labels  |
    |     Save to cluster + cluster_post tables  |
    +-------------------------------------------+
    |
    +-- Brief Stage (parallel, concurrency=3) --------+
    |     Per cluster:                                  |
    |       Google Trends (trend keywords)  \           |
    |       Related Products (DB lookup)    / parallel  |
    |       --> Gemini Flash (synthesis)                |
    |       --> Save brief + brief_source              |
    +--------------------------------------------------+
    |
    v
HTTP 200 (all OK) or 207 (partial errors)
Response: PipelineRunResult JSON
```

### Flow 2: User Reads Feed (Production)

```
Browser
    |
    | GET /en (or /es, /pt-BR, /id, /ja, /ko)
    |
    v
Vercel Edge (Next.js SSR)
    |
    | DATA_SOURCE=neon
    | Import: @neondatabase/serverless
    |
    +-- entities/post/api/index.ts::fetchPosts() --+
    |     import shared/db/queries/posts.ts         |
    |                                               |
    |     SQL: SELECT p.* FROM post p               |
    |           WHERE p.deleted_at IS NULL           |
    |           [+ tag/source/sentiment filters]     |
    |           ORDER BY ... DESC, p.id DESC         |
    |           LIMIT 21  (limit+1 for has_next)     |
    |                                               |
    |     SQL: SELECT pt.post_id, tg.slug, tg.name  |
    |           FROM post_tag pt JOIN tag tg ...      |
    |           WHERE pt.post_id = ANY($1)            |
    +-----------------------------------------------+
    |
    | Also fetches tags for filter chips:
    +-- entities/tag/api/index.ts ---------+
    |     SQL: trending tags, product tags  |
    +--------------------------------------+
    |
    v
SSR HTML Response (with hydration data)
    |
    v
Browser renders feed-page.tsx
    |
    | Infinite scroll triggers client fetch
    | (cursor-based pagination)
    |
    v
Next.js API route (/api/v1/posts?cursor=...)
    |
    v
Same Neon SQL path
```

### Flow 3: User Reads Brief Detail (Production)

```
Browser
    |
    | GET /en/briefs/ai-powered-meal-planning-frustrations
    |
    v
Vercel Edge (Next.js SSR)
    |
    +-- entities/brief/api/index.ts::fetchBrief(slug) --+
    |     import shared/db/queries/briefs.ts              |
    |                                                     |
    |     SQL: SELECT id, slug, title, summary,           |
    |           problem_statement, opportunity,             |
    |           solution_directions, demand_signals,        |
    |           source_snapshots, source_count,             |
    |           upvote_count, downvote_count                |
    |           FROM brief                                  |
    |           WHERE slug = $1 AND status = 'published'    |
    +-----------------------------------------------------+
    |
    v
SSR HTML (brief-detail-page.tsx)
    |
    | Contains: BriefBody, DemandSignals, CitationRef,
    |           source posts, HeatBadge, BriefRating
    |
    | PostHog: trackBriefViewed event
    |
    v
User clicks upvote/downvote
    |
    v
Server Action: features/rating/actions/rate-brief.ts
    |
    +-- shared/db/queries/ratings.ts::mutateCreateRating() --+
    |     SQL: INSERT INTO rating (...) VALUES (...)           |
    |     SQL: UPDATE brief SET upvote_count = upvote_count+1  |
    +----------------------------------------------------------+
    |
    v
Optimistic UI update (client)
```

### Flow 4: User Views Product Detail (Production)

```
Browser
    |
    | GET /en/products/some-product-slug
    |
    v
Vercel Edge (Next.js SSR)
    |
    +-- entities/product/api/index.ts::fetchProduct(slug) ------+
    |                                                            |
    |  1. SQL: SELECT ... FROM product WHERE slug = $1           |
    |                                                            |
    |  2. SQL: SELECT array_agg(DISTINCT source) FROM product    |
    |          WHERE lower(name) = lower($1)                     |
    |     (Multi-source aggregation: producthunt, app_store,     |
    |      play_store may list same product)                     |
    |                                                            |
    |  3. SQL: SELECT tg.* FROM product_tag pt JOIN tag tg ...   |
    |                                                            |
    |  4. SQL: SELECT DISTINCT p.* FROM post p                   |
    |          JOIN post_tag ptag ON ptag.post_id = p.id         |
    |          JOIN product_tag prtag ON prtag.tag_id = ptag.tag_id |
    |          WHERE prtag.product_id = $1                       |
    |     (Signal posts: user complaints matching product tags)  |
    |                                                            |
    |  5. SQL: SELECT COUNT(*), COUNT(*) FILTER (sentiment=...)  |
    |     (Sentiment metrics: total, negative, positive)         |
    |                                                            |
    |  6. SQL: SELECT b.* FROM brief b                           |
    |          JOIN brief_source bs ON bs.brief_id = b.id        |
    |          JOIN product_post pp ON pp.post_id = bs.post_id   |
    |          WHERE pp.product_id = $1                          |
    |     (Related briefs: briefs whose source posts overlap)    |
    +-----------------------------------------------------------+
    |
    v
SSR HTML (product-detail-page.tsx)
    |
    | Contains: ProductHeader, SignalSummary,
    |           related post cards, related brief links
    |
    | PostHog: trackProductViewed event
```

---

## API Contracts

### Response Envelope

All API responses follow a consistent envelope format:

```json
{
  "data": <T>,
  "meta": {
    "has_next": boolean,
    "next_cursor": "base64-encoded-cursor" | null
  }
}
```

Source: `/services/api/src/inbound/http/response.py`

### Error Format (RFC 9457)

```json
{
  "type": "https://api.idea-fork.com/errors/{error-type}",
  "title": "Human-Readable Title",
  "status": 404,
  "detail": "Specific error message."
}
```

Validation errors (422) extend with:
```json
{
  "errors": [
    { "field": "name", "code": "missing", "message": "Field required." }
  ]
}
```

Source: `/services/api/src/inbound/http/errors.py`

### Cursor Pagination

Cursors are base64url-encoded JSON with `{v: <sort_value>, id: <row_id>}`. Keyset pagination ensures consistent ordering without offset drift. Maximum cursor size: 2048 bytes.

Source: `/services/api/src/shared/pagination.py`

### Endpoint Summary

| Method | Path | Auth | Rate Limit | Cache | Description |
|---|---|---|---|---|---|
| `GET` | `/v1/tags` | None | None | 3600s | All tags |
| `GET` | `/v1/tags/trending` | None | None | 60s | Trending tags (by post volume) |
| `GET` | `/v1/tags/by-products` | None | None | 60s | Tags associated with products |
| `GET` | `/v1/posts` | None | None | 60s | Post feed (filterable, paginated) |
| `GET` | `/v1/posts/{id}` | None | None | 300s | Single post detail |
| `GET` | `/v1/briefs` | None | None | 60s | Brief listing (paginated) |
| `GET` | `/v1/briefs/{slug}` | None | None | 300s | Brief detail |
| `GET` | `/v1/products` | None | None | 60s | Product listing (paginated) |
| `GET` | `/v1/products/{slug}` | None | None | 300s | Product detail with posts, metrics, related briefs |
| `POST` | `/v1/briefs/{id}/ratings` | session_id cookie | 10/min | no-store | Create rating |
| `PATCH` | `/v1/briefs/{id}/ratings` | session_id cookie | 10/min | no-store | Update rating |
| `GET` | `/internal/pipeline/status` | None | None | None | Pipeline lock status |
| `GET` | `/internal/pipeline/pending` | None | None | None | Pending counts by stage |
| `POST` | `/internal/pipeline/run` | X-Internal-Secret | None | None | Trigger pipeline run |
| `GET` | `/health` | None | None | None | Health check |

### TypeScript Type Contracts

The web client defines matching TypeScript interfaces in `/clients/web/src/shared/api/types.ts`:

- `ApiResponse<T>` -- matches API envelope
- `Post`, `PostTag` -- matches domain Post
- `BriefListItem`, `BriefDetail` -- matches domain Brief (list vs. detail projections)
- `ProductListItem`, `ProductDetail`, `ProductPost`, `ProductMetrics`, `RelatedBrief` -- matches domain Product
- `Tag` -- matches domain Tag
- `Rating` -- matches domain Rating

### Analytics Events

8 typed PostHog events defined in `/clients/web/src/shared/analytics/events.ts`:

| Event | Properties |
|---|---|
| `brief_viewed` | `brief_id`, `brief_title`, `source_post_count` |
| `brief_source_clicked` | `brief_id`, `post_id`, `platform`, `source_position` |
| `feed_post_clicked` | `post_id`, `platform`, `post_position` |
| `product_viewed` | `product_id`, `product_name` |
| `product_signal_clicked` | `product_id`, `post_id`, `platform` |
| `search_performed` | `query` (truncated 200 chars), `results_count` |
| `search_result_clicked` | `query`, `result_type`, `result_position` |
| `feed_filtered` | `filter_type`, `filter_value` |

---

## Deployment Mapping

### Production Environment

```
+-------------------+      +-------------------------+      +------------------+
|   Vercel           |      |   GCP (us-east4)        |      |   Neon            |
|                   |      |                         |      |   (aws-us-east-1) |
|  Next.js SSR      |--+-->|  Cloud Run v2           |----->|  PostgreSQL 18    |
|  (auto-deploy     |  |   |  "idea-fork-api"        |      |  "idea_fork" db   |
|   on push to main)|  |   |  CPU: 1, Mem: 1Gi       |      |  0.25-1 CU        |
|                   |  |   |  Min: 0, Max: 3          |      |  (autoscale)      |
|  DATA_SOURCE=neon |--)-->|  Port: 8080              |      |                  |
|  (direct SQL)     |  |   |  Health: /health         |      +------------------+
+-------------------+  |   |                         |
                       |   |  Cloud Scheduler         |
                       |   |  "idea-fork-pipeline"    |
                       |   |  Cron: 0 14 * * * ET     |
                       |   |  POST /internal/pipeline/run
                       |   |  Deadline: 600s           |
                       |   |  Retry: 1 (60s backoff)   |
                       |   |                         |
                       |   |  Artifact Registry       |
                       |   |  "idea-fork" (Docker)    |
                       |   |  Keep: 10 recent images   |
                       |   +-------------------------+
                       |
                       |   +-------------------------+
                       +-->|  PostHog (us.posthog.com)|
                           |  Client-side analytics   |
                           +-------------------------+
                           +-------------------------+
                           |  Sentry                  |
                           |  Server-side errors      |
                           +-------------------------+
```

### Infrastructure as Code

Location: `/infra/`

Pulumi (TypeScript) manages three component resources:

| Component | File | Resources Created |
|---|---|---|
| `NeonDatabase` | `infra/components/neon-database.ts` | Neon project (PG 18, main branch, autoscaling 0.25-1 CU, 6h history retention) |
| `ApiService` | `infra/components/api-service.ts` | GCP APIs (run, artifactregistry), Artifact Registry repo, Docker image (linux/amd64), Service Account, Cloud Run v2 service (with startup/liveness probes), IAM (allUsers invoker) |
| `PipelineCron` | `infra/components/pipeline-cron.ts` | GCP Cloud Scheduler API, Cloud Scheduler job (HTTP POST target, 600s deadline, 1 retry) |

Configuration values in `infra/config.ts`:
- GCP region: `us-east4`
- Neon region: `aws-us-east-1`
- Cloud Run: 1 CPU, 1Gi memory, 0-3 instances
- Pipeline schedule: daily at 14:00 ET
- CORS origins: `https://idea-fork.zzooapp.com`

### Service-to-Infrastructure Mapping

| Software Component | Infrastructure Target |
|---|---|
| FastAPI server (`services/api/`) | GCP Cloud Run v2, Docker container from Artifact Registry |
| Pipeline (`domain/pipeline/service.py`) | Same Cloud Run instance, triggered by Cloud Scheduler |
| Web client (`clients/web/`) | Vercel (auto-deploy from main, preview from PRs) |
| Database | Neon PostgreSQL (pooled connection via `connectionUriPooler`) |
| Web direct DB access | Neon serverless driver (`@neondatabase/serverless`) |

### Environment Configuration

| Variable | API Server | Web Client (Vercel) |
|---|---|---|
| `API_DATABASE_URL` | `postgresql+asyncpg://...` (Neon pooler) | N/A |
| `DATABASE_URL` | N/A | `postgres://...` (Neon direct) |
| `DATA_SOURCE` | N/A | `neon` (production) |
| `GOOGLE_API_KEY` | Gemini API key | N/A |
| `API_INTERNAL_SECRET` | Pipeline auth secret | N/A |
| `SENTRY_DSN` | Error monitoring | N/A |
| `NEXT_PUBLIC_POSTHOG_KEY` | N/A | PostHog project key |
| `NEXT_PUBLIC_API_URL` | N/A | `http://localhost:8080/v1` (dev only) |

---

## Technical Debt and Architectural Notes

### Identified Debt

1. **No dedicated worker service**: The pipeline runs inside the API server process on Cloud Run. A long-running pipeline (up to 600s deadline) occupies a Cloud Run instance that could otherwise serve API requests. The `services/worker` directory exists as a placeholder but is not implemented.

2. **Dual data access maintenance burden**: Every query change must be synchronized in two places -- the Python SQLAlchemy repository (`services/api/src/outbound/postgres/`) and the TypeScript Neon SQL queries (`clients/web/src/shared/db/queries/`). The two implementations can drift, especially for complex queries like product detail (6 separate SQL queries in the TypeScript version).

3. **No transactional writes in web client**: Neon serverless driver does not support multi-statement transactions. Rating creation and brief counter updates are separate queries (`shared/db/queries/ratings.ts`), making counters eventually consistent. A failed counter update leaves the system in an inconsistent state.

4. **Missing full-text search index declaration**: The web client uses `to_tsvector`/`plainto_tsquery` for post search (`shared/db/queries/posts.ts`), but the index is not visible in the SQLAlchemy ORM models. It likely exists as a raw migration but is not documented alongside the model.

5. **Product deduplication by name**: Products from multiple sources (Product Hunt, App Store, Play Store) are deduplicated using `DISTINCT ON (lower(name))` in queries. This heuristic can merge unrelated products that share a common name.

6. **No mobile client**: `clients/mobile` (Expo) is listed as TODO in the project overview. The API is ready to serve it, but no implementation exists.

7. **Cloud Run public access**: The API service has `allUsers` invoker IAM binding, meaning the `/internal/pipeline/*` endpoints are only protected by the `X-Internal-Secret` header, not by network-level restrictions.

8. **Admin router gated by debug flag**: The admin router (`inbound/http/admin/router.py`) is only loaded when `API_DEBUG=true`. It is not available in production, limiting operational capabilities.

### Architectural Strengths

1. **Clean hexagonal boundaries**: Domain layer is genuinely framework-free. All external dependencies are behind Protocol interfaces with explicit mapper functions at the boundary.

2. **Comprehensive pipeline error handling**: Each pipeline stage catches exceptions independently, logs them, and continues to the next stage. Partial failures are reported as HTTP 207 with detailed error lists.

3. **Advisory lock for pipeline**: Prevents concurrent pipeline runs, critical for idempotent data processing.

4. **Cursor-based pagination**: Keyset pagination throughout (both Python and TypeScript implementations) ensures consistent performance regardless of offset depth.

5. **LLM safety handling**: Gemini safety filter responses are explicitly detected and handled (clusters archived, not retried), preventing infinite retry loops.

6. **Strict FSD layering**: The web client's Feature-Sliced Design enforces clear boundaries between UI concerns, domain entities, and shared infrastructure.
