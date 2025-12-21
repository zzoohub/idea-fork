"""
Repository for idea database operations.

Provides CRUD operations for ideas and categories.
"""

from datetime import datetime, timezone
from typing import Optional

from slugify import slugify
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_logger

logger = get_logger(__name__)


class IdeaRepository:
    """Repository for idea CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_idea(
        self,
        title: str,
        problem: str,
        solution: str,
        target_users: str,
        key_features: list[str],
        prd_content: dict,
        category_slugs: list[str],
        image_url: str = "",
        image_alt: str = "",
        is_published: bool = False,
    ) -> int:
        """Create a new idea with categories.

        Args:
            title: Idea title
            problem: Problem statement
            solution: Proposed solution
            target_users: Target user description
            key_features: List of key features
            prd_content: Full PRD content as dict
            category_slugs: List of category slugs to associate
            image_url: Thumbnail image URL
            image_alt: Image alt text
            is_published: Whether to publish immediately

        Returns:
            The created idea ID
        """
        # Generate unique slug
        base_slug = slugify(title)
        slug = await self._generate_unique_slug(base_slug)

        # Set published_at if publishing
        published_at = datetime.now(timezone.utc) if is_published else None

        # Insert idea using raw SQL for simplicity
        # This avoids importing the model from api-server
        insert_query = text("""
            INSERT INTO ideas (
                title, slug, image_url, image_alt,
                problem, solution, target_users,
                key_features, prd_content,
                popularity_score, view_count,
                is_published, published_at,
                created_at, updated_at
            ) VALUES (
                :title, :slug, :image_url, :image_alt,
                :problem, :solution, :target_users,
                :key_features::jsonb, :prd_content::jsonb,
                0, 0,
                :is_published, :published_at,
                NOW(), NOW()
            )
            RETURNING id
        """)

        import json

        result = await self.session.execute(
            insert_query,
            {
                "title": title,
                "slug": slug,
                "image_url": image_url,
                "image_alt": image_alt,
                "problem": problem,
                "solution": solution,
                "target_users": target_users,
                "key_features": json.dumps(key_features),
                "prd_content": json.dumps(prd_content),
                "is_published": is_published,
                "published_at": published_at,
            },
        )

        idea_id = result.scalar_one()
        logger.info(f"Created idea with ID {idea_id}: {title}")

        # Associate categories
        if category_slugs:
            await self._associate_categories(idea_id, category_slugs)

        return idea_id

    async def _generate_unique_slug(self, base_slug: str) -> str:
        """Generate a unique slug, appending number if necessary."""
        slug = base_slug
        counter = 1

        while True:
            check_query = text("SELECT EXISTS(SELECT 1 FROM ideas WHERE slug = :slug)")
            result = await self.session.execute(check_query, {"slug": slug})
            exists = result.scalar()

            if not exists:
                return slug

            slug = f"{base_slug}-{counter}"
            counter += 1

    async def _associate_categories(
        self, idea_id: int, category_slugs: list[str]
    ) -> None:
        """Associate an idea with categories by their slugs."""
        # Get category IDs from slugs
        query = text("""
            SELECT id, slug FROM categories WHERE slug = ANY(:slugs)
        """)
        result = await self.session.execute(query, {"slugs": category_slugs})
        categories = result.fetchall()

        if not categories:
            logger.warning(f"No matching categories found for slugs: {category_slugs}")
            return

        # Insert associations
        for cat_id, cat_slug in categories:
            insert_query = text("""
                INSERT INTO idea_categories (idea_id, category_id, created_at)
                VALUES (:idea_id, :category_id, NOW())
                ON CONFLICT DO NOTHING
            """)
            await self.session.execute(
                insert_query,
                {"idea_id": idea_id, "category_id": cat_id},
            )
            logger.debug(f"Associated idea {idea_id} with category {cat_slug}")

    async def get_all_category_slugs(self) -> list[str]:
        """Get all available category slugs."""
        query = text("SELECT slug FROM categories ORDER BY display_order")
        result = await self.session.execute(query)
        return [row[0] for row in result.fetchall()]

    async def idea_exists_with_title(self, title: str) -> bool:
        """Check if an idea with similar title already exists."""
        # Use similarity check to avoid near-duplicates
        query = text("""
            SELECT EXISTS(
                SELECT 1 FROM ideas
                WHERE LOWER(title) = LOWER(:title)
                OR similarity(LOWER(title), LOWER(:title)) > 0.8
            )
        """)
        try:
            result = await self.session.execute(query, {"title": title})
            return result.scalar()
        except Exception:
            # Fallback to exact match if pg_trgm not available
            query = text("""
                SELECT EXISTS(
                    SELECT 1 FROM ideas WHERE LOWER(title) = LOWER(:title)
                )
            """)
            result = await self.session.execute(query, {"title": title})
            return result.scalar()
