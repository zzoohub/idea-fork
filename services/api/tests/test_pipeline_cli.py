"""Tests for app/pipeline_cli.py — _validate_credentials, main(), and reset_data()."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.pipeline_cli import _validate_credentials, main, reset_data


# ---------------------------------------------------------------------------
# _validate_credentials
# ---------------------------------------------------------------------------

def _settings(**overrides):
    """Return a MagicMock settings object with all credentials set by default."""
    s = MagicMock()
    s.GOOGLE_API_KEY = overrides.get("GOOGLE_API_KEY", "test-google-key")
    return s


def test_validate_credentials_passes_when_all_set():
    """Should not raise when all credentials are non-empty."""
    _validate_credentials(_settings())  # no SystemExit


def test_validate_credentials_raises_when_google_key_missing():
    with pytest.raises(SystemExit):
        _validate_credentials(_settings(GOOGLE_API_KEY=""))


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
    settings.PIPELINE_RSS_FEEDS = "https://hnrss.org/newest"
    settings.LLM_MODEL = "gemini-2.5-flash"
    settings.PRODUCTHUNT_API_TOKEN = ""

    with (
        patch("app.pipeline_cli.get_settings", return_value=settings),
        patch("app.pipeline_cli.Database", return_value=mock_db),
        patch("app.pipeline_cli.PostgresPipelineRepository"),
        patch("app.pipeline_cli.RedditApiClient"),
        patch("app.pipeline_cli.GeminiLlmClient"),
        patch("app.pipeline_cli.RssFeedClient"),
        patch("app.pipeline_cli.GoogleTrendsClient"),
        patch("app.pipeline_cli.ProductHuntApiClient"),
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
    settings.PIPELINE_RSS_FEEDS = ""
    settings.LLM_MODEL = "gemini-2.5-flash"
    settings.PRODUCTHUNT_API_TOKEN = ""

    with (
        patch("app.pipeline_cli.get_settings", return_value=settings),
        patch("app.pipeline_cli.Database", return_value=mock_db),
        patch("app.pipeline_cli.PostgresPipelineRepository"),
        patch("app.pipeline_cli.RedditApiClient"),
        patch("app.pipeline_cli.GeminiLlmClient"),
        patch("app.pipeline_cli.RssFeedClient"),
        patch("app.pipeline_cli.GoogleTrendsClient"),
        patch("app.pipeline_cli.ProductHuntApiClient"),
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
    settings.PIPELINE_RSS_FEEDS = ""
    settings.LLM_MODEL = "gemini-2.5-flash"
    settings.PRODUCTHUNT_API_TOKEN = ""

    with (
        patch("app.pipeline_cli.get_settings", return_value=settings),
        patch("app.pipeline_cli.Database", return_value=mock_db),
        patch("app.pipeline_cli.PostgresPipelineRepository"),
        patch("app.pipeline_cli.RedditApiClient"),
        patch("app.pipeline_cli.GeminiLlmClient"),
        patch("app.pipeline_cli.RssFeedClient"),
        patch("app.pipeline_cli.GoogleTrendsClient"),
        patch("app.pipeline_cli.ProductHuntApiClient"),
        patch("app.pipeline_cli.PipelineService", return_value=mock_service),
    ):
        with pytest.raises(RuntimeError):
            await main()

    mock_db.dispose.assert_called_once()


@pytest.mark.asyncio
async def test_main_raises_when_credentials_missing():
    """main() should raise SystemExit when credentials are absent."""
    settings = _settings(GOOGLE_API_KEY="")
    settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"

    with patch("app.pipeline_cli.get_settings", return_value=settings):
        with pytest.raises(SystemExit):
            await main()


# ---------------------------------------------------------------------------
# reset_data()
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reset_data_returns_1_when_no_secret():
    """reset_data() should return 1 when API_INTERNAL_SECRET is empty."""
    settings = MagicMock()
    settings.API_INTERNAL_SECRET = ""

    with patch("app.pipeline_cli.get_settings", return_value=settings):
        exit_code = await reset_data()

    assert exit_code == 1


@pytest.mark.asyncio
async def test_reset_data_returns_1_when_secret_mismatch():
    """reset_data() should return 1 when provided secret doesn't match."""
    settings = MagicMock()
    settings.API_INTERNAL_SECRET = "secret-123"

    with (
        patch("app.pipeline_cli.get_settings", return_value=settings),
        patch("app.pipeline_cli.sys") as mock_sys,
    ):
        mock_sys.argv = ["pipeline_cli.py", "reset", "wrong-secret"]
        exit_code = await reset_data()

    assert exit_code == 1


@pytest.mark.asyncio
async def test_reset_data_returns_0_on_success():
    """reset_data() should TRUNCATE tables and return 0."""
    settings = MagicMock()
    settings.API_INTERNAL_SECRET = "secret-123"
    settings.API_DATABASE_URL = "postgresql+asyncpg://localhost/test"

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_session.execute = AsyncMock()
    mock_session.commit = AsyncMock()

    mock_db = MagicMock()
    mock_db.session.return_value = mock_session
    mock_db.dispose = AsyncMock()

    with (
        patch("app.pipeline_cli.get_settings", return_value=settings),
        patch("app.pipeline_cli.Database", return_value=mock_db),
        patch("app.pipeline_cli.sys") as mock_sys,
    ):
        mock_sys.argv = ["pipeline_cli.py", "reset", "secret-123"]
        exit_code = await reset_data()

    assert exit_code == 0
    mock_session.execute.assert_called_once()
    mock_session.commit.assert_called_once()
    mock_db.dispose.assert_called_once()
