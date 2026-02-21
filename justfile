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
    cd clients/web && bun install

web-dev:
    cd clients/web && bun run dev

web-build:
    cd clients/web && bun run build

web-start:
    cd clients/web && bun run start

web-lint:
    cd clients/web && bun run lint

web-typecheck:
    cd clients/web && bun tsc --noEmit

web-test *args:
    cd clients/web && bun vitest run {{ args }}

web-test-watch *args:
    cd clients/web && bun vitest {{ args }}

web-test-cov:
    cd clients/web && bun vitest run --coverage

web-clean:
    rm -rf clients/web/.next clients/web/coverage

# ─── API (FastAPI) ───────────────────────────────────────────────────────────

api-install:
    cd services/api && uv sync

api-dev:
    cd services/api && PYTHONPATH=src uv run uvicorn app.main:create_app --factory --reload --host 0.0.0.0 --port 8080

api-start:
    cd services/api && PYTHONPATH=src uv run python -m app.main

api-test *args:
    cd services/api && PYTHONPATH=src uv run pytest {{ args }}

api-test-cov:
    cd services/api && PYTHONPATH=src uv run pytest --cov=src --cov-report=term-missing

api-lint:
    cd services/api && uv run ruff check src tests

api-pipeline:
    cd services/api && PYTHONPATH=src uv run python -m app.pipeline_cli

api-clean:
    rm -rf services/api/.venv services/api/__pycache__

# ─── Database ────────────────────────────────────────────────────────────────

db-migrate:
    @echo "TODO: apply migrations from db/migrations/"

db-seed:
    @echo "TODO: run seed scripts from db/seeds/"

db-reset:
    @echo "TODO: drop + recreate + migrate + seed"

# ─── Worker (Cloudflare Workers) ─────────────────────────────────────────────

worker-dev:
    @echo "TODO: wrangler dev"

worker-test:
    @echo "TODO: vitest run"

# ─── Mobile (Expo) ───────────────────────────────────────────────────────────

mobile-install:
    cd clients/mobile && bun install

mobile-dev:
    cd clients/mobile && bun expo start

mobile-ios:
    cd clients/mobile && bun expo run:ios

mobile-android:
    cd clients/mobile && bun expo run:android

mobile-lint:
    cd clients/mobile && bun run lint

mobile-typecheck:
    cd clients/mobile && bun tsc --noEmit

mobile-test *args:
    cd clients/mobile && bun vitest run {{ args }}

mobile-clean:
    rm -rf clients/mobile/node_modules clients/mobile/.expo

# ─── Quality (aggregated) ────────────────────────────────────────────────────

web-check: web-typecheck web-lint web-test

lint: web-lint api-lint

test: web-test api-test

check: lint web-typecheck test

# ─── Build ───────────────────────────────────────────────────────────────────

build:
    @echo "TODO: docker build"
