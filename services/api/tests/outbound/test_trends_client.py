"""Tests for outbound/trends/client.py — GoogleTrendsClient."""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from outbound.trends.client import GoogleTrendsClient

# TrendReq is imported inside _fetch from pytrends.request, so we patch it there
_TRENDREQ_PATH = "pytrends.request.TrendReq"


# ---------------------------------------------------------------------------
# get_interest — outer async wrapper
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_interest_returns_dict_on_success():
    """get_interest should return the result dict from _fetch."""
    client = GoogleTrendsClient()
    expected = {"avg_interest": {"python": 70.0}, "related_queries": {}, "trend_direction": {}}

    with patch.object(client, "_fetch", return_value=expected):
        result = await client.get_interest(["python"])

    assert result == expected


@pytest.mark.asyncio
async def test_get_interest_returns_empty_dict_on_exception():
    """When _fetch raises, get_interest must swallow the error and return {}."""
    client = GoogleTrendsClient()

    with patch.object(client, "_fetch", side_effect=Exception("network error")):
        result = await client.get_interest(["python"])

    assert result == {}


@pytest.mark.asyncio
async def test_get_interest_calls_fetch_with_keywords():
    """get_interest should forward the keywords to _fetch."""
    client = GoogleTrendsClient()
    captured = {}

    def fake_fetch(keywords):
        captured["keywords"] = keywords
        return {}

    with patch.object(client, "_fetch", side_effect=fake_fetch):
        await client.get_interest(["saas", "fintech"])

    assert captured["keywords"] == ["saas", "fintech"]


# ---------------------------------------------------------------------------
# _fetch — synchronous internals
#
# TrendReq is imported as `from pytrends.request import TrendReq` inside the
# function body, so we must patch it at the source: pytrends.request.TrendReq
# ---------------------------------------------------------------------------


def test_fetch_returns_correct_structure():
    """_fetch should return a dict with avg_interest, related_queries, trend_direction."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    df = pd.DataFrame({"python": [40, 50, 60], "saas": [30, 35, 40]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {
        "python": {"top": None},
        "saas": {"top": None},
    }

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["python", "saas"])

    assert "avg_interest" in result
    assert "related_queries" in result
    assert "trend_direction" in result


def test_fetch_computes_avg_interest():
    """avg_interest should be the mean of the interest column."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    df = pd.DataFrame({"keyword": [10, 20, 30]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {}

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["keyword"])

    assert result["avg_interest"]["keyword"] == pytest.approx(20.0)


def test_fetch_trend_direction_rising():
    """When last value > first value, trend_direction should be 'rising'."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    df = pd.DataFrame({"ai": [10, 50, 90]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {}

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["ai"])

    assert result["trend_direction"]["ai"] == "rising"


def test_fetch_trend_direction_declining():
    """When last value <= first value, trend_direction should be 'declining'."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    df = pd.DataFrame({"blockchain": [90, 50, 10]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {}

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["blockchain"])

    assert result["trend_direction"]["blockchain"] == "declining"


def test_fetch_keyword_not_in_interest_columns_skipped():
    """Keywords not present in interest DataFrame columns are not added to results."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    # DataFrame with different column than the requested keyword
    df = pd.DataFrame({"other": [40, 50]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {}

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["missing"])

    assert "missing" not in result["avg_interest"]
    assert "missing" not in result["trend_direction"]


def test_fetch_related_queries_populated_when_top_available():
    """related_queries should be populated when top DataFrame is non-empty."""
    import pandas as pd

    client = GoogleTrendsClient()

    top_df = pd.DataFrame([
        {"query": "python tutorial", "value": 100},
        {"query": "learn python", "value": 80},
    ])

    pytrends = MagicMock()
    df = pd.DataFrame({"python": [60, 70, 80]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {
        "python": {"top": top_df},
    }

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["python"])

    queries = result["related_queries"]["python"]
    assert len(queries) == 2
    assert queries[0]["query"] == "python tutorial"


def test_fetch_related_queries_empty_when_top_is_none():
    """When top is None, related_queries[keyword] should be an empty list."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    df = pd.DataFrame({"saas": [50, 60]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {
        "saas": {"top": None},
    }

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["saas"])

    assert result["related_queries"]["saas"] == []


def test_fetch_related_queries_empty_when_top_is_empty_df():
    """When top is an empty DataFrame, related_queries[keyword] should be []."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    df = pd.DataFrame({"saas": [50, 60]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {
        "saas": {"top": pd.DataFrame()},
    }

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["saas"])

    assert result["related_queries"]["saas"] == []


def test_fetch_related_queries_key_not_present():
    """When a keyword is not in related dict at all, related_queries[keyword] = []."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    df = pd.DataFrame({"ai": [10, 20]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {}  # no entry for "ai"

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["ai"])

    assert result["related_queries"]["ai"] == []


def test_fetch_caps_keywords_at_five():
    """_fetch should slice keywords to 5 before building payload."""
    import pandas as pd

    client = GoogleTrendsClient()

    pytrends = MagicMock()
    pytrends.interest_over_time.return_value = pd.DataFrame()
    pytrends.related_queries.return_value = {}

    keywords = [f"kw{i}" for i in range(10)]

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        client._fetch(keywords)

    call_args = pytrends.build_payload.call_args
    assert len(call_args.args[0]) == 5


def test_fetch_related_queries_capped_at_five_records():
    """Only first 5 related queries should be returned per keyword."""
    import pandas as pd

    client = GoogleTrendsClient()

    top_df = pd.DataFrame([{"query": f"q{i}", "value": 100 - i} for i in range(10)])

    pytrends = MagicMock()
    df = pd.DataFrame({"python": [60, 70]})
    pytrends.interest_over_time.return_value = df
    pytrends.related_queries.return_value = {"python": {"top": top_df}}

    with patch(_TRENDREQ_PATH, return_value=pytrends):
        result = client._fetch(["python"])

    assert len(result["related_queries"]["python"]) == 5
