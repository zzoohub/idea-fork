# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**idea-fork** — "Product Hunt for problems." Surfaces real user complaints from Reddit/app stores, clusters them via LLM pipeline, and generates actionable product briefs for indie hackers and founders.

Core domain entities: `post` (scraped complaint), `tag`, `cluster`, `brief` (synthesized opportunity), `product`, `rating`.

## Architecture

Monorepo with three top-level modules:

| Module | Stack | Package manager |
|--------|-------|-----------------|
| `web/` | Next.js 16 + React 19 + Tailwind CSS v4 | bun |
| `api/` | FastAPI + SQLAlchemy (not yet scaffolded) | uv |
| `database/` | PostgreSQL 16 (Neon serverless) | SQL migrations |

Design docs live in `docs/` (product-brief, PRD, design-doc, ux-strategy, database-design). UI mockups in `docs/ui/`.

## Build & Dev Commands

All commands are in `justfile`. Run `just --list` to see available recipes.

```sh
# Web
just web-dev              # next dev
just web-build            # next build
just web-lint             # eslint
just web-typecheck        # tsc --noEmit
just web-test             # vitest run (all tests)
just web-test src/entities/brief  # single directory
just web-test-watch       # vitest watch mode
just web-test-cov         # vitest with coverage (100% thresholds)
just web-check            # typecheck + lint + test

# API (not yet scaffolded)
just api-dev              # uvicorn --reload
just api-test             # pytest
just api-test-cov         # pytest --cov
```

## Principles (MUST FOLLOW)

1. All changes must use skills, including after plan mode.
2. After implementation, run these sub-agents in parallel:
   - **z-security-reviewer**: security audit → fix
   - **z-tester**: test changed code → fix

## API

### API Workflow (MUST FOLLOW)
- Schema changes: **z-database-design** → **z-api-design** (plan)
- Default: **z-fastapi-hexagonal** + **z-postgresql** (queries)

### Folder Structure (`api/`)
See `docs/structure-api.md`. Hexagonal layout: `src/domains/[domain]/{router,schemas,models,service,dependencies}.py`, shared infra in `src/shared/`.

### Conventions
- `PYTHONPATH=src` is required when running API commands.

## Web

### Web Workflow (MUST FOLLOW)
- UI components: **z-ui-engineer** Agent
- Default: **z-nextjs** (implementation) → **vercel-react-best-practices** (review)

### Folder Structure (`web/`)
Feature-Sliced Design (FSD) with Next.js App Router. See `docs/structure-web.md`.

- `app/` — Next.js routing only (thin re-exports from `src/views/`)
- `src/views/` — FSD "pages" layer (renamed to avoid Next.js conflict)
- `src/widgets/` — composed sections (e.g., `navigation`)
- `src/features/` — user-facing features (`filter`, `rating`, `search`)
- `src/entities/` — business entities (`brief`, `post`, `product`) with `ui/` subdirs
- `src/shared/ui/` — design system primitives (Button, Card, Chip, Badge, etc.)
- `src/shared/lib/` — utilities
- `src/app/` — FSD app layer (globals.css, providers — NO routing files)

### FSD Import Rules
- `app(routing) → views → widgets → features → entities → shared` (never import upward)

### Conventions
- **i18n**: Use `next-intl` for all UI text (Korean/English).
- **Path alias**: `@/*` maps to project root (`@/src/...`, `@/app/...`).
- **Testing**: Vitest + React Testing Library + jsdom. Tests co-located as `*.test.tsx`. Coverage thresholds: 100% (excludes `src/app/`, `src/views/`, `src/widgets/`, barrel `index.ts` files).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`. Dark mode on by default (`<html class="dark">`).
- **Icons**: `lucide-react`.
- **Font**: Inter (Google Fonts, loaded via `next/font`).

## Database
- PostgreSQL 16 on Neon serverless.
- Schema design in `database/database-design.md`, ERD in `database/erd.mermaid`.
- Migrations in `database/migrations/` using numbered `NNN_name.sql` / `NNN_name.rollback.sql` convention.
