# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview



## Project Overview
Mealio meal idea discovery service. Monorepo:
- `/docs` — PRD / design doc / UX strategy **Must update docs if plan changes.**
- `/web` — Nextjs (app router) / Bun
- `/api` — FastAPI / SQLAlchemy / pgvector
- `/infra` — Pulumi

**Status:** Greenfield — documentation complete, implementation not yet started. See `docs/` for product brief, PRD, design doc, and UX strategy.


## Architecture

**Two deployment units sharing one codebase and one database:**

1. **Web** — Next.js 16 (App Router) on Cloudflare Workers via OpenNext. SSR for SEO, client-side interactivity for infinite scroll/filters.
2. **API** — Python 3.12, FastAPI, SQLAlchemy 2.0 async on GCP Cloud Run. Thin layered architecture: routes → services → repositories.
3. **Job** — Same Python codebase as API, runs as a Cloud Run Job on a cron schedule. Sequential stages: fetch → LLM tag → embed → store → cluster (HDBSCAN) → rank → generate briefs.
4. **Database** — Neon PostgreSQL with pgvector. Single source of truth. The database is the integration point between API and pipeline.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons, Inter font |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async, Pydantic v2, Alembic |
| Database | Neon PostgreSQL + pgvector |
| LLM | Anthropic Haiku (tagging + briefs), OpenAI text-embedding-3-small (embeddings) |
| Clustering | HDBSCAN (scikit-learn) |
| Auth | Google OAuth 2.0 → self-issued JWT (access: 15min, refresh: 30d httpOnly cookie) |
| Payments | Stripe (monthly subscription, $9/mo Pro tier) |
| Analytics | PostHog (client + server) |
| Email | Resend (weekly digest) |
| CI/CD | GitHub Actions → Cloudflare Workers (wrangler) + GCP Artifact Registry → Cloud Run |

## Principles (MUST CONFORM TO)

1. All implementation must use skills (even if after plan mode.)
   - web: Use **z-nextjs** skill
   - api & job: Use **z-fastapi** skill + **z-postgresql** skill for queries   
2. Once the implementation is complete, run the two sub-agents below in parallel.
   - Run a **z-security-reviewer** sub-agent for security audit → fix
   - Run a **z-tester** sub-agent for testing only changed code → fix

## Development Setup (Planned)

| Environment | Frontend | Backend | Database |
|------------|---------|---------|----------|
| Local | `next dev` (localhost:3000) | `uvicorn` (localhost:8080) | docker-compose.yml |
| Preview | Cloudflare preview URL (per-PR) | Cloud Run tagged revision | Neon branch (per-PR) |
| Production | Cloudflare Workers (custom domain) | Cloud Run (latest revision) | Neon main branch |

Database migrations: Alembic, run as pre-deploy step in CI. Must be backwards-compatible.

## Project Structure (Planned)

The backend is a monorepo with shared code between API and pipeline:
- API modules: `auth`, `feed`, `briefs`, `needs`, `bookmarks`, `tracking`, `payments`, `users`
- Pipeline stages: fetch → tag → embed → store → cluster → rank → brief (sequential, single job)

## Authorization Model

| Tier | Access |
|------|--------|
| Anonymous | Full feed, brief titles/summaries, 3 deep dives/day (cookie-tracked) |
| Free (registered) | Same + bookmarks |
| Pro ($9/mo) | Everything — full briefs, unlimited deep dives, tracking, notifications |

Enforcement: FastAPI middleware extracts JWT → `get_current_user` dependency. Tier checks in route handlers/services, not middleware.

## Frontend Conventions (from UX Strategy)

- **Feed is the landing page** — no splash, no login gate, no hero section. Content IS the pitch.
- **Two primary nav items only**: Feed and Briefs. Bookmarks/Tracking/Account live in user avatar menu.
- **Platform-native card styling** — left-border colors: Reddit (#FF5700), PH (#DA552F), Play Store (#01875F), App Store (#0D84FF).
- **Tag badges**: complaint (red #DC2626), need (blue #2563EB), feature-request (green #059669), others (gray #6B7280).
- **Soft paywalls** — always show partial content (blurred), never a blank wall.
- **44x44px minimum touch targets** everywhere (WCAG 2.5.5).
- **Skeleton loading** states, never blank pages or spinners.
- Breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px). Max content width 1280px, feed card max 720px.

## Data Sources

| Source | Method | Phase |
|--------|--------|-------|
| Reddit | Official API (OAuth2) | 1 |
| Product Hunt | GraphQL API | 1 |
| Play Store | Scraping (google-play-scraper) | 1 |
| App Store | Scraping (app-store-scraper) | 2+ |

## Milestone Sequence

M1: Pipeline (end-to-end batch job) → M2: Feed + Briefs UI → M3: Auth + Pro tier → M4: Engagement (bookmarks, tracking, email) → M5: Launch (analytics, polish)

## Reference Documents

- `docs/product-brief.md` — Problem space, hypotheses, competitive landscape
- `docs/prd.md` — Functional requirements, user flows, scope
- `docs/design-doc.md` — Architecture, ADRs, infrastructure, data flow, security
- `docs/ux-strategy.md` — Design principles, screen layouts, component patterns, accessibility, analytics events
