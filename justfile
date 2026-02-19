# Mealio — project task runner
# Usage: just --list

set dotenv-load := false

# ─── Default ──────────────────────────────────────────────────────────────────

# List all recipes
default:
    @just --list

# ─── Web (Next.js) ────────────────────────────────────────────────────────────

# Install web dependencies
web-install:
    cd web && bun install

# Start Next.js dev server
web-dev:
    cd web && bun run dev

# Build Next.js for production
web-build:
    cd web && bun run build

# Start Next.js production server
web-start:
    cd web && bun run start

# Run ESLint
web-lint:
    cd web && bun run lint

# Run vitest
web-test *args:
    cd web && bun vitest run {{ args }}

# Run vitest in watch mode
web-test-watch *args:
    cd web && bun vitest {{ args }}

# Run vitest with coverage
web-test-cov:
    cd web && bun vitest run --coverage

# Type-check without emitting
web-typecheck:
    cd web && bun tsc --noEmit

# Add a shadcn/ui component (e.g. just web-ui button)
web-ui component:
    cd web && bunx shadcn@latest add {{ component }}

# ─── Quality ──────────────────────────────────────────────────────────────────

# Run all web checks (typecheck + lint + test)
web-check: web-typecheck web-lint web-test

# ─── Clean ────────────────────────────────────────────────────────────────────

# Remove web build artifacts
web-clean:
    rm -rf web/.next web/coverage
