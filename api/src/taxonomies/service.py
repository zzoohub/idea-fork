"""
Service layer for taxonomy operations.
"""

from datetime import datetime
from typing import Any, Optional, cast

from sqlalchemy import CursorResult, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.taxonomies.models import (
    FUNCTION_TYPES_SEED,
    INDUSTRY_TYPES_SEED,
    TARGET_USER_TYPES_SEED,
    FunctionType,
    IndustryType,
    TargetUserType,
)


class TaxonomyService:
    """Service for managing taxonomies."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_active_functions(self) -> list[FunctionType]:
        """Get all active function types."""
        query = text("""
            SELECT id, slug, name, description, icon, display_order, is_active, deleted_at, created_at, updated_at
            FROM function_types
            WHERE is_active = true AND deleted_at IS NULL
            ORDER BY display_order
        """)
        result = await self.session.execute(query)
        rows = result.fetchall()
        return [
            FunctionType(
                id=row[0],
                slug=row[1],
                name=row[2],
                description=row[3],
                icon=row[4],
                display_order=row[5],
                is_active=row[6],
                deleted_at=row[7],
                created_at=row[8],
                updated_at=row[9],
            )
            for row in rows
        ]

    async def get_active_industries(self) -> list[IndustryType]:
        """Get all active industry types."""
        query = text("""
            SELECT id, slug, name, description, is_active, deleted_at, created_at, updated_at
            FROM industry_types
            WHERE is_active = true AND deleted_at IS NULL
            ORDER BY name
        """)
        result = await self.session.execute(query)
        rows = result.fetchall()
        return [
            IndustryType(
                id=row[0],
                slug=row[1],
                name=row[2],
                description=row[3],
                is_active=row[4],
                deleted_at=row[5],
                created_at=row[6],
                updated_at=row[7],
            )
            for row in rows
        ]

    async def get_active_target_users(self) -> list[TargetUserType]:
        """Get all active target user types."""
        query = text("""
            SELECT id, slug, name, description, is_active, deleted_at, created_at, updated_at
            FROM target_user_types
            WHERE is_active = true AND deleted_at IS NULL
            ORDER BY name
        """)
        result = await self.session.execute(query)
        rows = result.fetchall()
        return [
            TargetUserType(
                id=row[0],
                slug=row[1],
                name=row[2],
                description=row[3],
                is_active=row[4],
                deleted_at=row[5],
                created_at=row[6],
                updated_at=row[7],
            )
            for row in rows
        ]

    async def get_function_by_slug(self, slug: str) -> Optional[FunctionType]:
        """Get a function type by slug."""
        query = text("""
            SELECT id, slug, name, description, icon, display_order, is_active, deleted_at, created_at, updated_at
            FROM function_types
            WHERE slug = :slug AND deleted_at IS NULL
        """)
        result = await self.session.execute(query, {"slug": slug})
        row = result.fetchone()
        if not row:
            return None
        return FunctionType(
            id=row[0],
            slug=row[1],
            name=row[2],
            description=row[3],
            icon=row[4],
            display_order=row[5],
            is_active=row[6],
            deleted_at=row[7],
            created_at=row[8],
            updated_at=row[9],
        )

    async def soft_delete_function(self, slug: str) -> bool:
        """Soft delete a function type."""
        query = text("""
            UPDATE function_types
            SET is_active = false, deleted_at = :deleted_at, updated_at = :updated_at
            WHERE slug = :slug AND deleted_at IS NULL
        """)
        now = datetime.utcnow()
        result = cast(
            CursorResult[Any],
            await self.session.execute(
                query, {"slug": slug, "deleted_at": now, "updated_at": now}
            ),
        )
        await self.session.commit()
        return result.rowcount > 0
