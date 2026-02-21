"""Tests for src/shared/config.py — Settings and get_settings()."""
import os
from unittest.mock import patch

import pytest

from shared.config import Settings, get_settings


def test_settings_defaults():
    """Settings should provide sane defaults without environment variables."""
    with patch.dict(os.environ, {}, clear=True):
        settings = Settings()

    assert settings.API_DATABASE_URL == "postgresql+asyncpg://localhost:5432/idea_fork"
    assert settings.API_CORS_ALLOWED_ORIGINS == "https://idea-fork.com"
    assert settings.API_DEBUG is False


def test_settings_reads_from_env():
    """Settings should pick up values from environment variables."""
    env = {
        "API_DATABASE_URL": "postgresql+asyncpg://custom-host/mydb",
        "API_CORS_ALLOWED_ORIGINS": "http://localhost:3000",
        "API_DEBUG": "true",
    }
    with patch.dict(os.environ, env, clear=True):
        settings = Settings()

    assert settings.API_DATABASE_URL == "postgresql+asyncpg://custom-host/mydb"
    assert settings.API_CORS_ALLOWED_ORIGINS == "http://localhost:3000"
    assert settings.API_DEBUG is True


def test_get_settings_returns_settings_instance():
    """get_settings() should return a Settings object."""
    settings = get_settings()
    assert isinstance(settings, Settings)


def test_settings_debug_false_from_env():
    """API_DEBUG=false should parse to False."""
    with patch.dict(os.environ, {"API_DEBUG": "false"}, clear=False):
        settings = Settings()
    assert settings.API_DEBUG is False
