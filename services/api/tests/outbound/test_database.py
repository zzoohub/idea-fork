"""Tests for outbound/postgres/database.py."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from outbound.postgres.database import Base, Database


def test_base_is_declarative_base():
    """Base should be a SQLAlchemy DeclarativeBase."""
    assert hasattr(Base, "metadata")


def test_database_init_creates_engine_and_session_factory():
    mock_engine = MagicMock()
    mock_session_factory = MagicMock()

    with (
        patch("outbound.postgres.database.create_async_engine", return_value=mock_engine) as mock_create,
        patch("outbound.postgres.database.async_sessionmaker", return_value=mock_session_factory),
    ):
        db = Database("postgresql+asyncpg://localhost/test")

    mock_create.assert_called_once_with(
        "postgresql+asyncpg://localhost/test",
        pool_size=10,
        pool_timeout=3,
        pool_pre_ping=True,
    )
    assert db._engine is mock_engine
    assert db._session_factory is mock_session_factory


def test_database_session_calls_factory():
    mock_engine = MagicMock()
    mock_session = MagicMock(spec=AsyncSession)
    mock_session_factory = MagicMock(return_value=mock_session)

    with (
        patch("outbound.postgres.database.create_async_engine", return_value=mock_engine),
        patch("outbound.postgres.database.async_sessionmaker", return_value=mock_session_factory),
    ):
        db = Database("postgresql+asyncpg://localhost/test")
        session = db.session()

    mock_session_factory.assert_called_once()
    assert session is mock_session


@pytest.mark.asyncio
async def test_database_dispose_calls_engine_dispose():
    mock_engine = MagicMock()
    mock_engine.dispose = AsyncMock()
    mock_session_factory = MagicMock()

    with (
        patch("outbound.postgres.database.create_async_engine", return_value=mock_engine),
        patch("outbound.postgres.database.async_sessionmaker", return_value=mock_session_factory),
    ):
        db = Database("postgresql+asyncpg://localhost/test")
        await db.dispose()

    mock_engine.dispose.assert_called_once()
