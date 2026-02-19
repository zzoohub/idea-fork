# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

## Architecture

## Domain Glossary

## Build & Dev Commands

All commands are in `justfile`. Run `just --list` to see available recipes.

## Environment Setup


## Principles (MUST CONFORM TO)

1. All implementation must use skills (even if after plan mode.)
2. Once the implementation is complete, run the two sub-agents below in parallel:
   - Run a **z-security-reviewer** sub-agent for security audit → fix
   - Run a **z-tester** sub-agent for testing only changed code → fix

## Do NOT

## API

### API Workflow (MUST CONFORM TO)

1. **z-database-design** → **z-api-design** (plan)
2. **z-fastapi** (implementation) + **z-postgresql** (queries)

### Folder Structure (`api/`)

See docs/structure-api.md. 

### Conventions

## Web

### Web Workflow (MUST CONFORM TO)

**z-nextjs** (implementation) → **vercel-react-best-practices** (review)

### Folder Structure (`web/`)

See docs/structure-web.md. Feature-Sliced Design (FSD) with Next.js App Router.

### FSD Import Rules

- `app(routing) → views → widgets → features → entities → shared` (never import upward)
- `src/views/` = FSD "pages" layer (renamed to avoid Next.js `pages/` directory conflict)

### Conventions
