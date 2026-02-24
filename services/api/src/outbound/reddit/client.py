import asyncio
import logging
import re
from datetime import UTC, datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from domain.pipeline.models import RawPost

logger = logging.getLogger(__name__)

_PERMALINK_RE = re.compile(r"^/r/[A-Za-z0-9_]+/comments/[A-Za-z0-9_/]+$")
_SUBREDDIT_RE = re.compile(r"^[A-Za-z0-9_]{1,50}$")


def _safe_permalink(permalink: str) -> str:
    if _PERMALINK_RE.match(permalink):
        return f"https://www.reddit.com{permalink}"
    return f"https://www.reddit.com/r/unknown/comments/{permalink.strip('/')}"


REDDIT_PUBLIC_BASE = "https://www.reddit.com"


class RedditApiClient:
    def __init__(self, user_agent: str) -> None:
        self._user_agent = user_agent

    async def fetch_posts(
        self,
        subreddits: list[str],
        limit: int = 100,
        time_filter: str = "week",
    ) -> list[RawPost]:
        for name in subreddits:
            if not _SUBREDDIT_RE.match(name):
                raise ValueError(f"Invalid subreddit name: {name!r}")
        async with httpx.AsyncClient(timeout=30) as http:
            posts: list[RawPost] = []
            for subreddit in subreddits:
                sub_posts = await self._fetch_subreddit(
                    http, subreddit, limit, time_filter
                )
                posts.extend(sub_posts)
                logger.info("Fetched %d posts from r/%s", len(sub_posts), subreddit)
                await asyncio.sleep(2)

            return posts

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _fetch_subreddit(
        self,
        http: httpx.AsyncClient,
        subreddit: str,
        limit: int,
        time_filter: str,
    ) -> list[RawPost]:
        resp = await http.get(
            f"{REDDIT_PUBLIC_BASE}/r/{subreddit}/new.json",
            params={"limit": min(limit, 100), "t": time_filter},
            headers={"User-Agent": self._user_agent},
        )
        resp.raise_for_status()

        posts: list[RawPost] = []
        for child in resp.json().get("data", {}).get("children", []):
            data = child.get("data", {})
            posts.append(
                RawPost(
                    source="reddit",
                    external_id=data["id"],
                    title=data.get("title", ""),
                    body=data.get("selftext") or None,
                    external_url=_safe_permalink(data.get("permalink", "")),
                    external_created_at=datetime.fromtimestamp(
                        data.get("created_utc", 0), tz=UTC
                    ),
                    score=data.get("score", 0),
                    num_comments=data.get("num_comments", 0),
                    subreddit=data.get("subreddit", subreddit),
                )
            )
        return posts
