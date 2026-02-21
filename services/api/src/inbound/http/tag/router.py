from fastapi import APIRouter, Request, Response

from domain.tag.service import TagService
from inbound.http.response import cache_static, envelope
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
