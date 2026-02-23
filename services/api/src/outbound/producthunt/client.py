import logging
from datetime import datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from domain.pipeline.models import RawProduct

logger = logging.getLogger(__name__)

_PH_GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql"

_POSTS_QUERY = """\
query RecentProducts($first: Int!) {
  posts(first: $first, order: NEWEST) {
    edges {
      node {
        id
        name
        slug
        tagline
        description
        url
        createdAt
        topics(first: 1) {
          edges {
            node {
              name
            }
          }
        }
      }
    }
  }
}"""


class ProductHuntApiClient:
    def __init__(self, api_token: str) -> None:
        self._api_token = api_token

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
    async def fetch_recent_products(self, limit: int = 30) -> list[RawProduct]:
        if not self._api_token:
            logger.warning("PRODUCTHUNT_API_TOKEN not set, skipping PH fetch")
            return []

        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                _PH_GRAPHQL_URL,
                json={"query": _POSTS_QUERY, "variables": {"first": limit}},
                headers={
                    "Authorization": f"Bearer {self._api_token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()

        data = resp.json()
        edges = (
            data.get("data", {}).get("posts", {}).get("edges", [])
        )

        products: list[RawProduct] = []
        for edge in edges:
            node = edge.get("node", {})
            topics = node.get("topics", {}).get("edges", [])
            category = topics[0]["node"]["name"] if topics else None

            launched_at = None
            if node.get("createdAt"):
                try:
                    launched_at = datetime.fromisoformat(
                        node["createdAt"].replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    pass

            products.append(RawProduct(
                external_id=str(node["id"]),
                name=node.get("name", ""),
                slug=node.get("slug", ""),
                tagline=node.get("tagline"),
                description=node.get("description"),
                url=node.get("url"),
                category=category,
                launched_at=launched_at,
            ))

        logger.info("Fetched %d products from Product Hunt", len(products))
        return products
