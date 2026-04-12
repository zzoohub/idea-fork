from fastapi import APIRouter, Depends, Request, Response

from domain.product.models import ProductListParams
from inbound.http.dependencies import service_dep
from inbound.http.product.dependencies import get_product_list_params
from inbound.http.product.response import (
    ProductListResponseData,
    ProductMetricsResponseData,
    ProductPostResponseData,
    RelatedBriefResponseData,
)
from inbound.http.response import cache_collection, cache_detail, envelope
from shared.pagination import encode_cursor, paginate

router = APIRouter(prefix="/products", tags=["products"])

SORT_ATTR_MAP = {
    "-trending_score": "trending_score",
    "-signal_count": "signal_count",
    "-launched_at": "launched_at",
}

_get_service = service_dep("product_service")


@router.get("")
async def list_products(
    request: Request,
    response: Response,
    params: ProductListParams = Depends(get_product_list_params),
):
    svc = _get_service(request)
    products = await svc.list_products(params)
    page = paginate(products, limit=params.limit, sort_attr=SORT_ATTR_MAP[params.sort])

    cache_collection(response)
    return envelope(
        [ProductListResponseData.from_domain(p).model_dump(mode="json") for p in page.items],
        meta={"has_next": page.has_next, "next_cursor": page.next_cursor},
    )


@router.get("/{slug}")
async def get_product(slug: str, request: Request, response: Response):
    svc = _get_service(request)
    posts_limit = 10
    product, posts, metrics, related_briefs = await svc.get_product_by_slug(slug, posts_limit)
    posts_has_next = len(posts) > posts_limit
    post_items = posts[:posts_limit]

    data = ProductListResponseData.from_domain(product).model_dump(mode="json")
    data["metrics"] = ProductMetricsResponseData.from_domain(metrics).model_dump(
        mode="json"
    )
    data["posts"] = [
        ProductPostResponseData.from_domain(p).model_dump(mode="json")
        for p in post_items
    ]
    data["related_briefs"] = [
        RelatedBriefResponseData.from_domain(b).model_dump(mode="json")
        for b in related_briefs
    ]

    meta: dict = {"posts_has_next": posts_has_next, "posts_cursor": None}
    if posts_has_next and post_items:
        last = post_items[-1]
        meta["posts_cursor"] = encode_cursor({"v": last.id, "id": last.id})

    cache_detail(response)
    return envelope(data, meta=meta)
