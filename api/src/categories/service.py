"""
Category service for business logic and data access.

Handles category listing and retrieval.
"""

from typing import Optional

from sqlalchemy import text
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession

from src.categories.schemas import CategoryResponse


class CategoryService:
    """Service for category-related business logic."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_categories(self) -> list[CategoryResponse]:
        """List all categories ordered by display_order."""
        query = """
            SELECT
                id,
                name,
                slug,
                color_variant,
                display_order,
                created_at,
                updated_at
            FROM categories
            ORDER BY display_order ASC, name ASC
        """

        result = await self.session.execute(text(query))
        rows = result.mappings().all()

        return [self._row_to_category_response(row) for row in rows]

    async def get_category_by_slug(self, slug: str) -> Optional[CategoryResponse]:
        """Get a single category by its slug."""
        query = """
            SELECT
                id,
                name,
                slug,
                color_variant,
                display_order,
                created_at,
                updated_at
            FROM categories
            WHERE slug = :slug
        """

        result = await self.session.execute(text(query), {"slug": slug})
        row = result.mappings().first()

        if not row:
            return None

        return self._row_to_category_response(row)

    def _row_to_category_response(self, row: RowMapping) -> CategoryResponse:
        """Convert database row to CategoryResponse."""
        return CategoryResponse(
            id=row["id"],
            name=row["name"],
            slug=row["slug"],
            color_variant=row["color_variant"],
            display_order=row["display_order"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
