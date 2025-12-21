# Idea Generator Job
# Multi-stage build for production deployment

# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir build && \
    pip wheel --no-cache-dir --wheel-dir /wheels .

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels and install
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

# Copy application code
COPY src/ ./src/

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Environment variables with defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LOG_LEVEL=INFO \
    SCHEDULE_HOUR=9 \
    SCHEDULE_MINUTE=0 \
    SCHEDULE_TIMEZONE=UTC \
    IDEAS_PER_RUN=3

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import asyncio; from src.db.database import init_db; asyncio.run(init_db())" || exit 1

# Default command: run scheduler
CMD ["python", "-m", "src.main"]
