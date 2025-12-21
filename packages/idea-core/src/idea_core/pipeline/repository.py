"""
Repository for idea database operations.

Provides CRUD operations for ideas and categories in the shared pipeline.
"""

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from slugify import slugify
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from idea_core.pipeline.config import get_settings

logger = logging.getLogger(__name__)

# Module-level engine (lazily initialized)
_engine = None
_session_maker = None


def _get_engine():
    """Get or create the database engine."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            echo=False,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
    return _engine


def _get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Get or create the session maker."""
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(
            _get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_maker


@asynccontextmanager
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get an async database session."""
    session_maker = _get_session_maker()
    async with session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


class IdeaCoreRepository:
    """Repository for idea CRUD operations in the shared pipeline."""

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
        user_id: Optional[str] = None,
        forked_from_id: Optional[str] = None,
        image_url: str = "",
        image_alt: str = "",
        is_published: bool = False,
    ) -> tuple[int, str]:
        """Create a new idea with categories.

        Args:
            title: Idea title
            problem: Problem statement
            solution: Proposed solution
            target_users: Target user description
            key_features: List of key features
            prd_content: Full PRD content as dict
            category_slugs: List of category slugs to associate
            user_id: Optional user ID who created this idea
            forked_from_id: Optional ID of idea this was forked from
            image_url: Thumbnail image URL
            image_alt: Image alt text
            is_published: Whether to publish immediately

        Returns:
            Tuple of (idea_id, idea_slug)
        """
        # Generate unique slug
        base_slug = slugify(title)
        slug = await self._generate_unique_slug(base_slug)

        # Set published_at if publishing
        published_at = datetime.now(timezone.utc) if is_published else None

        # Insert idea using raw SQL
        insert_query = text("""
            INSERT INTO ideas (
                title, slug, image_url, image_alt,
                problem, solution, target_users,
                key_features, prd_content,
                popularity_score, view_count,
                is_published, published_at,
                created_by_id, forked_from_id,
                created_at, updated_at
            ) VALUES (
                :title, :slug, :image_url, :image_alt,
                :problem, :solution, :target_users,
                :key_features::jsonb, :prd_content::jsonb,
                0, 0,
                :is_published, :published_at,
                :created_by_id, :forked_from_id,
                NOW(), NOW()
            )
            RETURNING id, slug
        """)

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
                "created_by_id": user_id,
                "forked_from_id": forked_from_id,
            },
        )

        row = result.fetchone()
        idea_id = row[0]
        idea_slug = row[1]
        logger.info(f"Created idea with ID {idea_id}: {title}")

        # Associate categories
        if category_slugs:
            await self._associate_categories(idea_id, category_slugs)

        return idea_id, idea_slug

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

    async def _associate_categories(self, idea_id: int, category_slugs: list[str]) -> None:
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

    async def get_idea_by_id(self, idea_id: str) -> Optional[dict]:
        """Get an idea by its ID for forking."""
        query = text("""
            SELECT
                id, title, slug, problem, solution,
                target_users, key_features, prd_content
            FROM ideas
            WHERE id = :idea_id
        """)
        result = await self.session.execute(query, {"idea_id": idea_id})
        row = result.fetchone()

        if not row:
            return None

        key_features = row[6]
        if isinstance(key_features, str):
            key_features = json.loads(key_features)

        prd_content = row[7]
        if isinstance(prd_content, str):
            prd_content = json.loads(prd_content)

        return {
            "id": str(row[0]),
            "title": row[1],
            "slug": row[2],
            "problem": row[3],
            "solution": row[4],
            "target_users": row[5],
            "key_features": key_features,
            "prd_content": prd_content,
        }

    async def get_idea_by_slug(self, slug: str) -> Optional[dict]:
        """Get an idea by its slug for forking."""
        query = text("""
            SELECT
                id, title, slug, problem, solution,
                target_users, key_features, prd_content
            FROM ideas
            WHERE slug = :slug
        """)
        result = await self.session.execute(query, {"slug": slug})
        row = result.fetchone()

        if not row:
            return None

        key_features = row[6]
        if isinstance(key_features, str):
            key_features = json.loads(key_features)

        prd_content = row[7]
        if isinstance(prd_content, str):
            prd_content = json.loads(prd_content)

        return {
            "id": str(row[0]),
            "title": row[1],
            "slug": row[2],
            "problem": row[3],
            "solution": row[4],
            "target_users": row[5],
            "key_features": key_features,
            "prd_content": prd_content,
        }
