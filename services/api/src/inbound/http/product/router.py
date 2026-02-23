from fastapi import APIRouter, Depends, Request, Response

from domain.product.models import ProductListParams
from domain.product.service import ProductService
from inbound.http.product.dependencies import get_product_list_params
from inbound.http.product.response import (
    ProductListResponseData,
    ProductMetricsResponseData,
    ProductPostResponseData,
)
from inbound.http.response import cache_collection, cache_detail, envelope
from shared.pagination import encode_cursor

router = APIRouter(prefix="/products", tags=["products"])

SORT_ATTR_MAP = {
    "-trending_score": "trending_score",
    "-complaint_count": "complaint_count",
}


def _get_service(request: Request) -> ProductService:
    return request.state.product_service


@router.get("")
async def list_products(
    request: Request,
    response: Response,
    params: ProductListParams = Depends(get_product_list_params),
):
    svc = _get_service(request)
    products = await svc.list_products(params)
    has_next = len(products) > params.limit
    items = products[: params.limit]

    meta: dict = {"has_next": has_next, "next_cursor": None}
    if has_next and items:
        last = items[-1]
        sort_attr = SORT_ATTR_MAP[params.sort]
        meta["next_cursor"] = encode_cursor(
            {"v": getattr(last, sort_attr), "id": last.id}
        )

    cache_collection(response)
    return envelope(
        [ProductListResponseData.from_domain(p).model_dump(mode="json") for p in items],
        meta=meta,
    )


@router.get("/{slug}")
async def get_product(slug: str, request: Request, response: Response):
    svc = _get_service(request)
    posts_limit = 10
    product, posts, metrics = await svc.get_product_by_slug(slug, posts_limit)
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

    meta: dict = {"posts_has_next": posts_has_next, "posts_cursor": None}
    if posts_has_next and post_items:
        last = post_items[-1]
        meta["posts_cursor"] = encode_cursor({"v": last.id, "id": last.id})

    cache_detail(response)
    return envelope(data, meta=meta)
