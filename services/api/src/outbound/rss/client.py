import hashlib
import logging
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

import feedparser
import httpx

from domain.pipeline.models import RawPost

logger = logging.getLogger(__name__)

_ALLOWED_SCHEMES = {"http", "https"}


def _is_safe_url(url: str) -> bool:
    """Reject non-HTTP(S) schemes and private/internal hosts."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    if parsed.scheme not in _ALLOWED_SCHEMES:
        return False
    host = parsed.hostname or ""
    if not host:
        return False
    # Block private/loopback addresses
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        return False
    if host.startswith("10.") or host.startswith("192.168."):
        return False
    if host.startswith("172."):
        parts = host.split(".")
        if len(parts) >= 2 and parts[1].isdigit() and 16 <= int(parts[1]) <= 31:
            return False
    if host.endswith(".local") or host.endswith(".internal"):
        return False
    return True


class RssFeedClient:
    async def fetch_posts(self, feed_urls: list[str]) -> list[RawPost]:
        posts: list[RawPost] = []
        async with httpx.AsyncClient(timeout=15, max_redirects=3) as http:
            for url in feed_urls:
                if not _is_safe_url(url):
                    logger.warning("Skipping unsafe RSS feed URL: %s", url)
                    continue
                try:
                    resp = await http.get(url)
                    resp.raise_for_status()
                    feed = feedparser.parse(resp.text)
                    for entry in feed.entries[:20]:
                        link = entry.get("link", "")
                        external_id = hashlib.sha256(
                            link.encode()
                        ).hexdigest()

                        published = _parse_published(entry)

                        posts.append(RawPost(
                            source="rss",
                            external_id=external_id,
                            title=entry.get("title", ""),
                            body=entry.get("summary"),
                            external_url=link,
                            external_created_at=published,
                            score=0,
                            num_comments=0,
                        ))
                    logger.info(
                        "Fetched %d entries from RSS feed %s",
                        min(len(feed.entries), 20),
                        url,
                    )
                except Exception:
                    logger.exception("Failed to fetch RSS feed %s", url)
        return posts


def _parse_published(entry) -> datetime:
    published_str = entry.get("published") or entry.get("updated")
    if published_str:
        try:
            return parsedate_to_datetime(published_str)
        except (TypeError, ValueError):
            pass
    return datetime.now(UTC)
