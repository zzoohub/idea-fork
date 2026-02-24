"""Tests for alembic/env.py — _get_sync_url, run_migrations_offline, run_migrations_online,
and the module-level offline/online dispatch.

Strategy: The env.py file imports ``alembic.context`` at module level and immediately
calls ``context.is_offline_mode()`` at the bottom of the file.  To reach every branch
we must re-import the module after clearing it from ``sys.modules`` with all external
dependencies patched.

The module is loaded from its absolute path using importlib.util.spec_from_file_location
so that the test suite works regardless of the working directory.
"""
import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Absolute path to the alembic env module.
# Test file lives at services/api/tests/test_alembic_env.py
# parents[0] = services/api/tests
# parents[1] = services/api   ← project root containing alembic/ and src/
_API_ROOT = Path(__file__).parents[1]
_ENV_PATH = _API_ROOT / "alembic" / "env.py"
_ENV_MODULE_NAME = "alembic_env_under_test"  # synthetic name avoids collisions

# Make ``src/`` importable so that env.py's own imports work.
_SRC_DIR = str(_API_ROOT / "src")
if _SRC_DIR not in sys.path:
    sys.path.insert(0, _SRC_DIR)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_context(*, is_offline: bool, config_file_name=None):
    """Return a fully-formed mock that stands in for ``alembic.context``."""
    ctx = MagicMock()
    ctx.config.config_file_name = config_file_name
    ctx.is_offline_mode.return_value = is_offline
    # context.begin_transaction() is used as a context manager
    ctx.begin_transaction.return_value.__enter__ = MagicMock(return_value=None)
    ctx.begin_transaction.return_value.__exit__ = MagicMock(return_value=False)
    return ctx


def _make_mock_engine():
    """Return a mock SQLAlchemy engine with a working connect() context manager."""
    engine = MagicMock()
    conn = MagicMock()
    engine.connect.return_value.__enter__ = MagicMock(return_value=conn)
    engine.connect.return_value.__exit__ = MagicMock(return_value=False)
    return engine, conn


def _load_env_module(mock_context, mock_settings, *, mock_create_engine=None, mock_file_config=None):
    """
    Load ``alembic/env.py`` as a fresh module with all external dependencies patched.

    The module is given the synthetic name ``_ENV_MODULE_NAME`` so it never
    conflicts with any real ``alembic.env`` already imported by the test process.

    Parameters
    ----------
    mock_context       : MagicMock replacing ``alembic.context``
    mock_settings      : object with an ``API_DATABASE_URL`` attribute
    mock_create_engine : optional MagicMock for ``sqlalchemy.create_engine``
    mock_file_config   : optional MagicMock for ``logging.config.fileConfig``
    """
    # Remove any previous load so the module body re-executes completely.
    sys.modules.pop(_ENV_MODULE_NAME, None)

    if mock_create_engine is None:
        mock_create_engine = _make_mock_engine()[0]

    # Build a fresh module spec from the file.
    spec = importlib.util.spec_from_file_location(_ENV_MODULE_NAME, _ENV_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_ENV_MODULE_NAME] = module

    patches = [
        patch("alembic.context", mock_context),
        patch("shared.config.get_settings", return_value=mock_settings),
        patch("sqlalchemy.create_engine", mock_create_engine),
    ]
    if mock_file_config is not None:
        patches.append(patch("logging.config.fileConfig", mock_file_config))

    # Apply all patches and execute the module body.
    active = [p.__enter__() for p in patches]
    try:
        spec.loader.exec_module(module)
    finally:
        for p, entered in zip(patches, active, strict=True):
            p.__exit__(None, None, None)

    return module


# ---------------------------------------------------------------------------
# _get_sync_url
# ---------------------------------------------------------------------------


class TestGetSyncUrl:
    """Unit tests for _get_sync_url() — URL scheme replacement logic."""

    def _call_get_sync_url(self, url: str) -> str:
        """Load env with the given database URL and call _get_sync_url()."""
        mock_ctx = _make_mock_context(is_offline=True)
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = url
        env_mod = _load_env_module(mock_ctx, mock_settings)
        # Call again directly (module-level call already happened on import)
        return env_mod._get_sync_url()

    def test_replaces_asyncpg_scheme_with_sync(self):
        """asyncpg URL is converted to plain postgresql://."""
        result = self._call_get_sync_url("postgresql+asyncpg://user:pass@localhost:5432/mydb")
        assert result == "postgresql://user:pass@localhost:5432/mydb"

    def test_preserves_url_when_no_asyncpg_prefix(self):
        """A URL that already uses postgresql:// is returned unchanged."""
        result = self._call_get_sync_url("postgresql://user:pass@localhost/db")
        assert result == "postgresql://user:pass@localhost/db"

    def test_preserves_credentials_and_port(self):
        """Username, password, host, and port survive the replacement."""
        result = self._call_get_sync_url("postgresql+asyncpg://admin:secret@db-host:5433/prod")
        assert result == "postgresql://admin:secret@db-host:5433/prod"

    def test_returns_string(self):
        """Return type is always str."""
        result = self._call_get_sync_url("postgresql+asyncpg://localhost/db")
        assert isinstance(result, str)

    def test_only_replaces_asyncpg_scheme_segment(self):
        """Only the leading scheme is replaced; +asyncpg is absent from the result."""
        result = self._call_get_sync_url("postgresql+asyncpg://localhost/db")
        assert result.startswith("postgresql://")
        assert "+asyncpg" not in result


# ---------------------------------------------------------------------------
# run_migrations_offline
# ---------------------------------------------------------------------------


class TestRunMigrationsOffline:
    """Tests for run_migrations_offline() — called when is_offline_mode() is True."""

    def _load_offline(self, db_url="postgresql+asyncpg://u:p@host/db"):
        mock_ctx = _make_mock_context(is_offline=True)
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = db_url
        env_mod = _load_env_module(mock_ctx, mock_settings)
        return env_mod, mock_ctx

    def test_configures_context_with_sync_url(self):
        """context.configure() is called with the converted sync URL."""
        db_url = "postgresql+asyncpg://u:p@host/db"
        expected_url = "postgresql://u:p@host/db"

        env_mod, mock_ctx = self._load_offline(db_url)
        # Call it a second time explicitly to observe keyword arguments cleanly.
        mock_ctx.configure.reset_mock()
        env_mod.run_migrations_offline()

        # At least one configure call must carry url=expected_url
        assert any(
            c.kwargs.get("url") == expected_url
            for c in mock_ctx.configure.call_args_list
        ), f"Expected url={expected_url!r} in configure calls; got {mock_ctx.configure.call_args_list}"

    def test_configure_uses_literal_binds_and_named_paramstyle(self):
        """run_migrations_offline passes literal_binds=True and dialect_opts."""
        env_mod, mock_ctx = self._load_offline()
        mock_ctx.configure.reset_mock()
        env_mod.run_migrations_offline()

        found = any(
            c.kwargs.get("literal_binds") is True
            and c.kwargs.get("dialect_opts") == {"paramstyle": "named"}
            for c in mock_ctx.configure.call_args_list
        )
        assert found, "No configure call with literal_binds=True and dialect_opts found"

    def test_runs_migrations_inside_transaction(self):
        """run_migrations() is called inside context.begin_transaction()."""
        env_mod, mock_ctx = self._load_offline()
        mock_ctx.begin_transaction.reset_mock()
        mock_ctx.run_migrations.reset_mock()
        env_mod.run_migrations_offline()

        mock_ctx.begin_transaction.assert_called()
        mock_ctx.run_migrations.assert_called()

    def test_configure_receives_target_metadata(self):
        """target_metadata (Base.metadata) is passed to context.configure()."""
        env_mod, mock_ctx = self._load_offline()
        mock_ctx.configure.reset_mock()
        env_mod.run_migrations_offline()

        from outbound.postgres.database import Base

        found = any(
            c.kwargs.get("target_metadata") is Base.metadata
            for c in mock_ctx.configure.call_args_list
        )
        assert found, "target_metadata not passed to context.configure()"


# ---------------------------------------------------------------------------
# run_migrations_online
# ---------------------------------------------------------------------------


class TestRunMigrationsOnline:
    """Tests for run_migrations_online() — called when is_offline_mode() is False."""

    def _load_online(self, db_url="postgresql+asyncpg://u:p@host/db"):
        mock_ctx = _make_mock_context(is_offline=False)
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = db_url
        mock_engine, mock_conn = _make_mock_engine()
        env_mod = _load_env_module(mock_ctx, mock_settings, mock_create_engine=mock_engine)
        return env_mod, mock_ctx, mock_engine, mock_conn

    def test_creates_engine_with_null_pool(self):
        """create_engine is called with NullPool and the sync URL."""
        db_url = "postgresql+asyncpg://u:p@host/db"
        expected_sync_url = "postgresql://u:p@host/db"

        mock_ctx = _make_mock_context(is_offline=False)
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = db_url
        mock_engine, _ = _make_mock_engine()

        from sqlalchemy import pool as sa_pool

        captured = []

        original_create = MagicMock(side_effect=lambda *a, **kw: (captured.append((a, kw)), mock_engine)[1])

        _load_env_module(mock_ctx, mock_settings, mock_create_engine=original_create)

        # Verify create_engine was called with NullPool and the sync URL
        calls_with_nullpool = [
            (a, kw) for a, kw in captured if kw.get("poolclass") is sa_pool.NullPool
        ]
        assert calls_with_nullpool, "create_engine not called with poolclass=NullPool"
        assert calls_with_nullpool[-1][0][0] == expected_sync_url

    def test_configures_context_with_connection(self):
        """context.configure() receives the open connection and target_metadata."""
        env_mod, mock_ctx, _, _ = self._load_online()
        mock_ctx.configure.reset_mock()
        env_mod.run_migrations_online()

        assert any(
            "connection" in c.kwargs for c in mock_ctx.configure.call_args_list
        ), "No configure call with 'connection' keyword found"

    def test_runs_migrations_inside_transaction(self):
        """run_migrations() is called inside context.begin_transaction()."""
        env_mod, mock_ctx, _, _ = self._load_online()
        mock_ctx.begin_transaction.reset_mock()
        mock_ctx.run_migrations.reset_mock()
        env_mod.run_migrations_online()

        mock_ctx.begin_transaction.assert_called()
        mock_ctx.run_migrations.assert_called()

    def test_configure_receives_target_metadata(self):
        """target_metadata (Base.metadata) is passed to configure() in online mode."""
        env_mod, mock_ctx, _, _ = self._load_online()
        mock_ctx.configure.reset_mock()
        env_mod.run_migrations_online()

        from outbound.postgres.database import Base

        found = any(
            c.kwargs.get("target_metadata") is Base.metadata
            for c in mock_ctx.configure.call_args_list
        )
        assert found, "target_metadata not passed to context.configure() in online mode"


# ---------------------------------------------------------------------------
# Module-level dispatch (if context.is_offline_mode(): … else: …)
# ---------------------------------------------------------------------------


class TestModuleLevelDispatch:
    """Tests for the module-level if/else that picks offline vs online mode."""

    def test_offline_mode_calls_run_migrations_offline(self):
        """When is_offline_mode() returns True, run_migrations_offline() is invoked."""
        mock_ctx = _make_mock_context(is_offline=True)
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/db"

        _load_env_module(mock_ctx, mock_settings)

        # In offline mode, configure must have been called with url= (not connection=)
        assert any(
            "url" in c.kwargs for c in mock_ctx.configure.call_args_list
        ), "Offline mode should call context.configure(url=...)"
        mock_ctx.run_migrations.assert_called()

    def test_online_mode_calls_run_migrations_online(self):
        """When is_offline_mode() returns False, run_migrations_online() is invoked."""
        mock_ctx = _make_mock_context(is_offline=False)
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/db"
        mock_engine, _ = _make_mock_engine()

        _load_env_module(mock_ctx, mock_settings, mock_create_engine=mock_engine)

        # In online mode, configure must have been called with connection= (not url=)
        assert any(
            "connection" in c.kwargs for c in mock_ctx.configure.call_args_list
        ), "Online mode should call context.configure(connection=...)"
        mock_ctx.run_migrations.assert_called()

    def test_config_file_logging_skipped_when_config_file_name_is_none(self):
        """fileConfig() must NOT be called when config_file_name is None."""
        mock_ctx = _make_mock_context(is_offline=True, config_file_name=None)
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/db"
        mock_file_config = MagicMock()

        _load_env_module(mock_ctx, mock_settings, mock_file_config=mock_file_config)

        mock_file_config.assert_not_called()

    def test_config_file_logging_called_when_config_file_name_is_set(self):
        """fileConfig() IS called when config.config_file_name is not None."""
        mock_ctx = _make_mock_context(is_offline=True, config_file_name="alembic.ini")
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/db"
        mock_file_config = MagicMock()

        _load_env_module(mock_ctx, mock_settings, mock_file_config=mock_file_config)

        mock_file_config.assert_called_once_with("alembic.ini")

    def test_target_metadata_is_base_metadata(self):
        """env.target_metadata must reference Base.metadata after import."""
        mock_ctx = _make_mock_context(is_offline=True)
        mock_settings = MagicMock()
        mock_settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/db" ㄷ

        env_mod = _load_env_module(mock_ctx, mock_settings)

        from outbound.postgres.database import Base

        assert env_mod.target_metadata is Base.metadata
