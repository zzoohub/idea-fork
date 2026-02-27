# Infrastructure Overview (Simplified)

## System Summary

idea-fork runs on a serverless, multi-cloud stack. The web frontend is hosted on Vercel and queries the database directly for reads. The API server on GCP Cloud Run handles the daily data pipeline exclusively — scraping external sources, running LLM processing, and writing results to Neon PostgreSQL. A daily cron trigger (GCP Cloud Scheduler) kicks the pipeline off automatically. All compute scales to zero when idle.

---

## Major Components

### 1. Users

Public internet users accessing `idea-fork.zzooapp.com` via browser.

### 2. Web App (Vercel / Next.js)

The Next.js 16 frontend, auto-deployed to Vercel from the `main` branch.

- Serves the full UI via SSR and static generation.
- In production, reads data directly from Neon PostgreSQL using the `@neondatabase/serverless` driver — the API server is bypassed entirely for user-facing reads.
- Enforces security headers (CSP, X-Frame-Options, nosniff) and uploads Sentry source maps at build time.

### 3. API Server (GCP Cloud Run / FastAPI)

A containerized FastAPI service (`idea-fork-api`) deployed to GCP Cloud Run in `us-east4`.

- Scales to zero between pipeline runs.
- Primary responsibility: execute the daily data ingestion and processing pipeline when triggered by Cloud Scheduler via `POST /internal/pipeline/run`.
- Also exposes public REST endpoints (`/v1/*`) consumed by the web app in local development.
- GCP Cloud Scheduler (daily cron at 2:00 PM ET) is treated as part of this group — it is the sole trigger for pipeline execution.

### 4. Database (Neon PostgreSQL)

Managed serverless PostgreSQL (`idea_fork` database, `main` branch) hosted on Neon in `aws-us-east-1`.

- The single persistent data store for all application state.
- Receives writes from the API server (pipeline results) via asyncpg through Neon's built-in PgBouncer pooler.
- Receives reads directly from Vercel (Next.js) via the Neon serverless driver.
- Autoscales from near-zero to 1 CU; scales to zero when idle.

### 5. Data Sources (Reddit + RSS + App Store + Play Store + Product Hunt)

External services polled by the pipeline on each daily run.

| Source | What is collected |
|---|---|
| Reddit API | User complaint posts from ~44 subreddits |
| RSS Feeds | HN top links, TechCrunch articles |
| Product Hunt API | Trending products (GraphQL) |
| App Store | App reviews and listings (20 keyword categories) |
| Google Play | App reviews and listings (same keywords) |
| Google Trends | Search interest and demand signals (pytrends) |

No persistent connection or webhook — the pipeline pulls on each scheduled run.

### 6. AI / ML Services (Google Gemini + HDBSCAN)

LLM and clustering services used within the pipeline to turn raw scraped content into structured product briefs.

- **Google Gemini API** (`gemini-2.5-flash` / `flash-lite`): post tagging, embedding generation, and brief synthesis. Accessed via API key from GCP Cloud Run.
- **HDBSCAN**: local clustering of embeddings, run in-process on Cloud Run (no external service).

### 7. Observability (Sentry + PostHog)

Monitoring and analytics services integrated at the application level, not provisioned by Pulumi.

- **Sentry**: error tracking for both the API server (`SENTRY_ENVIRONMENT=production`) and the web frontend (source maps uploaded at build time).
- **PostHog**: client-side user analytics, loaded in the browser. CSP explicitly allows `us.i.posthog.com`.
- GCP Cloud Logging and Cloud Monitoring are also available automatically for Cloud Run, providing structured request logs, latency metrics, and instance counts.

---

## Data Flow

### User Read Path (production)

```
User (browser)
  |
  v
Web App (Vercel / Next.js)
  |  Direct SQL via @neondatabase/serverless
  v
Database (Neon PostgreSQL)
```

The API server is not involved in serving user reads in production.

### Pipeline Write Path (daily)

```
GCP Cloud Scheduler  --[POST /internal/pipeline/run]--> API Server (GCP Cloud Run)
                                                              |
                              +--------------------------+----+----+---------------+
                              |                          |         |               |
                              v                          v         v               v
                         Reddit API              RSS Feeds    App Store /    Product Hunt
                                                              Google Play
                                                              Google Trends
                              |                          |         |               |
                              +----------+---------------+---------+               |
                                         |                                         |
                                         v                                         v
                              AI / ML Services (Gemini + HDBSCAN) <---------------+
                                         |
                                         v
                              Database (Neon PostgreSQL)
```

---

## Key Boundaries

| Boundary | Description |
|---|---|
| External vs. Internal | Data Sources and AI/ML Services are third-party SaaS APIs — not owned or provisioned. All other components are owned infrastructure. |
| Read path vs. Write path | User reads bypass the API server entirely (Vercel queries Neon directly). The API server exists only to run the pipeline. |
| GCP vs. Vercel vs. Neon | Compute lives on GCP, the database on Neon (AWS-backed), and the frontend on Vercel. No VPC or private networking connects them — all communication is over TLS on the public internet. |
| Scheduled vs. On-demand | The pipeline is batch, not real-time. Cloud Scheduler fires once per day; there is no streaming or event-driven ingestion path. |
| Observability perimeter | Sentry and PostHog are the only components that receive application telemetry from both sides of the read/write split (web and API). |
