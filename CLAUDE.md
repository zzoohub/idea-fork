# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**idea-fork** — "Product Hunt for problems." Surfaces real user complaints from Reddit/app stores, clusters them via LLM pipeline (Gemini), and generates actionable product briefs for indie hackers and founders.

## Architecture

Monorepo: `services/api` (FastAPI, Python 3.12, uv), `clients/web` (Next.js 16, bun), `clients/mobile` (Expo, TODO), `services/worker` (TODO). Docs in `docs/`, business ops in `biz/`.

### API — Hexagonal Architecture (`services/api/src/`)
- `domain/` — models, services, ports (`Protocol` ABCs). Domains: brief, pipeline, post, product, rating, tag
- `inbound/http/` — FastAPI routers. `/v1/*` public, `/internal/*` pipeline trigger
- `outbound/` — Postgres repos (SQLAlchemy async + asyncpg), Gemini LLM, Reddit/RSS/App Store clients
- `shared/` — Config (pydantic-settings), pagination
- `app/main.py` — Factory `create_app()` wires DI via lifespan → `request.state`
- DB migrations: Alembic (`services/api/alembic/`), NOT `db/migrations/`

### Web — Feature-Sliced Design (`clients/web/`)
- FSD layers: `app → views → widgets → features → entities → shared` (never import upward)
- `app/` — Next.js App Router: `/[locale]/`, `/briefs`, `/products`, `/search`
- `src/shared/api/client.ts` — `apiFetch()`: full URL server-side, `/api/v1` client-side
- Next.js rewrites `/api/v1/*` → backend API (`next.config.ts`)

## Build & Dev Commands

All commands in `justfile`. Run `just --list` to see all recipes.

## Principles & Constraints

### MUST
1. All changes must use skills, including after plan mode.
2. After implementation, check if sub-agents are needed and run in parallel:
   - **z-security-reviewer**: logic change only (API, auth, data, infra)
   - **z-verifier**: testable code change (run tests, E2E, browser verify)   
   > Skip all for docs/copy-only changes. Skip browser test if `/chrome` unavailable.
3. Marketing content must reference `docs/product-brief.md` for consistent messaging.
4. All user-facing events must be defined in `biz/analytics/tracking-plan.md` before implementation.
5. Any change to architecture or feature specs must update the relevant docs in `docs/`.
6. When the user corrects you, log the lesson to `tasks/lessons.md` with a rule to prevent recurrence.
7. Read `tasks/lessons.md` at every session start.

### MUST NOT
- Do not import upward in the FSD layer hierarchy
- Do not run API commands without `PYTHONPATH=src`
- Do not create raw SQL migrations in `db/migrations/` — use Alembic

### Before Completion Checklist
- [ ] Diff behavior between main and your changes when relevant
- [ ] Ask yourself: "Would a staff engineer approve this?"

### Complex Tasks (5+ steps)
1. Write plan to `tasks/todo.md` with checkable items
2. Verify plan with the user before starting implementation
3. Track progress — mark items complete as you go

## API

### API Workflow (MUST FOLLOW)
- Schema changes: **z-database-design** → **z-api-design** (plan)
- Default: **z-fastapi-hexagonal** + **z-postgresql** (queries)

### API Conventions
- Errors: RFC 9457 Problem Details (`application/problem+json`)
- Async everywhere: `asyncpg` + SQLAlchemy async sessions
- `pytest-asyncio` with `asyncio_mode = "auto"` — no `@pytest.mark.asyncio` needed
- Ruff: `line-length = 99`, rules `E, F, I, N, UP, B, SIM`

## Web

### Web Workflow (MUST FOLLOW)
- UI components: **z-ui-engineer** Agent
- Default: **z-nextjs** (implementation) → **vercel-react-best-practices** (review)

### Web Conventions
- **i18n**: `next-intl`. Locales: `en` (default), `es`, `pt-BR`, `id`, `ja`, `ko`. Messages in `clients/web/messages/`.
- **Dark mode**: light + dark themes. Dark on by default (`<html class="dark">`).
- **Path alias**: `@/*` maps to project root.
- **Testing**: Vitest + React Testing Library + jsdom. Tests co-located as `*.test.tsx`. Coverage: 100% (excludes `src/app/`, `src/views/`, `src/widgets/`, barrel `index.ts`, `src/shared/i18n/`, `src/shared/api/types.ts`).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`. Icons: `lucide-react`. Font: Inter.
- **Package manager**: bun.
