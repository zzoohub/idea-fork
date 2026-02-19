# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

<!-- 1-2 sentences: what this project is, who it's for -->

## Architecture

## Domain Glossary

<!-- Define business domain terms only if the domain is complex -->
<!-- e.g., "Settlement" = end-of-month partner commission calculation process -->

## Build & Dev Commands

All commands are defined in `justfile`. Run `just --list` to see available recipes.

## Environment Setup

<!-- Prerequisites for local development, .env structure, DB connection setup, etc. -->

## Principles (MUST CONFORM TO)

1. All implementation must use skills (even if after plan mode.)
2. Once the implementation is complete, run the two sub-agents below in parallel:
   - Run a **z-security-reviewer** sub-agent for security audit → fix
   - Run a **z-tester** sub-agent for testing only changed code → fix

## Do NOT

<!-- Things Claude must never do. Always provide an alternative -->
<!-- e.g., -->
<!-- - Do NOT modify existing migration files; create a new migration instead -->
<!-- - Do NOT bump package.json versions arbitrarily; ask first if a version change is needed -->
<!-- - Do NOT use `any` type; use `unknown` with type guards to narrow -->

## API

### API Workflow (MUST CONFORM TO)

1. **z-database-design** → **z-api-design** (plan)
2. **z-axum** (implementation) + **z-postgresql** (queries)
3. `cargo build --release`

### Folder Structure (`api/`)

See docs/structure-api.md 

### Conventions

## Web

### Web Workflow (MUST CONFORM TO)

**nextjs** (implementation) -> **vercel-react-best-practices** (review)

### Folder Structure (`web/`)

See docs/structure-web.md 

### FSD Import Rules

- app(routing) → views → widgets → features → entities → shared (never import upward)
- `src/views/` = FSD "pages" layer (renamed to avoid Next.js `pages/` directory conflict)

### Conventions
