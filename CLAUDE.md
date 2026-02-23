# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**idea-fork** — "Product Hunt for problems." Surfaces real user complaints from Reddit/app stores, clusters them via LLM pipeline, and generates actionable product briefs for indie hackers and founders.

## Architecture

### Monorepo Structure
```
├── services/
│   ├── api/              # Backend API
│   └── worker/           # Queue, cron, pub/sub handlers
│       ├── jobs/
│       ├── crons/
│       └── subscribers/
├── clients/
│   ├── web/              # Next.js frontend
│   └── mobile/           # Expo React Native
├── db/
│   ├── migrations/
│   └── seeds/
├── infra/                # Pulumi IaC
├── docs/                 # Product planning (what and how to build)
├── biz/                  # Business operations (how to sell & grow)
└── scripts/
```

## Environment

| Service | Dev                         | Prod |
|---------|-----------------------------|------|
| Web     | `localhost:3000`            | TBD  |
| Mobile  | Expo Dev Client (`19000`)   | TBD  |
| API     | `localhost:8080`            | TBD  |
| Worker  | `localhost:8081~`           | TBD  |
| DB      | Docker Compose (`5432`)     | TBD  |
| Redis   | Docker Compose (`6379`)     | TBD  |

## Principles & Constraints
### MUST
1. All changes must use skills, including after plan mode.
2. After implementation, run these sub-agents in parallel:
   - **z-security-reviewer**: security audit → fix
   - **z-tester**: test changed code → fix
3. Marketing content must reference `docs/product-brief.md` for consistent messaging.
4. All user-facing events must be defined in `biz/analytics/tracking-plan.md` before implementation.
5. Any change to architecture or feature specs must update the relevant docs in `docs/`.

### MUST NOT
- (project-specific anti-patterns here)

## Domain Glossary

> TODO: Define key domain terms and their relationships.

## Build & Dev Commands

All commands are in `justfile`. Run `just --list` to see available recipes.

## API
### API Workflow (MUST FOLLOW)
- Schema changes: **z-database-design** → **z-api-design** (plan)
- Default: **z-fastapi-hexagonal** + **z-postgresql** (queries)

### API Conventions
- `PYTHONPATH=src` is required when running API commands.

## Worker
<!-- TODO: If worker is needed -->

## Web
### Web Workflow (MUST FOLLOW)
- UI components: **z-ui-engineer** Agent
- Default: **z-nextjs** (implementation) → **vercel-react-best-practices** (review)

### FSD Import Rules
- `app(routing) → views → widgets → features → entities → shared` (never import upward)

### Web Conventions
- **i18n**: Use `next-intl` for all UI text (Korean/English).
- **Responsive**: Support all screen sizes.
- **Dark mode**: Support light and dark themes.
- **Path alias**: `@/*` maps to project root (`@/src/...`, `@/app/...`).
- **Testing**: Vitest + React Testing Library + jsdom. Tests co-located as `*.test.tsx`. Coverage thresholds: 100% (excludes `src/app/`, `src/views/`, `src/widgets/`, barrel `index.ts` files).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`. Dark mode on by default (`<html class="dark">`).
- **Icons**: `lucide-react`.
- **Font**: Inter (Google Fonts, loaded via `next/font`).
