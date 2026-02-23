import asyncio
import logging
import re
from datetime import UTC, datetime, timedelta

from domain.pipeline.models import RawPost, RawProduct

logger = logging.getLogger(__name__)

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = _SLUG_RE.sub("-", slug)
    return slug.strip("-")


def _parse_released(raw: str | None) -> datetime | None:
    """Parse the 'released' field from gps.app() detail, e.g. 'Jan 1, 2024'."""
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%b %d, %Y").replace(tzinfo=UTC)
    except (ValueError, TypeError):
        return None


class PlayStoreClient:
    async def search_apps(
        self, keywords: list[str], limit: int = 20, max_age_days: int = 365
    ) -> list[RawProduct]:
        import google_play_scraper as gps

        products: list[RawProduct] = []
        seen: set[str] = set()
        cutoff = datetime.now(UTC) - timedelta(days=max_age_days)
        fetch_limit = limit * 3

        for keyword in keywords:
            try:
                results = await asyncio.to_thread(
                    gps.search, keyword, n_hits=fetch_limit
                )
                for item in results:
                    app_id = item.get("appId", "")
                    if app_id in seen:
                        continue
                    seen.add(app_id)

                    # Fetch detail to get released date
                    try:
                        detail = await asyncio.to_thread(gps.app, app_id)
                        await asyncio.sleep(0.5)
                    except Exception:
                        logger.warning(
                            "Play Store detail fetch failed for %s, skipping",
                            app_id,
                        )
                        continue

                    released = _parse_released(detail.get("released"))
                    if released is None:
                        logger.warning(
                            "No released date for %s, skipping", app_id
                        )
                        continue

                    if released < cutoff:
                        continue

                    products.append(
                        RawProduct(
                            external_id=app_id,
                            name=item.get("title", ""),
                            slug=f"{_slugify(item.get('title', ''))}-{_slugify(app_id)}",
                            tagline=None,
                            description=item.get("description"),
                            url=f"https://play.google.com/store/apps/details?id={app_id}",
                            category=item.get("genre"),
                            launched_at=released,
                            image_url=item.get("icon"),
                            source="play_store",
                        )
                    )

                    if len(products) >= limit:
                        break
            except Exception:
                logger.exception("Play Store search failed for %r", keyword)
            await asyncio.sleep(1.0)

            if len(products) >= limit:
                break

        products = products[:limit]
        logger.info("Found %d recent apps from Play Store", len(products))
        return products

    async def fetch_reviews(
        self, app_id: str, count: int = 100
    ) -> list[RawPost]:
        import google_play_scraper as gps

        try:
            reviews, _ = await asyncio.to_thread(
                gps.reviews, app_id, count=count
            )
        except Exception:
            logger.exception("Play Store review fetch failed for %s", app_id)
            return []

        posts: list[RawPost] = []
        for review in reviews:
            review_id = review.get("reviewId", "")
            body = review.get("content", "")
            score = review.get("score", 0)
            at = review.get("at")
            if isinstance(at, datetime):
                created_at = at.replace(tzinfo=UTC) if at.tzinfo is None else at
            else:
                created_at = datetime.now(UTC)

            posts.append(
                RawPost(
                    source="play_store",
                    external_id=f"playstore-{app_id}-{review_id}",
                    title="",
                    body=body or None,
                    external_url=f"https://play.google.com/store/apps/details?id={app_id}",
                    external_created_at=created_at,
                    score=score,
                    num_comments=0,
                )
            )

        logger.info("Fetched %d reviews for app %s", len(posts), app_id)
        return posts
