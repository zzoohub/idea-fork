set dotenv-load := false

default:
    @just --list

# ─── Git ──────────────────────────────────────────────────────────────────────

log:
    git log --graph --oneline --all --decorate --color -20

push branch="main" msg="update":
    git add . && git commit -m "{{ msg }}" && git push origin {{ branch }}

# ─── DB ───────────────────────────────────────────────────────────────────────

db-migrate:
    cd services/api && PYTHONPATH=src uv run alembic upgrade head

db-migrate-new msg:
    cd services/api && PYTHONPATH=src uv run alembic revision --autogenerate -m "{{msg}}"

db-rollback:
    cd services/api && PYTHONPATH=src uv run alembic downgrade -1

db-seed:
    cd db && echo "TODO: run seeds"

db-reset:
    docker compose down -v && docker compose up -d --wait && just db-migrate

# ─── API (FastAPI) ────────────────────────────────────────────────────────────

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

api-pipeline-cron:
    curl -s -X POST -H "X-Internal-Secret: $API_INTERNAL_SECRET" http://localhost:8080/internal/pipeline/run

api-clean:
    rm -rf services/api/.venv services/api/__pycache__

# ─── Worker ───────────────────────────────────────────────────────────────────

worker-dev:
    cd services/worker && echo "TODO: start worker"

worker-test:
    cd services/worker && echo "TODO: run worker tests"

# ─── Web (Next.js) ───────────────────────────────────────────────────────────

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

# ─── Mobile (Expo React Native) ──────────────────────────────────────────────

mobile-install:
    cd clients/mobile && bun install

mobile-dev:
    cd clients/mobile && bunx expo start --dev-client

mobile-ios:
    cd clients/mobile && bunx expo run:ios

mobile-android:
    cd clients/mobile && bunx expo run:android

mobile-lint:
    cd clients/mobile && bun run lint

mobile-typecheck:
    cd clients/mobile && bun tsc --noEmit

mobile-test *args:
    cd clients/mobile && bun vitest run {{ args }}

mobile-clean:
    rm -rf clients/mobile/.expo clients/mobile/node_modules

# ─── Quality ──────────────────────────────────────────────────────────────────

lint: api-lint web-lint mobile-lint

test: api-test web-test mobile-test

check: lint test

# ─── Build ────────────────────────────────────────────────────────────────────

build service:
    docker build -t {{ service }} -f services/{{ service }}/Dockerfile .
