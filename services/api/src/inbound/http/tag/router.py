from fastapi import APIRouter, Query, Request, Response

from domain.tag.service import TagService
from inbound.http.response import cache_collection, cache_static, envelope
from inbound.http.tag.response import TagResponseData

router = APIRouter(prefix="/tags", tags=["tags"])


def _get_service(request: Request) -> TagService:
    return request.state.tag_service


@router.get("")
async def list_tags(request: Request, response: Response):
    svc = _get_service(request)
    tags = await svc.list_tags()
    cache_static(response)
    return envelope([TagResponseData.from_domain(t).model_dump() for t in tags])


@router.get("/trending")
async def list_trending_tags(
    request: Request,
    response: Response,
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(10, ge=1, le=60),
):
    svc = _get_service(request)
    tags = await svc.list_trending_tags(days, limit)
    cache_collection(response)
    return envelope([TagResponseData.from_domain(t).model_dump() for t in tags])
