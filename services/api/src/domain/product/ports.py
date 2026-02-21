from typing import Protocol

from domain.post.models import Post
from domain.product.models import Product, ProductListParams


class ProductRepository(Protocol):
    async def list_products(self, params: ProductListParams) -> list[Product]: ...

    async def get_product_by_slug(self, slug: str) -> Product | None: ...

    async def get_product_posts(
        self, product_id: int, limit: int = 10
    ) -> list[Post]: ...
