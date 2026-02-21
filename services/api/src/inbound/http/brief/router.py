from fastapi import APIRouter, Depends, Request, Response

from domain.brief.models import BriefListParams
from domain.brief.service import BriefService
from inbound.http.brief.dependencies import get_brief_list_params
from inbound.http.brief.response import BriefDetailResponseData, BriefListResponseData
from inbound.http.response import cache_collection, cache_detail, envelope
from shared.pagination import encode_cursor

router = APIRouter(prefix="/briefs", tags=["briefs"])

SORT_ATTR_MAP = {
    "-published_at": "published_at",
    "-upvote_count": "upvote_count",
    "-source_count": "source_count",
}


def _get_service(request: Request) -> BriefService:
    return request.state.brief_service


@router.get("")
async def list_briefs(
    request: Request,
    response: Response,
    params: BriefListParams = Depends(get_brief_list_params),
):
    svc = _get_service(request)
    briefs = await svc.list_briefs(params)
    has_next = len(briefs) > params.limit
    items = briefs[: params.limit]

    meta: dict = {"has_next": has_next, "next_cursor": None}
    if has_next and items:
        last = items[-1]
        sort_attr = SORT_ATTR_MAP[params.sort]
        meta["next_cursor"] = encode_cursor(
            {"v": getattr(last, sort_attr), "id": last.id}
        )

    cache_collection(response)
    return envelope(
        [BriefListResponseData.from_domain(b).model_dump(mode="json") for b in items],
        meta=meta,
    )


@router.get("/{slug}")
async def get_brief(slug: str, request: Request, response: Response):
    svc = _get_service(request)
    brief = await svc.get_brief_by_slug(slug)
    cache_detail(response)
    return envelope(BriefDetailResponseData.from_domain(brief).model_dump(mode="json"))
