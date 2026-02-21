import logging
import re
from datetime import UTC, datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from domain.pipeline.models import RawRedditPost

logger = logging.getLogger(__name__)

_PERMALINK_RE = re.compile(r"^/r/[A-Za-z0-9_]+/comments/[A-Za-z0-9_/]+$")


def _safe_permalink(permalink: str) -> str:
    if _PERMALINK_RE.match(permalink):
        return f"https://www.reddit.com{permalink}"
    return f"https://www.reddit.com/r/unknown/comments/{permalink.strip('/')}"

REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/access_token"
REDDIT_API_BASE = "https://oauth.reddit.com"


class RedditApiClient:
    def __init__(self, client_id: str, client_secret: str, user_agent: str) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._user_agent = user_agent
        self._access_token: str | None = None

    async def fetch_posts(
        self,
        subreddits: list[str],
        limit: int = 100,
        time_filter: str = "week",
    ) -> list[RawRedditPost]:
        async with httpx.AsyncClient(timeout=30) as http:
            await self._authenticate(http)

            posts: list[RawRedditPost] = []
            for subreddit in subreddits:
                sub_posts = await self._fetch_subreddit(
                    http, subreddit, limit, time_filter
                )
                posts.extend(sub_posts)
                logger.info("Fetched %d posts from r/%s", len(sub_posts), subreddit)

            return posts

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _authenticate(self, http: httpx.AsyncClient) -> None:
        resp = await http.post(
            REDDIT_AUTH_URL,
            auth=(self._client_id, self._client_secret),
            data={"grant_type": "client_credentials"},
            headers={"User-Agent": self._user_agent},
        )
        resp.raise_for_status()
        self._access_token = resp.json()["access_token"]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _fetch_subreddit(
        self,
        http: httpx.AsyncClient,
        subreddit: str,
        limit: int,
        time_filter: str,
    ) -> list[RawRedditPost]:
        resp = await http.get(
            f"{REDDIT_API_BASE}/r/{subreddit}/new",
            params={"limit": min(limit, 100), "t": time_filter},
            headers={
                "Authorization": f"Bearer {self._access_token}",
                "User-Agent": self._user_agent,
            },
        )
        resp.raise_for_status()

        posts: list[RawRedditPost] = []
        for child in resp.json().get("data", {}).get("children", []):
            data = child.get("data", {})
            posts.append(
                RawRedditPost(
                    external_id=data["id"],
                    subreddit=data.get("subreddit", subreddit),
                    title=data.get("title", ""),
                    body=data.get("selftext") or None,
                    external_url=_safe_permalink(data.get("permalink", "")),
                    external_created_at=datetime.fromtimestamp(
                        data.get("created_utc", 0), tz=UTC
                    ),
                    score=data.get("score", 0),
                    num_comments=data.get("num_comments", 0),
                )
            )
        return posts
