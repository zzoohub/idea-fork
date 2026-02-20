# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

## Architecture

## Domain Glossary

## Build & Dev Commands
All commands are in `justfile`. Run `just --list` to see available recipes.

## Environment Setup


## Principles (MUST FOLLOW)
1. All changes must use skills, including after plan mode.
2. After implementation, run these sub-agents in parallel:
   - **z-security-reviewer**: security audit → fix
   - **z-tester**: test changed code → fix


## Do NOT

## API

### API Workflow (MUST FOLLOW)
- Schema changes: **z-database-design** → **z-api-design** (plan)
- Default: **z-axum-hexagonal** + **z-postgresql** (queries)

### Folder Structure (`api/`)
See docs/structure-api.md. 

### Conventions

## Web

### Web Workflow (MUST FOLLOW)
- UI components: **z-ui-engineer** Agent
- Default: **z-nextjs** (implementation) → **vercel-react-best-practices** (review)

### Folder Structure (`web/`)
See docs/structure-web.md. Feature-Sliced Design (FSD) with Next.js App Router.

### FSD Import Rules
- `app(routing) → views → widgets → features → entities → shared` (never import upward)
- `src/views/` = FSD "pages" layer (renamed to avoid Next.js `pages/` conflict)

### Conventions
- **i18n**: Use `next-intl` for all UI text (Korean/English).
