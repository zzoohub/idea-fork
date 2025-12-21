"""
Database connection management with async SQLAlchemy.

Provides async session factory for database operations.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

# Create async engine with connection pooling
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_pre_ping=True,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Initialize database tables.

    Note: In production, tables should already exist via migrations.
    This is mainly for verification that connection works.
    """
    logger.info("Verifying database connection...")
    async with engine.begin() as conn:
        # Verify connection is working
        await conn.execute("SELECT 1")
    logger.info("Database connection verified")


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Context manager that provides an async database session.

    Usage:
        async with get_session() as session:
            # perform database operations
            await session.commit()
    """
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db() -> None:
    """Close database connections and dispose engine."""
    logger.info("Closing database connections...")
    await engine.dispose()
    logger.info("Database connections closed")
