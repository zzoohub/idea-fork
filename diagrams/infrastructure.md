# Infrastructure Components

## Overview

idea-fork runs on a multi-cloud stack: **GCP** (compute + scheduling), **Neon** (managed PostgreSQL), and **Vercel** (frontend hosting). All infrastructure is defined as code using **Pulumi (TypeScript)** in the `infra/` directory. The deployment model is serverless-first: Cloud Run scales to zero, Neon scales to zero, and the pipeline runs on a daily cron schedule. The system serves a single production environment in the US East region with no staging environment.

**IaC tool:** Pulumi 3.x (Node.js runtime)
**Pulumi providers:** `@pulumi/gcp` ^8.0.0, `@pulumi/docker-build` ^0.0.8, `@pulumi/neon` (local SDK from `kislerdm/neon` Terraform provider v1.1.0)
**Source files:** `infra/index.ts` (entrypoint), `infra/config.ts` (configuration), `infra/components/*.ts` (resource modules)

---

## Components

### Compute

#### GCP Cloud Run v2 Service: `idea-fork-api`

The primary compute resource. Runs the FastAPI backend as a containerized service.

| Property | Value | Source |
|---|---|---|
| Service name | `idea-fork-api` | `infra/components/api-service.ts:100` |
| Region | `us-east4` (configurable, default) | `infra/config.ts:7` |
| CPU | `1` vCPU (configurable, default) | `infra/config.ts:10` |
| Memory | `1Gi` (configurable, default) | `infra/config.ts:11` |
| Min instances | `0` (scales to zero, configurable) | `infra/config.ts:12-13` |
| Max instances | `3` (configurable, default) | `infra/config.ts:14-15` |
| Ingress | `INGRESS_TRAFFIC_ALL` (public) | `infra/components/api-service.ts:103` |
| Container port | `8080` | `infra/components/api-service.ts:119` |
| Deletion protection | `false` | `infra/components/api-service.ts:102` |
| Platform | `linux/amd64` | `infra/components/api-service.ts:80` |

**Health checks:**

| Probe | Path | Initial delay | Period | Failure threshold | Source |
|---|---|---|---|---|---|
| Startup | `/health` | 5s | 5s | 6 failures | `infra/components/api-service.ts:148-153` |
| Liveness | `/health` | -- | 30s | -- (default) | `infra/components/api-service.ts:154-157` |

**Service account:** `idea-fork-api` (dedicated SA, `infra/components/api-service.ts:87-94`)

**Container image:** Built from `services/api/Dockerfile` using Pulumi's `@pulumi/docker-build` provider. Multi-stage build: Python 3.12-slim base, `uv` for dependency management, runs `uvicorn` with 1 worker. Image is pushed to Artifact Registry on every `pulumi up`.

**Environment variables injected at deploy time:**

| Variable | Value source | Source |
|---|---|---|
| `API_DATABASE_URL` | Neon asyncpg connection URI (from `db.asyncpgUri`) | `infra/components/api-service.ts:121` |
| `GOOGLE_API_KEY` | Pulumi secret | `infra/components/api-service.ts:122` |
| `API_INTERNAL_SECRET` | Pulumi secret | `infra/components/api-service.ts:123` |
| `SENTRY_DSN` | Pulumi secret (optional) | `infra/components/api-service.ts:124` |
| `SENTRY_ENVIRONMENT` | Hardcoded `"production"` | `infra/components/api-service.ts:125` |
| `API_CORS_ALLOWED_ORIGINS` | Config (default: `https://idea-fork.zzooapp.com`) | `infra/components/api-service.ts:127-129` |
| `API_DEBUG` | Hardcoded `"false"` | `infra/components/api-service.ts:130` |
| `PRODUCTHUNT_API_TOKEN` | Pulumi secret (optional) | `infra/components/api-service.ts:132-134` |
| `PIPELINE_APPSTORE_KEYWORDS` | Config (20 keyword categories) | `infra/components/api-service.ts:136-138` |
| `PIPELINE_SUBREDDITS` | Config (~44 subreddits) | `infra/components/api-service.ts:139-142` |
| `PIPELINE_RSS_FEEDS` | Config (HN, TechCrunch) | `infra/components/api-service.ts:143-146` |

#### GCP Artifact Registry: `idea-fork`

Docker container registry for API images.

| Property | Value | Source |
|---|---|---|
| Repository ID | `idea-fork` | `infra/components/api-service.ts:57` |
| Location | Same as Cloud Run region (`us-east4`) | `infra/components/api-service.ts:58` |
| Format | `DOCKER` | `infra/components/api-service.ts:59` |
| Cleanup policy | Keep 10 most recent versions | `infra/components/api-service.ts:60-66` |
| Image tag format | `{region}-docker.pkg.dev/{project}/idea-fork/api:latest` | `infra/components/api-service.ts:71` |

#### GCP Cloud Scheduler Job: `idea-fork-pipeline`

Triggers the daily data pipeline by calling the API's internal endpoint.

| Property | Value | Source |
|---|---|---|
| Job name | `idea-fork-pipeline` | `infra/components/pipeline-cron.ts:36` |
| Region | `us-east4` (same as Cloud Run) | `infra/components/pipeline-cron.ts:37` |
| Schedule | `0 14 * * *` (daily at 2:00 PM ET, configurable) | `infra/config.ts:31` |
| Timezone | `America/New_York` (configurable) | `infra/config.ts:32-33` |
| Attempt deadline | `600s` (10 minutes) | `infra/components/pipeline-cron.ts:40` |
| Retry count | `1` | `infra/components/pipeline-cron.ts:42` |
| Min backoff | `60s` | `infra/components/pipeline-cron.ts:43` |
| HTTP method | `POST` | `infra/components/pipeline-cron.ts:47` |
| Target URI | `{apiUrl}/internal/pipeline/run` | `infra/components/pipeline-cron.ts:46` |
| Auth header | `X-Internal-Secret` (from Pulumi secret) | `infra/components/pipeline-cron.ts:49-50` |

#### Vercel (Web App hosting)

**Not managed by Pulumi.** The Next.js web app (`clients/web/`) is deployed to Vercel separately (auto-deploy on push to main). Vercel configuration is inferred from `next.config.ts` and environment variables set in the Vercel dashboard.

| Property | Value | Source |
|---|---|---|
| Framework | Next.js 16 (App Router) | `clients/web/next.config.ts` |
| Sentry integration | Source maps uploaded, tracing excluded | `clients/web/next.config.ts:52-62` |
| Rewrites | Proxy `/api/v1/*` to FastAPI when `DATA_SOURCE !== "neon"` | `clients/web/next.config.ts:10-18` |
| Security headers | X-Frame-Options, CSP, nosniff, Referrer-Policy | `clients/web/next.config.ts:19-49` |

---

### Data Stores

#### Neon PostgreSQL: `idea-fork`

Managed serverless PostgreSQL. The single persistent data store for all application state.

| Property | Value | Source |
|---|---|---|
| Project name | `idea-fork` | `infra/index.ts:7` |
| Organization ID | Required config (`neonOrgId`) | `infra/config.ts:18` |
| Region | `aws-us-east-1` (configurable, default) | `infra/config.ts:19` |
| PostgreSQL version | `18` (default) | `infra/components/neon-database.ts:41` |
| Branch | `main` | `infra/components/neon-database.ts:43` |
| Database name | `idea_fork` (default) | `infra/components/neon-database.ts:44` |
| Role name | `idea_fork` (default) | `infra/components/neon-database.ts:45` |
| Autoscaling min CU | `0.25` (scales to near-zero) | `infra/components/neon-database.ts:48` |
| Autoscaling max CU | `1` | `infra/components/neon-database.ts:49` |
| History retention | `21600s` (6 hours, free tier maximum) | `infra/components/neon-database.ts:51` |
| Pulumi provider | `kislerdm/neon` Terraform provider v1.1.0, bridged | `infra/Pulumi.yaml:5-9` |

**Connection handling:**

The Neon component exposes multiple connection URIs (`infra/components/neon-database.ts:56-76`):

- `connectionUri` -- direct connection string (standard PostgreSQL)
- `connectionUriPooler` -- pooled connection via Neon's built-in PgBouncer
- `asyncpgUri` -- derived from `connectionUriPooler`, converted to `postgresql+asyncpg://` scheme for SQLAlchemy async compatibility. The conversion replaces `sslmode` with `ssl` and removes `channel_binding` (not supported by asyncpg).

The API service receives `asyncpgUri` as its `API_DATABASE_URL` (`infra/index.ts:19`).

**Access patterns:**

- **Production reads:** Next.js on Vercel queries Neon directly via `@neondatabase/serverless` (not through the API server)
- **Pipeline writes:** FastAPI on Cloud Run writes via asyncpg through the pooled connection
- **Migrations:** Alembic (run manually or in CI, not by Pulumi)

#### Local Development Database (Docker Compose)

**Not deployed to any cloud environment.** Used for local development only.

| Property | Value | Source |
|---|---|---|
| Image | `postgres:18` | `docker-compose.yml:3` |
| Port | `5432` (configurable via `POSTGRES_PORT`) | `docker-compose.yml:5-6` |
| User | `idea_fork` (configurable via `POSTGRES_USER`) | `docker-compose.yml:8` |
| Database | `idea_fork` (configurable via `POSTGRES_DB`) | `docker-compose.yml:10` |
| Password | `local_dev_password` (configurable via `POSTGRES_PASSWORD`) | `docker-compose.yml:9` |
| Volume | `pgdata` (named Docker volume at `/var/lib/postgresql`) | `docker-compose.yml:12, 14-15` |
| Restart policy | `unless-stopped` | `docker-compose.yml:4` |

---

### Networking

#### Ingress

- **Cloud Run:** `INGRESS_TRAFFIC_ALL` -- accepts traffic from the public internet (`infra/components/api-service.ts:103`). No VPC connector or internal-only restriction.
- **Vercel:** Public by default (managed by Vercel, not in IaC).
- **Neon:** Accessible over the public internet via TLS. No VPC peering configured.

#### CORS

The API restricts cross-origin requests to the production web app domain:
- Allowed origins: `https://idea-fork.zzooapp.com` (default, configurable via `corsAllowedOrigins`)
- Source: `infra/config.ts:29-30`

#### Security Headers (Web)

Configured in `clients/web/next.config.ts:19-49`:
- `X-Frame-Options: DENY` -- prevents clickjacking
- `X-Content-Type-Options: nosniff` -- prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` -- restricts script, style, font, image, and connect sources. Production CSP allows connections to `*.ingest.sentry.io` and `us.i.posthog.com` only.

#### DNS / CDN

**Not managed by Pulumi.** The design doc references Cloudflare CDN for static assets and edge caching. The production domain is `idea-fork.zzooapp.com` (inferred from CORS config).

---

### Security

#### IAM

| Resource | Principal | Role | Source |
|---|---|---|---|
| Cloud Run service | `allUsers` | `roles/run.invoker` | `infra/components/api-service.ts:166-175` |
| Cloud Run service | `idea-fork-api` SA | Service identity | `infra/components/api-service.ts:87-94` |

The Cloud Run service is publicly invokable. Authentication for internal endpoints (pipeline trigger) is handled at the application level via the `X-Internal-Secret` header, not through IAM.

#### Secrets Management

All secrets are stored as Pulumi secrets (encrypted in Pulumi state) and injected as Cloud Run environment variables at deploy time. There is no use of GCP Secret Manager in the IaC.

| Secret | Pulumi config key | Required | Source |
|---|---|---|---|
| Google API Key (Gemini) | `googleApiKey` | Yes (`requireSecret`) | `infra/config.ts:22` |
| Internal pipeline secret | `internalSecret` | Yes (`requireSecret`) | `infra/config.ts:23` |
| Sentry DSN | `sentryDsn` | No (`getSecret`, defaults to `""`) | `infra/config.ts:24` |
| Product Hunt API token | `producthuntApiToken` | No (`getSecret`, defaults to `""`) | `infra/config.ts:25-26` |

#### Encryption

- **In transit:** TLS enforced by default on all three platforms (Cloud Run, Neon, Vercel). Neon connections use `ssl=require`.
- **At rest:** Neon encrypts at rest by default (AES-256). Cloud Run container images in Artifact Registry are encrypted by Google-managed keys.

#### GCP API Enablement

The IaC explicitly enables the following GCP APIs:

| API | Purpose | Source |
|---|---|---|
| `run.googleapis.com` | Cloud Run v2 | `infra/components/api-service.ts:35-42` |
| `artifactregistry.googleapis.com` | Docker image registry | `infra/components/api-service.ts:44-51` |
| `cloudscheduler.googleapis.com` | Pipeline cron job | `infra/components/pipeline-cron.ts:23-30` |

All three are set with `disableOnDestroy: false` to prevent accidental API disabling on stack teardown.

---

### External Services

These services are consumed by the application but are **not provisioned by Pulumi**. They are configured via environment variables or hardcoded in application code.

#### Data Ingestion Sources (consumed by pipeline)

| Service | Protocol | Configuration | Purpose |
|---|---|---|---|
| Reddit API | REST (public JSON) | ~44 subreddits configured in `infra/config.ts:38-39` | Raw user complaint posts |
| RSS Feeds | HTTP (feedparser) | 2 feeds: HN (`hnrss.org/newest?points=50`), TechCrunch (`techcrunch.com/feed/`) in `infra/config.ts:41-42` | Tech news articles |
| Product Hunt API | GraphQL (API token) | Token via `PRODUCTHUNT_API_TOKEN` env var | Trending products |
| App Store | Scraping / API | 20 keyword categories in `infra/config.ts:34-36` | App reviews + product listings |
| Google Play | Scraping / API | Same keywords as App Store | App reviews + product listings |
| Google Trends | REST (unofficial, pytrends) | Configured in application code | Search interest / demand signals |

#### AI / LLM Services (consumed by pipeline)

| Service | Protocol | Configuration | Purpose |
|---|---|---|---|
| Google Gemini API | REST (API key) | Key via `GOOGLE_API_KEY` env var. Models: `gemini-2.5-flash` (default), `flash-lite` | Post tagging, embedding, brief synthesis |

#### Observability Services

| Service | Protocol | Configuration | Purpose |
|---|---|---|---|
| Sentry | SDK (async) | DSN via `SENTRY_DSN` env var. Configured for both API (`SENTRY_ENVIRONMENT=production`) and web (source maps uploaded) | Error tracking |
| PostHog | Client-side JS SDK + REST | CSP allows `us.i.posthog.com` | User analytics |
| GCP Cloud Logging | Built-in (Cloud Run) | No additional config | Structured request logs |
| GCP Cloud Monitoring | Built-in (Cloud Run) | No additional config | Request latency, error rate, instance count |

---

## Relationships

### Resource Dependency Chain

```
infra/index.ts wiring (lines 6-36):

NeonDatabase("db")
  └─ asyncpgUri ──────────────────────► ApiService("api").databaseUrl
                                           │
                                           └─ url ──────────► PipelineCron("pipeline").apiUrl
                                                                  │
                                                  internalSecret ─┘ (shared from config)
```

### Data Flow: Production Read Path

```
User (browser)
  │
  ▼
Vercel (Next.js SSR)
  │  @neondatabase/serverless (direct SQL)
  ▼
Neon PostgreSQL (aws-us-east-1)
```

The API server on Cloud Run is **not in the production read path**. Next.js queries Neon directly when `DATA_SOURCE=neon`.

### Data Flow: Pipeline Write Path

```
Cloud Scheduler (us-east4)
  │  POST /internal/pipeline/run
  │  X-Internal-Secret header
  ▼
Cloud Run - idea-fork-api (us-east4)
  │  Fetches from external sources:
  ├──► Reddit API
  ├──► RSS Feeds (HN, TechCrunch)
  ├──► Product Hunt API (GraphQL)
  ├──► App Store / Google Play
  ├──► Google Trends (pytrends)
  │  Processes with:
  ├──► Google Gemini API (tagging, embedding, synthesis)
  │  Writes results:
  ▼
Neon PostgreSQL (aws-us-east-1)
  via asyncpg + PgBouncer pooler
```

### Cross-Region Latency

| From | To | Regions | Notes |
|---|---|---|---|
| Cloud Run | Neon | `us-east4` (GCP) to `aws-us-east-1` (AWS) | Cross-cloud, same geographic area. Low latency (~5-10ms expected). |
| Vercel | Neon | Vercel edge to `aws-us-east-1` (AWS) | Vercel serverless functions run in the closest region; Neon driver supports WebSocket for edge. |

---

## Environments

### Production

| Component | Platform | Details |
|---|---|---|
| Web App | Vercel | Auto-deploys from `main`. `DATA_SOURCE=neon` for direct DB reads. |
| API Server | GCP Cloud Run (us-east4) | 0-3 instances, 1 vCPU / 1Gi. Pipeline execution only (not serving user reads). |
| Database | Neon (aws-us-east-1) | `main` branch, 0.25-1 CU autoscaling. PG 18. |
| Pipeline trigger | GCP Cloud Scheduler | Daily at 2:00 PM ET. |
| Error tracking | Sentry | Both web and API. |
| Analytics | PostHog | Client-side events. |

### Local Development

| Component | Platform | Details |
|---|---|---|
| Web App | `localhost:3000` (bun) | `DATA_SOURCE` unset, proxies to FastAPI via rewrites. |
| API Server | `localhost:8080` (uvicorn) | Full API available for reads and writes. |
| Database | Docker Compose (`postgres:18`) | Port 5432, user/db `idea_fork`, password `local_dev_password`. |
| Pipeline trigger | Manual (`just api-pipeline`) | No cron in local dev. |

### Preview (PR review)

| Component | Platform | Details |
|---|---|---|
| Web App | Vercel preview URL | Auto-deployed per PR. May use Neon branch or production DB. |
| API Server | Not deployed | Preview relies on Neon direct access or production API. |
| Database | Neon branch (when used) | Neon's branching model provides isolated DB without a separate instance. |

**Note:** There is no staging environment. The design doc explicitly states this is intentional for MVP.

---

## Unverified Items

The following items are referenced in the design doc (`docs/design-doc.md`) but are **not present in the Pulumi IaC** and could not be verified from infrastructure code.

| Item | Design doc claim | IaC status |
|---|---|---|
| Cloudflare CDN | "Static assets, edge caching" (design doc section 3.2) | Not in Pulumi. Likely configured in Cloudflare dashboard or DNS. |
| GCP Secret Manager | "GCP Secret Manager for API keys" (design doc section 6.4) | Not used. Secrets are Pulumi-managed and injected as env vars. |
| Cloud Monitoring alerts | "API error rate > 5%, pipeline failure" (design doc section 6.2) | No alerting resources in Pulumi. May be configured manually in GCP console. |
| GitHub Actions CI/CD | "GitHub Actions builds Docker image" (design doc section 5.2) | Not in Pulumi (expected, as CI/CD pipelines are typically separate). No `.github/workflows/` files were examined. |
| Neon branching for dev/preview | "Neon branch for development and preview" (design doc section 5.3) | Pulumi only creates the `main` branch. Dev/preview branches may be created ad-hoc. |
| Min instances = 1 during business hours | "Min instances = 1 for API service during business hours" (design doc section 6.5) | IaC default is `minInstances = 0`. No time-based scaling configured. |

---

## Pulumi Stack Outputs

Defined in `infra/index.ts:38-41`:

| Output | Description | Source |
|---|---|---|
| `neonProjectId` | Neon project identifier | `db.projectId` |
| `neonDatabaseHost` | Neon database hostname | `db.databaseHost` |
| `apiUrl` | Cloud Run service URL | `api.url` |
| `pipelineCronJob` | Cloud Scheduler job name | `cron.jobName` |
