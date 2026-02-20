set dotenv-load := false

default:
    @just --list

# ─── Git ────────────────────────────────────────────────────────────

log:
    git log --graph --oneline --all --decorate --color -20

push branch="main" msg="update":
    git add . && git commit -m "{{ msg }}" && git push origin {{ branch }}

# ─── Web (Next.js) ────────────────────────────────────────────────────────────

web-install:
    cd web && bun install

web-dev:
    cd web && bun run dev

web-build:
    cd web && bun run build

web-start:
    cd web && bun run start

web-lint:
    cd web && bun run lint

web-typecheck:
    cd web && bun tsc --noEmit

web-test *args:
    cd web && bun vitest run {{ args }}

web-test-watch *args:
    cd web && bun vitest {{ args }}

web-test-cov:
    cd web && bun vitest run --coverage

# ─── Quality ──────────────────────────────────────────────────────────────────

web-check: web-typecheck web-lint web-test

# ─── Clean ────────────────────────────────────────────────────────────────────

web-clean:
    rm -rf web/.next web/coverage
