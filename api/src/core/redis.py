"""
Redis connection management for FastAPI.

Provides both async (for API endpoints) and sync (for RQ) Redis connections.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from redis import Redis as SyncRedis
from redis.asyncio import Redis as AsyncRedis

from src.core.config import settings


# Async Redis connection pool (for FastAPI endpoints)
_async_redis: Optional[AsyncRedis] = None

# Sync Redis connection (for RQ operations)
_sync_redis: Optional[SyncRedis] = None


async def get_async_redis() -> AsyncRedis:
    """Get the async Redis connection."""
    global _async_redis
    if _async_redis is None:
        _async_redis = AsyncRedis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _async_redis


def get_sync_redis() -> SyncRedis:
    """Get the sync Redis connection (for RQ operations)."""
    global _sync_redis
    if _sync_redis is None:
        _sync_redis = SyncRedis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _sync_redis


async def close_redis() -> None:
    """Close Redis connections."""
    global _async_redis, _sync_redis

    if _async_redis is not None:
        await _async_redis.close()
        _async_redis = None

    if _sync_redis is not None:
        _sync_redis.close()
        _sync_redis = None


@asynccontextmanager
async def redis_lifespan() -> AsyncGenerator[None, None]:
    """Lifespan context manager for Redis connections."""
    yield
    await close_redis()
