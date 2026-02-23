"""Tests for src/shared/config.py — Settings and get_settings()."""
import os
from unittest.mock import patch

import pytest

from shared.config import Settings, get_settings


def test_settings_defaults():
    """Settings should provide sane defaults without environment variables."""
    with patch.dict(os.environ, {}, clear=True):
        # Pass _env_file=None so pydantic-settings does not load the on-disk
        # .env file, which would override the expected defaults in dev environments.
        settings = Settings(_env_file=None)

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


def test_settings_has_rss_feeds_default():
    """Settings should have PIPELINE_RSS_FEEDS with default value."""
    with patch.dict(os.environ, {}, clear=True):
        settings = Settings(_env_file=None)
    assert "hnrss.org" in settings.PIPELINE_RSS_FEEDS


def test_settings_has_producthunt_token_default():
    """Settings should have PRODUCTHUNT_API_TOKEN with empty default."""
    with patch.dict(os.environ, {}, clear=True):
        settings = Settings(_env_file=None)
    assert settings.PRODUCTHUNT_API_TOKEN == ""
