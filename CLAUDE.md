# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**idea-fork** — "Product Hunt for problems." Surfaces real user complaints from Reddit/app stores, clusters them via LLM pipeline (Gemini), and generates actionable product briefs for indie hackers and founders.

## Architecture

Monorepo: `services/api` (FastAPI, Python 3.12, uv), `clients/web` (Next.js 16, bun), `clients/mobile` (Expo, TODO), `services/worker` (TODO). Infra: Pulumi (TS) in `infra/` — GCP Cloud Run + Neon Postgres + Cloud Scheduler.

### API — Hexagonal Architecture (`services/api/src/`)
- `domain/` — frozen `@dataclass` models, services, ports (`Protocol` ABCs). No framework deps.
- `inbound/http/` — routers (`/v1/*` public, `/internal/*` pipeline). Envelope: `{"data": ..., "meta": {"has_next", "next_cursor"}}`.
- `outbound/` — Postgres repos + `mapper.py` (ORM → domain), Gemini LLM, Reddit, RSS, App Store, Play Store, Product Hunt, Trends
- `app/main.py` — `create_app()` wires DI via lifespan → `request.state`
- Migrations: Alembic (`services/api/alembic/`), NOT `db/migrations/` (raw SQL reference only)
- Rate limiting: `slowapi` keyed on `session_id` cookie or IP. Same cookie used for anonymous ratings.

### Web — Feature-Sliced Design (`clients/web/`)
- FSD layers: `app → views → widgets → features → entities → shared` (never import upward)
- **Dual data access:** Production (`DATA_SOURCE=neon`) queries Neon directly via `src/shared/db/queries/`, writes via Server Actions. Local dev proxies to FastAPI via `apiFetch()`.
- **i18n:** Always use `Link`/`redirect`/`useRouter` from `src/shared/i18n/navigation.ts`, not Next.js native. Prefix `"as-needed"` (English no prefix).
- **GSAP:** Animation hooks in `src/shared/lib/gsap/`, fully mocked in `vitest.setup.ts`.

## Commands

All via `justfile` (`just --list` for full list).

```bash
# Dev
docker compose up -d && just api-install && just db-migrate && just api-dev
just web-install && just web-dev

# Test
just api-test [file] [-k name]        # just api-test-cov for coverage
just web-test [path]                  # just web-test-cov (100% enforced), just web-test-watch

# Lint
just api-lint                         # Ruff
just web-lint && just web-typecheck   # ESLint + tsc
just check                            # all lint + test

# DB
just db-migrate-new "msg"             # New Alembic revision (autogenerate)
just db-migrate / db-rollback / db-reset

# Pipeline & Infra
just api-pipeline                     # Manual run
just infra-preview / infra-up         # Pulumi (production stack)
```

## Principles & Constraints

### MUST
1. All changes must use skills, including after plan mode.
2. After implementation, run sub-agents in parallel when applicable:
   - **z-security-reviewer**: logic changes (API, auth, data, infra)
   - **z-verifier**: testable code changes
   > Skip for docs/copy-only. Skip browser test if `/chrome` unavailable.
3. Marketing content must reference `docs/product-brief.md`.
4. User-facing events must be defined in `biz/analytics/tracking-plan.md` before implementation.
5. Architecture/feature changes must update relevant `docs/`.
6. Log user corrections to `tasks/lessons.md`. Read it at session start.
7. Complex tasks (5+ steps): plan in `tasks/todo.md`, verify with user, track progress.

### MUST NOT
- Import upward in FSD hierarchy
- Run API commands without `PYTHONPATH=src` (justfile handles this)
- Create migrations in `db/migrations/` — use Alembic
- Use Next.js native `Link`/`redirect`/`useRouter` — use `src/shared/i18n/navigation.ts`

## API

### Workflow (MUST FOLLOW)
- Schema changes: **z-database-design** → **z-rest-api-design**
- Default: **z-fastapi-hexagonal** + **z-postgresql**

### Conventions
- Errors: RFC 9457 (`application/problem+json`). Validation 422: `errors` array `{field, code, message}`.
- Async everywhere. `pytest-asyncio` `asyncio_mode = "auto"` — no `@pytest.mark.asyncio`.
- Ruff: `line-length = 99`, rules `E, F, I, N, UP, B, SIM`
- Cache-Control: collections 60s, detail 300s, static 3600s (`inbound/http/response.py`)

### Testing
- `tests/conftest.py` — `build_test_app()` with stub repos, factories: `make_tag/post/brief/product()`
- `httpx.AsyncClient` + `ASGITransport`. `aiosqlite` for repo tests.

### Key Env Vars
`API_DATABASE_URL`, `API_DEBUG`, `API_INTERNAL_SECRET`, `GOOGLE_API_KEY`, `LLM_MODEL`/`LLM_LITE_MODEL` (default `gemini-2.5-flash`/`flash-lite`), `DATABASE_URL` + `DATA_SOURCE=neon` (web production)

## Web

### Workflow (MUST FOLLOW)
- **z-design-system** → **vercel-composition-patterns** → **vercel-react-best-practices**

### Conventions
- **i18n**: `next-intl`. Locales: `en`, `es`, `pt-BR`, `id`, `ja`, `ko`. Messages in `messages/`.
- **Path alias**: `@/*` → `clients/web/` root (NOT `src/`). Ex: `@/src/shared/ui/button`.
- **Testing**: Vitest + RTL + jsdom. Co-located `*.test.tsx`. 100% coverage (excludes `src/app/`, `src/views/`, `src/widgets/`, `index.ts`, `src/shared/i18n/`, `src/shared/api/types.ts`, `src/shared/db/client.ts`). Use `renderWithIntl()` for i18n components.
- **Styling**: Tailwind v4 + `lucide-react`. Dark mode on by default.
- **Analytics**: PostHog events in `src/shared/analytics/events.ts`. Must match tracking plan.
- **Package manager**: bun.
