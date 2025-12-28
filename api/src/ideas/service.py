"""
Idea service for business logic and data access.

Handles idea listing, filtering, sorting, and pagination.
"""

import base64
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession

from src.categories.schemas import CategoryBadgeResponse
from src.ideas.schemas import (
    IdeaDetailResponse,
    IdeaListResponse,
    IdeaResponse,
    SortBy,
    TaxonomyResponse,
)


class IdeaService:
    """Service for idea-related business logic."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_ideas(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        sort_by: SortBy = SortBy.NEWEST,
        limit: int = 20,
        cursor: Optional[str] = None,
    ) -> IdeaListResponse:
        """List published ideas with filtering, sorting, and cursor-based pagination."""
        cursor_data = self._decode_cursor(cursor) if cursor else None

        query, params = self._build_list_query(
            search=search,
            category=category,
            sort_by=sort_by,
            limit=limit + 1,
            cursor_data=cursor_data,
        )

        result = await self.session.execute(text(query), params)
        rows = result.mappings().all()

        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]

        items = [self._row_to_idea_response(row) for row in rows]

        next_cursor = None
        if has_more and items:
            last_item = rows[-1]
            next_cursor = self._encode_cursor(last_item, sort_by)

        return IdeaListResponse(
            items=items,
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_idea_by_slug(self, slug: str) -> Optional[IdeaDetailResponse]:
        """Get a single idea by its slug."""
        query = """
            SELECT
                i.id,
                i.title,
                i.slug,
                i.image_url,
                i.image_alt,
                i.problem,
                i.solution,
                i.target_users,
                i.key_features,
                i.prd_content,
                i.popularity_score,
                i.view_count,
                i.is_published,
                i.published_at,
                i.created_at,
                i.updated_at,
                i.function_slug,
                i.industry_slug,
                i.target_user_slug,
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'label', c.name,
                            'variant', c.color_variant
                        )
                        ORDER BY c.display_order
                    ) FILTER (WHERE c.id IS NOT NULL),
                    '[]'::jsonb
                ) AS categories
            FROM ideas i
            LEFT JOIN idea_categories ic ON ic.idea_id = i.id
            LEFT JOIN categories c ON c.id = ic.category_id
            WHERE i.slug = :slug AND i.is_published = true
            GROUP BY i.id
        """

        result = await self.session.execute(text(query), {"slug": slug})
        row = result.mappings().first()

        if not row:
            return None

        return self._row_to_idea_detail_response(row)

    def _build_list_query(
        self,
        search: Optional[str],
        category: Optional[str],
        sort_by: SortBy,
        limit: int,
        cursor_data: Optional[dict],
    ) -> tuple[str, dict]:
        """Build the SQL query for listing ideas."""
        params: dict = {"limit": limit}

        base_select = """
            SELECT
                i.id,
                i.title,
                i.slug,
                i.image_url,
                i.image_alt,
                i.problem,
                i.solution,
                i.target_users,
                i.popularity_score,
                i.published_at,
                i.created_at,
                i.function_slug,
                i.industry_slug,
                i.target_user_slug,
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'label', c.name,
                            'variant', c.color_variant
                        )
                        ORDER BY c.display_order
                    ) FILTER (WHERE c.id IS NOT NULL),
                    '[]'::jsonb
                ) AS categories
            FROM ideas i
            LEFT JOIN idea_categories ic ON ic.idea_id = i.id
            LEFT JOIN categories c ON c.id = ic.category_id
        """

        where_clauses = ["i.is_published = true"]

        if category:
            where_clauses.append("""
                EXISTS (
                    SELECT 1 FROM idea_categories ic2
                    JOIN categories c2 ON c2.id = ic2.category_id
                    WHERE ic2.idea_id = i.id AND c2.slug = :category
                )
            """)
            params["category"] = category

        if search:
            where_clauses.append(
                "i.search_vector @@ plainto_tsquery('english', :search)"
            )
            params["search"] = search

        cursor_clause = self._build_cursor_clause(sort_by, cursor_data, params)
        if cursor_clause:
            where_clauses.append(cursor_clause)

        where_string = " WHERE " + " AND ".join(where_clauses)
        group_by = " GROUP BY i.id"
        order_by = self._get_order_by_clause(sort_by)

        query = f"{base_select}{where_string}{group_by}{order_by} LIMIT :limit"

        return query, params

    def _build_cursor_clause(
        self,
        sort_by: SortBy,
        cursor_data: Optional[dict],
        params: dict,
    ) -> Optional[str]:
        """Build cursor pagination WHERE clause."""
        if not cursor_data:
            return None

        if sort_by == SortBy.NEWEST:
            params["cursor_published_at"] = cursor_data["published_at"]
            params["cursor_id"] = cursor_data["id"]
            return "(i.published_at, i.id) < (:cursor_published_at, :cursor_id)"

        elif sort_by == SortBy.OLDEST:
            params["cursor_published_at"] = cursor_data["published_at"]
            params["cursor_id"] = cursor_data["id"]
            return "(i.published_at, i.id) > (:cursor_published_at, :cursor_id)"

        elif sort_by == SortBy.POPULAR:
            params["cursor_popularity"] = cursor_data["popularity_score"]
            params["cursor_published_at"] = cursor_data["published_at"]
            params["cursor_id"] = cursor_data["id"]
            return """
                (i.popularity_score, i.published_at, i.id) <
                (:cursor_popularity, :cursor_published_at, :cursor_id)
            """

        elif sort_by == SortBy.ALPHABETICAL:
            params["cursor_title"] = cursor_data["title"]
            params["cursor_id"] = cursor_data["id"]
            return "(i.title, i.id) > (:cursor_title, :cursor_id)"

        return None

    def _get_order_by_clause(self, sort_by: SortBy) -> str:
        """Get ORDER BY clause for the given sort option."""
        if sort_by == SortBy.NEWEST:
            return " ORDER BY i.published_at DESC, i.id DESC"
        elif sort_by == SortBy.OLDEST:
            return " ORDER BY i.published_at ASC, i.id ASC"
        elif sort_by == SortBy.POPULAR:
            return " ORDER BY i.popularity_score DESC, i.published_at DESC, i.id DESC"
        elif sort_by == SortBy.ALPHABETICAL:
            return " ORDER BY i.title ASC, i.id ASC"
        return " ORDER BY i.published_at DESC, i.id DESC"

    def _encode_cursor(self, row: RowMapping, sort_by: SortBy) -> str:
        """Encode pagination cursor from the last row."""
        cursor_data = {"id": row["id"]}

        if sort_by in (SortBy.NEWEST, SortBy.OLDEST):
            cursor_data["published_at"] = (
                row["published_at"].isoformat()
                if row["published_at"]
                else row["created_at"].isoformat()
            )
        elif sort_by == SortBy.POPULAR:
            cursor_data["popularity_score"] = row["popularity_score"]
            cursor_data["published_at"] = (
                row["published_at"].isoformat()
                if row["published_at"]
                else row["created_at"].isoformat()
            )
        elif sort_by == SortBy.ALPHABETICAL:
            cursor_data["title"] = row["title"]

        return base64.urlsafe_b64encode(json.dumps(cursor_data).encode()).decode()

    def _decode_cursor(self, cursor: str) -> Optional[dict]:
        """Decode pagination cursor string."""
        try:
            data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
            if "published_at" in data:
                data["published_at"] = datetime.fromisoformat(data["published_at"])
            return data
        except (ValueError, json.JSONDecodeError):
            return None

    def _row_to_idea_response(self, row: RowMapping) -> IdeaResponse:
        """Convert database row to IdeaResponse."""
        categories_data = row["categories"]
        if isinstance(categories_data, str):
            categories_data = json.loads(categories_data)

        categories = [
            CategoryBadgeResponse(label=cat["label"], variant=cat["variant"])
            for cat in categories_data
        ]

        # Build taxonomy response
        taxonomy = TaxonomyResponse(
            function_slug=row.get("function_slug", "create"),
            industry_slug=row.get("industry_slug"),
            target_user_slug=row.get("target_user_slug"),
        )

        created_at = row.get("published_at") or row["created_at"]
        created_at_str = (
            created_at.isoformat() + "Z"
            if not str(created_at).endswith("Z")
            else str(created_at)
        )

        return IdeaResponse(
            id=str(row["id"]),
            title=row["title"],
            slug=row["slug"],
            image_url=row["image_url"],
            image_alt=row["image_alt"],
            categories=categories,
            taxonomy=taxonomy,
            problem=row["problem"],
            solution=row["solution"],
            target_users=row["target_users"],
            created_at=created_at_str,
            popularity=row["popularity_score"],
        )

    def _row_to_idea_detail_response(self, row: RowMapping) -> IdeaDetailResponse:
        """Convert database row to IdeaDetailResponse with full details."""
        categories_data = row["categories"]
        if isinstance(categories_data, str):
            categories_data = json.loads(categories_data)

        categories = [
            CategoryBadgeResponse(label=cat["label"], variant=cat["variant"])
            for cat in categories_data
        ]

        # Build taxonomy response
        taxonomy = TaxonomyResponse(
            function_slug=row.get("function_slug", "create"),
            industry_slug=row.get("industry_slug"),
            target_user_slug=row.get("target_user_slug"),
        )

        key_features = row.get("key_features", [])
        if isinstance(key_features, str):
            key_features = json.loads(key_features)

        created_at = row.get("published_at") or row["created_at"]
        created_at_str = (
            created_at.isoformat() + "Z"
            if not str(created_at).endswith("Z")
            else str(created_at)
        )

        updated_at_str = (
            row["updated_at"].isoformat() + "Z"
            if not str(row["updated_at"]).endswith("Z")
            else str(row["updated_at"])
        )

        published_at_str = None
        if row.get("published_at"):
            published_at_str = (
                row["published_at"].isoformat() + "Z"
                if not str(row["published_at"]).endswith("Z")
                else str(row["published_at"])
            )

        return IdeaDetailResponse(
            id=str(row["id"]),
            title=row["title"],
            slug=row["slug"],
            image_url=row["image_url"],
            image_alt=row["image_alt"],
            categories=categories,
            taxonomy=taxonomy,
            problem=row["problem"],
            solution=row["solution"],
            target_users=row["target_users"],
            created_at=created_at_str,
            popularity=row["popularity_score"],
            key_features=key_features,
            prd_content=row.get("prd_content"),
            view_count=row.get("view_count", 0),
            published_at=published_at_str,
            updated_at=updated_at_str,
        )
