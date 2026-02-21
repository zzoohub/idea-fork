from domain.brief.models import Brief
from domain.post.models import Post, PostTag
from domain.product.models import Product
from domain.rating.models import Rating
from domain.tag.models import Tag
from outbound.postgres.models import (
    BriefRow,
    PostRow,
    ProductRow,
    RatingRow,
    TagRow,
)


def tag_to_domain(row: TagRow) -> Tag:
    return Tag(id=row.id, slug=row.slug, name=row.name)


def post_to_domain(row: PostRow) -> Post:
    return Post(
        id=row.id,
        title=row.title,
        body=row.body,
        source=row.source,
        subreddit=row.subreddit,
        external_url=row.external_url,
        external_created_at=row.external_created_at,
        score=row.score,
        num_comments=row.num_comments,
        post_type=row.post_type,
        sentiment=row.sentiment,
        tags=[PostTag(slug=t.slug, name=t.name) for t in row.tags],
    )


def post_to_domain_no_tags(row: PostRow) -> Post:
    return Post(
        id=row.id,
        title=row.title,
        body=row.body,
        source=row.source,
        subreddit=row.subreddit,
        external_url=row.external_url,
        external_created_at=row.external_created_at,
        score=row.score,
        num_comments=row.num_comments,
        post_type=row.post_type,
        sentiment=row.sentiment,
        tags=[],
    )


def brief_to_domain(row: BriefRow) -> Brief:
    return Brief(
        id=row.id,
        slug=row.slug,
        title=row.title,
        summary=row.summary,
        problem_statement=row.problem_statement,
        opportunity=row.opportunity,
        status=row.status,
        published_at=row.published_at,
        source_count=row.source_count,
        upvote_count=row.upvote_count,
        downvote_count=row.downvote_count,
        demand_signals=row.demand_signals,
        solution_directions=row.solution_directions,
        source_snapshots=row.source_snapshots,
    )


def product_to_domain(row: ProductRow) -> Product:
    return Product(
        id=row.id,
        slug=row.slug,
        name=row.name,
        description=row.description,
        url=row.url,
        image_url=row.image_url,
        category=row.category,
        complaint_count=row.complaint_count,
        trending_score=float(row.trending_score),
    )


def rating_to_domain(row: RatingRow) -> Rating:
    return Rating(
        id=row.id,
        brief_id=row.brief_id,
        is_positive=row.is_positive,
        feedback=row.feedback,
        created_at=row.created_at,
    )
