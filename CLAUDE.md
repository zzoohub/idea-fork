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
- `shared/` — Config (`pydantic-settings`), cursor-based pagination
- `app/main.py` — Factory `create_app()` wires DI via lifespan → `request.state`
- DB migrations: Alembic (`services/api/alembic/`), NOT `db/migrations/` (raw SQL reference only)

### Web — Feature-Sliced Design (`clients/web/`)
- FSD layers: `app → views → widgets → features → entities → shared` (never import upward)
- `app/` — Next.js App Router: `/[locale]/`, `/briefs`, `/products`, `/search`
- `src/shared/api/client.ts` — `apiFetch()`: full URL server-side, `/api/v1` client-side
- Next.js rewrites `/api/v1/*` → backend API (`next.config.ts`)

## Build & Dev Commands

All commands in `justfile`. Run `just --list` to see all recipes. Key commands:

### Local Dev Setup
```bash
docker compose up -d          # Start Postgres 18 (local dev)
just api-install              # uv sync
just db-migrate               # Alembic upgrade head
just api-dev                  # uvicorn --reload on :8080
just web-install              # bun install
just web-dev                  # Next.js dev server
```

### Testing
```bash
just api-test                              # All API tests
just api-test tests/domain/test_post_service.py  # Single file
just api-test -k test_create_post          # Single test by name
just api-test-cov                          # With coverage

just web-test                              # All web tests
just web-test src/features/search/         # Single directory
just web-test-cov                          # With coverage (100% enforced)
just web-test-watch                        # Watch mode
```

### Linting & Checks
```bash
just api-lint                 # Ruff check
just web-lint                 # Next.js lint
just web-typecheck            # tsc --noEmit
just check                    # lint + test (all)
```

### DB Migrations
```bash
just db-migrate-new "add_column_x"   # New Alembic revision (autogenerate)
just db-migrate                       # Apply migrations
just db-rollback                      # Downgrade -1
just db-reset                         # Destroy + recreate + migrate
```

### Pipeline
```bash
just api-pipeline             # Run pipeline manually (CLI)
just api-pipeline-cron        # Trigger via HTTP (needs API_INTERNAL_SECRET)
```

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
- Do not run API commands without `PYTHONPATH=src` (the `justfile` handles this automatically)
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
- Schema changes: **z-database-design** → **z-rest-api-design** (plan)
- Default: **z-fastapi-hexagonal** + **z-postgresql** (queries)

### API Conventions
- Errors: RFC 9457 Problem Details (`application/problem+json`)
- Async everywhere: `asyncpg` + SQLAlchemy async sessions
- `pytest-asyncio` with `asyncio_mode = "auto"` — no `@pytest.mark.asyncio` needed
- Ruff: `line-length = 99`, rules `E, F, I, N, UP, B, SIM`

### API Testing
- `tests/conftest.py` — `build_test_app()` with stub repos, factory helpers: `make_tag()`, `make_post()`, `make_brief()`, `make_product()`
- Uses `httpx.AsyncClient` + `ASGITransport` for integration tests
- `aiosqlite` for in-memory DB in outbound repo tests

### Key Env Vars
- `API_DATABASE_URL` — default `postgresql+asyncpg://localhost:5432/idea_fork`
- `API_DEBUG` — enables `/docs`, `/openapi.json`, admin router
- `API_INTERNAL_SECRET` — for pipeline trigger endpoint
- `GOOGLE_API_KEY` — Gemini LLM
- `NEXT_PUBLIC_API_URL` — backend URL for web client (default `http://localhost:8080/v1`)

## Web

### Web Workflow (MUST FOLLOW)
- Design System: **z-design-system**
- Default: **vercel-composition-patterns** (composition) → **vercel-react-best-practices** (optimization)

### Web Conventions
- **i18n**: `next-intl`. Locales: `en` (default), `es`, `pt-BR`, `id`, `ja`, `ko`. Messages in `clients/web/messages/`.
- **Dark mode**: light + dark themes. Dark on by default (`<html class="dark">`).
- **Path alias**: `@/*` maps to `clients/web/` root (NOT `src/`). Example: `import { Button } from "@/src/shared/ui/button"`.
- **Testing**: Vitest + React Testing Library + jsdom. Tests co-located as `*.test.tsx`. Coverage: 100% enforced (excludes `src/app/`, `src/views/`, `src/widgets/`, barrel `index.ts`, `src/shared/i18n/`, `src/shared/api/types.ts`). Use `renderWithIntl()` from `@/src/shared/test/with-intl` for components needing i18n context.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`. Icons: `lucide-react`. Font: Inter.
- **Analytics**: Typed PostHog events in `src/shared/analytics/events.ts`. Must match `biz/analytics/tracking-plan.md`.
- **Package manager**: bun.
