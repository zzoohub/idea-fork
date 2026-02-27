# Architecture Overview (Simplified)

## System Summary

idea-fork ("Product Hunt for problems") collects user complaints from Reddit, app stores, and RSS feeds, processes them through a daily LLM pipeline to cluster related complaints and synthesize product briefs, then serves the results to founders and indie hackers through a web interface.

The system has three runtime paths:
- **Read path (production)**: Browser -> Vercel (Next.js SSR) -> Neon PostgreSQL directly
- **Write path**: Browser -> Vercel Server Action -> Neon PostgreSQL directly
- **Pipeline path**: Cloud Scheduler -> FastAPI (Cloud Run) -> External Sources -> Neon PostgreSQL

---

## Major Components

### 1. Users / Browser
End users access the product through a web browser. All interactions are read-heavy (browsing complaints, reading briefs, viewing products), with a single write action (upvoting/downvoting a brief).

- Anonymous users, identified by a `session_id` cookie for rating deduplication
- 6 supported locales (en, es, pt-BR, id, ja, ko)

---

### 2. Web App (Next.js on Vercel)
The user-facing frontend. Deployed to Vercel, auto-deployed on push to `main`.

- **Technology**: Next.js 16, React 19, Tailwind CSS v4, bun
- **Architecture style**: Feature-Sliced Design (FSD) with strict uni-directional imports
- **Rendering**: Server-Side Rendering (SSR) at the edge via Vercel
- **Dual data access**: In production (`DATA_SOURCE=neon`), SSR queries Neon PostgreSQL directly using `@neondatabase/serverless`, bypassing the API server entirely. In local dev, it proxies to FastAPI via HTTP.
- **Writes**: Brief ratings are submitted through Next.js Server Actions that write directly to Neon.
- **Observability**: PostHog client-side analytics (8 typed events: brief views, searches, clicks, filters)

---

### 3. API + Pipeline (FastAPI on Cloud Run)
The backend service. Handles API requests in local development and runs the scheduled data pipeline in production. Deployed as a Docker container on GCP Cloud Run (1 CPU, 1 Gi memory, 0-3 instances).

- **Technology**: FastAPI, Python 3.12, SQLAlchemy async, asyncpg
- **Architecture style**: Hexagonal (ports and adapters) -- domain layer has zero framework dependencies
- **API surface**: REST endpoints under `/v1/*` (posts, briefs, products, tags, ratings) and internal pipeline endpoints under `/internal/*`
- **Pipeline**: Runs inside the same FastAPI process, triggered daily by Cloud Scheduler via `POST /internal/pipeline/run`. Executes five sequential stages: Fetch -> Tag -> Score -> Cluster -> Synthesize
- **Pipeline concurrency**: PostgreSQL advisory lock prevents concurrent runs; tenacity retries with exponential backoff on all external API calls
- **Observability**: Sentry error monitoring

---

### 4. Database (Neon PostgreSQL)
The single source of truth for all persistent state.

- **Technology**: Neon PostgreSQL 18, hosted on AWS us-east-1, autoscaling 0.25-1 CU
- **Schema**: 10 tables -- `post`, `tag`, `post_tag`, `product`, `product_tag`, `product_post`, `brief`, `brief_source`, `cluster`, `cluster_post`, `rating`
- **Access**: Read by both the Web App (via Neon serverless driver) and the API Server (via asyncpg connection pooler). Written by the API Server (pipeline upserts, rating mutations) and the Web App (rating Server Actions).
- **Migrations**: Alembic, managed in `services/api/alembic/`

---

### 5. External Data Sources
The raw material for the pipeline. Polled once per day.

- **Reddit** (public JSON API): User complaints from configured subreddits, 25 posts per subreddit
- **RSS Feeds**: Hacker News (50+ point posts) and TechCrunch articles
- **Apple App Store** (iTunes API): App reviews, searched by keyword, concurrency=3
- **Google Play Store** (google-play-scraper): App reviews, searched by keyword, concurrency=3
- **Product Hunt** (GraphQL API): 30 most recently launched products per run
- **Google Trends** (pytrends): Trend interest data fetched during brief synthesis, keyed to cluster topic keywords

---

### 6. AI Services (Google Gemini + HDBSCAN)
Powers the intelligence layer of the pipeline. All calls are made from within the API + Pipeline component.

- **Google Gemini Flash Lite** (`gemini-2.5-flash-lite`): Tags each post with sentiment, post type (10 categories), and 2-3 topic tags. Labels clusters with a human-readable name and summary.
- **Google Gemini Embeddings** (`gemini-embedding-001`): Generates vector embeddings for tagged posts, processed in batches of 100.
- **HDBSCAN** (local, scikit-learn-compatible): Clusters posts by embedding similarity (min_cluster_size=3, min_samples=2). Runs in-process, no external service call.
- **Google Gemini Flash** (`gemini-2.5-flash`): Synthesizes full product briefs from clustered posts, trends data, and related products. Output includes title, problem statement, opportunity, solution directions, and demand signals.

---

## Data Flow

```
[External Data Sources]
  Reddit, RSS, App Store,
  Play Store, Product Hunt
         |
         | (daily, via Cloud Scheduler)
         v
[API + Pipeline]  ------>  [AI Services]
 FastAPI/Cloud Run          Gemini: tag, embed, label, synthesize
         |                  HDBSCAN: cluster embeddings
         | upsert posts, clusters, briefs
         v
   [Database]
  Neon PostgreSQL
         |
         | (direct SQL, production)
         v
[Web App]  <----------  [Users / Browser]
 Next.js/Vercel             HTTPS (read feed,
         |                   view briefs,
         | SSR HTML           rate briefs)
         v
[Users / Browser]
```

**Pipeline stages in detail (once daily at 14:00 ET):**

1. **Fetch** -- Pull raw posts and products from all 5 external sources in parallel. Upsert to DB, deduplicating by `source + external_id`.
2. **Tag** -- Send pending posts to Gemini Flash Lite in batches of 20. Each post receives `sentiment`, `post_type`, and 2-3 `tag_slugs`.
3. **Score** -- Recalculate `trending_score` and `signal_count` for all products based on tag-matched post activity.
4. **Cluster** -- Embed tagged posts with Gemini Embeddings, cluster with HDBSCAN, label each cluster with Gemini Flash Lite.
5. **Synthesize** -- For each new cluster: fetch Google Trends data and related products, then generate a full product brief with Gemini Flash.

**User read flow (production):**

1. Browser requests a page (e.g., `/en/briefs/ai-meal-planning`).
2. Vercel runs Next.js SSR, which imports `@neondatabase/serverless` and executes parameterized SQL directly against Neon.
3. SSR returns fully-rendered HTML to the browser.
4. Subsequent paginated fetches (infinite scroll) hit Next.js API route handlers that run the same direct Neon SQL path.

**User write flow (ratings):**

1. Browser submits an upvote or downvote.
2. Next.js Server Action executes two SQL statements against Neon: insert into `rating`, then increment `upvote_count` or `downvote_count` on `brief`.

---

## Key Interactions

| From | To | Protocol | Purpose |
|---|---|---|---|
| Cloud Scheduler | API + Pipeline | HTTP POST `/internal/pipeline/run` with `X-Internal-Secret` header | Trigger daily pipeline run |
| API + Pipeline | External Data Sources | HTTP (httpx), GraphQL, scraper | Fetch raw posts and products |
| API + Pipeline | AI Services (Gemini) | Google GenAI SDK (gRPC/HTTP) | Tag posts, generate embeddings, label clusters, synthesize briefs |
| API + Pipeline | Database | asyncpg (PostgreSQL wire protocol) | Upsert pipeline results, read pending work |
| Web App | Database | `@neondatabase/serverless` (HTTP/WebSocket) | Direct SQL reads for SSR in production |
| Web App | Database | `@neondatabase/serverless` (Server Action) | Direct SQL writes for brief ratings |
| Users / Browser | Web App | HTTPS (Vercel Edge) | All user-facing page requests |
| Web App | AI Services | None | No direct connection; AI is used only by the pipeline |
| Web App | PostHog | HTTPS (client-side) | Analytics event tracking |
| API + Pipeline | Sentry | HTTPS | Error monitoring |
