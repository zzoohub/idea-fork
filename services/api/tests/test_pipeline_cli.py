"""Tests for app/pipeline_cli.py — _validate_credentials and main()."""
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.pipeline_cli import _validate_credentials, main


# ---------------------------------------------------------------------------
# _validate_credentials
# ---------------------------------------------------------------------------

def _settings(**overrides):
    """Return a MagicMock settings object with all credentials set by default."""
    s = MagicMock()
    s.REDDIT_CLIENT_ID = overrides.get("REDDIT_CLIENT_ID", "cid")
    s.REDDIT_CLIENT_SECRET = overrides.get("REDDIT_CLIENT_SECRET", "csecret")
    s.ANTHROPIC_API_KEY = overrides.get("ANTHROPIC_API_KEY", "sk-ant-key")
    return s


def test_validate_credentials_passes_when_all_set():
    """Should not raise when all three credentials are non-empty."""
    _validate_credentials(_settings())  # no SystemExit


def test_validate_credentials_raises_when_reddit_client_id_missing():
    with pytest.raises(SystemExit):
        _validate_credentials(_settings(REDDIT_CLIENT_ID=""))


def test_validate_credentials_raises_when_reddit_client_secret_missing():
    with pytest.raises(SystemExit):
        _validate_credentials(_settings(REDDIT_CLIENT_SECRET=""))


def test_validate_credentials_raises_when_anthropic_key_missing():
    with pytest.raises(SystemExit):
        _validate_credentials(_settings(ANTHROPIC_API_KEY=""))


def test_validate_credentials_raises_when_multiple_missing():
    with pytest.raises(SystemExit):
        _validate_credentials(_settings(REDDIT_CLIENT_ID="", ANTHROPIC_API_KEY=""))


# ---------------------------------------------------------------------------
# main()
# ---------------------------------------------------------------------------

def _make_pipeline_result(errors=None):
    result = MagicMock()
    result.posts_fetched = 10
    result.posts_upserted = 8
    result.posts_tagged = 6
    result.clusters_created = 2
    result.briefs_generated = 2
    result.errors = errors or []
    return result


@pytest.mark.asyncio
async def test_main_returns_0_on_success():
    """main() should return 0 when the pipeline runs without errors."""
    result = _make_pipeline_result()
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    mock_db = MagicMock()
    mock_db.dispose = AsyncMock()

    settings = _settings()
    settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
    settings.REDDIT_USER_AGENT = "test/0.1"
    settings.PIPELINE_SUBREDDITS = "SaaS,startups"
    settings.PIPELINE_FETCH_LIMIT = 100
    settings.LLM_TAGGING_MODEL = "claude-haiku"
    settings.LLM_SYNTHESIS_MODEL = "claude-sonnet"

    with (
        patch("app.pipeline_cli.get_settings", return_value=settings),
        patch("app.pipeline_cli.Database", return_value=mock_db),
        patch("app.pipeline_cli.PostgresPipelineRepository"),
        patch("app.pipeline_cli.RedditApiClient"),
        patch("app.pipeline_cli.AnthropicLlmClient"),
        patch("app.pipeline_cli.PipelineService", return_value=mock_service),
    ):
        exit_code = await main()

    assert exit_code == 0
    mock_db.dispose.assert_called_once()


@pytest.mark.asyncio
async def test_main_returns_1_when_errors_present():
    """main() should return 1 when the pipeline result contains errors."""
    result = _make_pipeline_result(errors=["stage A failed", "stage B failed"])
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(return_value=result)

    mock_db = MagicMock()
    mock_db.dispose = AsyncMock()

    settings = _settings()
    settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
    settings.REDDIT_USER_AGENT = "test/0.1"
    settings.PIPELINE_SUBREDDITS = "SaaS"
    settings.PIPELINE_FETCH_LIMIT = 50
    settings.LLM_TAGGING_MODEL = "claude-haiku"
    settings.LLM_SYNTHESIS_MODEL = "claude-sonnet"

    with (
        patch("app.pipeline_cli.get_settings", return_value=settings),
        patch("app.pipeline_cli.Database", return_value=mock_db),
        patch("app.pipeline_cli.PostgresPipelineRepository"),
        patch("app.pipeline_cli.RedditApiClient"),
        patch("app.pipeline_cli.AnthropicLlmClient"),
        patch("app.pipeline_cli.PipelineService", return_value=mock_service),
    ):
        exit_code = await main()

    assert exit_code == 1
    mock_db.dispose.assert_called_once()


@pytest.mark.asyncio
async def test_main_disposes_db_even_on_exception():
    """main() must call db.dispose() even when the pipeline raises."""
    mock_service = AsyncMock()
    mock_service.run = AsyncMock(side_effect=RuntimeError("boom"))

    mock_db = MagicMock()
    mock_db.dispose = AsyncMock()

    settings = _settings()
    settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"
    settings.REDDIT_USER_AGENT = "test/0.1"
    settings.PIPELINE_SUBREDDITS = "SaaS"
    settings.PIPELINE_FETCH_LIMIT = 50
    settings.LLM_TAGGING_MODEL = "claude-haiku"
    settings.LLM_SYNTHESIS_MODEL = "claude-sonnet"

    with (
        patch("app.pipeline_cli.get_settings", return_value=settings),
        patch("app.pipeline_cli.Database", return_value=mock_db),
        patch("app.pipeline_cli.PostgresPipelineRepository"),
        patch("app.pipeline_cli.RedditApiClient"),
        patch("app.pipeline_cli.AnthropicLlmClient"),
        patch("app.pipeline_cli.PipelineService", return_value=mock_service),
    ):
        with pytest.raises(RuntimeError):
            await main()

    mock_db.dispose.assert_called_once()


@pytest.mark.asyncio
async def test_main_raises_when_credentials_missing():
    """main() should raise SystemExit when credentials are absent."""
    settings = _settings(REDDIT_CLIENT_ID="", ANTHROPIC_API_KEY="")
    settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"

    with patch("app.pipeline_cli.get_settings", return_value=settings):
        with pytest.raises(SystemExit):
            await main()
