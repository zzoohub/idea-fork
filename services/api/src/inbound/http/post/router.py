from fastapi import APIRouter, Depends, Request, Response

from domain.post.models import PostListParams
from domain.post.service import PostService
from inbound.http.post.dependencies import get_post_list_params
from inbound.http.post.response import PostResponseData
from inbound.http.response import cache_collection, cache_detail, envelope
from shared.pagination import encode_cursor

router = APIRouter(prefix="/posts", tags=["posts"])

SORT_ATTR_MAP = {
    "-external_created_at": "external_created_at",
    "-score": "score",
    "-num_comments": "num_comments",
}


def _get_service(request: Request) -> PostService:
    return request.state.post_service


@router.get("")
async def list_posts(
    request: Request,
    response: Response,
    params: PostListParams = Depends(get_post_list_params),
):
    svc = _get_service(request)
    posts = await svc.list_posts(params)
    has_next = len(posts) > params.limit
    items = posts[: params.limit]

    meta: dict = {"has_next": has_next, "next_cursor": None}
    if has_next and items:
        last = items[-1]
        sort_attr = SORT_ATTR_MAP[params.sort]
        meta["next_cursor"] = encode_cursor(
            {"v": getattr(last, sort_attr), "id": last.id}
        )

    cache_collection(response)
    return envelope(
        [PostResponseData.from_domain(p).model_dump(mode="json") for p in items],
        meta=meta,
    )


@router.get("/{post_id}")
async def get_post(post_id: int, request: Request, response: Response):
    svc = _get_service(request)
    post = await svc.get_post(post_id)
    cache_detail(response)
    return envelope(PostResponseData.from_domain(post).model_dump(mode="json"))
