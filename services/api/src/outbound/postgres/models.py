from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import BigInteger, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from outbound.postgres.database import Base


class TagRow(Base):
    __tablename__ = "tag"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)


class PostTagRow(Base):
    __tablename__ = "post_tag"

    post_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("post.id"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("tag.id"), primary_key=True
    )


class PostRow(Base):
    __tablename__ = "post"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
    external_created_at: Mapped[datetime] = mapped_column(nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    num_comments: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source: Mapped[str] = mapped_column(Text, nullable=False, default="reddit")
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    subreddit: Mapped[str | None] = mapped_column(Text, default=None)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str | None] = mapped_column(Text, default=None)
    external_url: Mapped[str] = mapped_column(Text, nullable=False)
    post_type: Mapped[str | None] = mapped_column(Text, default=None)
    sentiment: Mapped[str | None] = mapped_column(Text, default=None)
    tagging_status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")

    tags: Mapped[list[TagRow]] = relationship(
        "TagRow", secondary="post_tag", lazy="selectin"
    )


class ProductPostRow(Base):
    __tablename__ = "product_post"

    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("product.id"), primary_key=True
    )
    post_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("post.id"), primary_key=True
    )


class ProductTagRow(Base):
    __tablename__ = "product_tag"

    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("product.id"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("tag.id"), primary_key=True
    )


class ProductRow(Base):
    __tablename__ = "product"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
    launched_at: Mapped[datetime | None] = mapped_column(default=None)
    signal_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    trending_score: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=0
    )
    source: Mapped[str] = mapped_column(Text, nullable=False, default="producthunt")
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    tagline: Mapped[str | None] = mapped_column(Text, default=None)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    url: Mapped[str | None] = mapped_column(Text, default=None)
    image_url: Mapped[str | None] = mapped_column(Text, default=None)
    category: Mapped[str | None] = mapped_column(Text, default=None)

    tags: Mapped[list[TagRow]] = relationship(
        "TagRow", secondary="product_tag", lazy="selectin"
    )


class BriefRow(Base):
    __tablename__ = "brief"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(default=None)
    cluster_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("cluster.id"), default=None
    )
    source_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    upvote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    downvote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False)
    opportunity: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    demand_signals: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    solution_directions: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    source_snapshots: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )


class BriefSourceRow(Base):
    __tablename__ = "brief_source"

    brief_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("brief.id"), primary_key=True
    )
    post_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("post.id"), primary_key=True
    )
    snippet: Mapped[str | None] = mapped_column(Text, default=None)


class RatingRow(Base):
    __tablename__ = "rating"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    brief_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("brief.id"), nullable=False
    )
    is_positive: Mapped[bool] = mapped_column(nullable=False)
    session_id: Mapped[str] = mapped_column(Text, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text, default=None)


class ClusterRow(Base):
    __tablename__ = "cluster"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
    post_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")


class ClusterPostRow(Base):
    __tablename__ = "cluster_post"

    cluster_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("cluster.id"), primary_key=True
    )
    post_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("post.id"), primary_key=True
    )
