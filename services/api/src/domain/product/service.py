from domain.post.models import Post
from domain.product.errors import ProductNotFoundError
from domain.product.models import Product, ProductListParams, ProductMetrics, RelatedBrief
from domain.product.ports import ProductRepository


class ProductService:
    def __init__(self, repo: ProductRepository) -> None:
        self._repo = repo

    async def list_products(self, params: ProductListParams) -> list[Product]:
        return await self._repo.list_products(params)

    async def get_product_by_slug(
        self, slug: str, posts_limit: int = 10
    ) -> tuple[Product, list[Post], ProductMetrics, list[RelatedBrief]]:
        product = await self._repo.get_product_by_slug(slug)
        if product is None:
            raise ProductNotFoundError(slug)
        posts = await self._repo.get_product_posts(product.id, posts_limit)
        metrics = await self._repo.get_product_metrics(product.id)
        related_briefs = await self._repo.get_related_briefs(product.id)
        return product, posts, metrics, related_briefs
