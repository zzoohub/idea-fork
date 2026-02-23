import asyncio
import logging
import re
from datetime import UTC, datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from domain.pipeline.models import RawPost, RawProduct

logger = logging.getLogger(__name__)

_ITUNES_SEARCH_URL = "https://itunes.apple.com/search"
_ITUNES_REVIEWS_URL = (
    "https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={app_id}/json"
)
_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = _SLUG_RE.sub("-", slug)
    return slug.strip("-")


class AppStoreClient:
    async def search_apps(
        self, keywords: list[str], limit: int = 20
    ) -> list[RawProduct]:
        products: list[RawProduct] = []
        seen: set[str] = set()

        async with httpx.AsyncClient(timeout=30) as http:
            for keyword in keywords:
                try:
                    items = await self._search(http, keyword, limit)
                    for item in items:
                        ext_id = str(item.get("trackId", ""))
                        if ext_id in seen:
                            continue
                        seen.add(ext_id)
                        products.append(
                            RawProduct(
                                external_id=ext_id,
                                name=item.get("trackName", ""),
                                slug=f"{_slugify(item.get('trackName', ''))}-{ext_id}",
                                tagline=None,
                                description=item.get("description"),
                                url=item.get("trackViewUrl"),
                                category=item.get("primaryGenreName"),
                                launched_at=None,
                                image_url=item.get("artworkUrl512")
                                or item.get("artworkUrl100"),
                                source="app_store",
                            )
                        )
                except Exception:
                    logger.exception("App Store search failed for %r", keyword)
                await asyncio.sleep(0.5)

        logger.info("Found %d apps from App Store", len(products))
        return products

    async def fetch_reviews(
        self, app_id: str, country: str = "us", pages: int = 3
    ) -> list[RawPost]:
        posts: list[RawPost] = []
        async with httpx.AsyncClient(timeout=30) as http:
            for page in range(1, pages + 1):
                try:
                    page_posts = await self._fetch_review_page(
                        http, app_id, country, page
                    )
                    posts.extend(page_posts)
                except Exception:
                    logger.exception(
                        "App Store review fetch failed for app %s page %d",
                        app_id,
                        page,
                    )
                await asyncio.sleep(0.5)

        logger.info("Fetched %d reviews for app %s", len(posts), app_id)
        return posts

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _search(
        self, http: httpx.AsyncClient, keyword: str, limit: int
    ) -> list[dict]:
        resp = await http.get(
            _ITUNES_SEARCH_URL,
            params={
                "term": keyword,
                "entity": "software",
                "limit": min(limit, 200),
            },
        )
        resp.raise_for_status()
        return resp.json().get("results", [])

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def _fetch_review_page(
        self,
        http: httpx.AsyncClient,
        app_id: str,
        country: str,
        page: int,
    ) -> list[RawPost]:
        url = _ITUNES_REVIEWS_URL.format(
            country=country, page=page, app_id=app_id
        )
        resp = await http.get(url)
        resp.raise_for_status()

        data = resp.json()
        entries = data.get("feed", {}).get("entry", [])

        posts: list[RawPost] = []
        for entry in entries:
            # Skip the first entry if it's the app metadata
            if "im:rating" not in entry:
                continue

            title = ""
            if isinstance(entry.get("title"), dict):
                title = entry["title"].get("label", "")
            elif isinstance(entry.get("title"), str):
                title = entry["title"]

            body = ""
            if isinstance(entry.get("content"), dict):
                body = entry["content"].get("label", "")
            elif isinstance(entry.get("content"), str):
                body = entry["content"]

            rating = 0
            if isinstance(entry.get("im:rating"), dict):
                rating = int(entry["im:rating"].get("label", "0"))
            elif isinstance(entry.get("im:rating"), str):
                rating = int(entry["im:rating"])

            ext_id = ""
            if isinstance(entry.get("id"), dict):
                ext_id = entry["id"].get("label", "")
            elif isinstance(entry.get("id"), str):
                ext_id = entry["id"]

            updated = datetime.now(UTC)
            if isinstance(entry.get("updated"), dict):
                date_str = entry["updated"].get("label", "")
                if date_str:
                    try:
                        updated = datetime.fromisoformat(
                            date_str.replace("Z", "+00:00")
                        )
                    except (ValueError, TypeError):
                        pass

            posts.append(
                RawPost(
                    source="app_store",
                    external_id=f"appstore-{app_id}-{ext_id}",
                    title=title,
                    body=body or None,
                    external_url=f"https://apps.apple.com/app/id{app_id}",
                    external_created_at=updated,
                    score=rating,
                    num_comments=0,
                )
            )

        return posts
