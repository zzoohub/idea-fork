import asyncio
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

_MIN_INTERVAL_SECS = 5.0


class GoogleTrendsClient:
    def __init__(self) -> None:
        self._last_call: float = 0.0
        self._lock = asyncio.Lock()

    async def get_interest(self, keywords: list[str]) -> dict[str, Any]:
        try:
            async with self._lock:
                # Rate-limit: wait if needed to respect Google's limits
                elapsed = time.monotonic() - self._last_call
                if elapsed < _MIN_INTERVAL_SECS:
                    await asyncio.sleep(_MIN_INTERVAL_SECS - elapsed)
                self._last_call = time.monotonic()
                return await asyncio.to_thread(self._fetch, keywords)
        except Exception:
            logger.warning("Google Trends fetch failed for %s (skipped)", keywords)
            return {}

    def _fetch(self, keywords: list[str]) -> dict[str, Any]:
        from pytrends.request import TrendReq

        pytrends = TrendReq(hl="en-US")
        kw = keywords[:5]
        pytrends.build_payload(kw, timeframe="today 3-m")

        interest = pytrends.interest_over_time()
        related = pytrends.related_queries()

        result: dict[str, Any] = {
            "avg_interest": {},
            "related_queries": {},
            "trend_direction": {},
        }

        for k in kw:
            if k in interest.columns:
                result["avg_interest"][k] = float(interest[k].mean())
                result["trend_direction"][k] = (
                    "rising"
                    if interest[k].iloc[-1] > interest[k].iloc[0]
                    else "declining"
                )

            top_queries = related.get(k, {}).get("top")
            if top_queries is not None and not top_queries.empty:
                result["related_queries"][k] = top_queries.to_dict("records")[:5]
            else:
                result["related_queries"][k] = []

        return result
