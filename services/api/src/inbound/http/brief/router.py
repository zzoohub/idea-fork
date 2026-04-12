from fastapi import APIRouter, Depends, Request, Response

from domain.brief.models import BriefListParams
from inbound.http.brief.dependencies import get_brief_list_params
from inbound.http.brief.response import BriefDetailResponseData, BriefListResponseData
from inbound.http.dependencies import service_dep
from inbound.http.response import cache_collection, cache_detail, envelope
from shared.pagination import paginate

router = APIRouter(prefix="/briefs", tags=["briefs"])

SORT_ATTR_MAP = {
    "-published_at": "published_at",
    "-upvote_count": "upvote_count",
    "-source_count": "source_count",
}

_get_service = service_dep("brief_service")


@router.get("")
async def list_briefs(
    request: Request,
    response: Response,
    params: BriefListParams = Depends(get_brief_list_params),
):
    svc = _get_service(request)
    briefs = await svc.list_briefs(params)
    page = paginate(briefs, limit=params.limit, sort_attr=SORT_ATTR_MAP[params.sort])

    cache_collection(response)
    return envelope(
        [BriefListResponseData.from_domain(b).model_dump(mode="json") for b in page.items],
        meta={"has_next": page.has_next, "next_cursor": page.next_cursor},
    )


@router.get("/{slug}")
async def get_brief(slug: str, request: Request, response: Response):
    svc = _get_service(request)
    brief = await svc.get_brief_by_slug(slug)
    cache_detail(response)
    return envelope(BriefDetailResponseData.from_domain(brief).model_dump(mode="json"))
