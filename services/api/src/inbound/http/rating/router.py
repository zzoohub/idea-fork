from fastapi import APIRouter, Depends, Request, Response

from domain.rating.models import CreateRatingRequest, UpdateRatingRequest
from domain.rating.service import RatingService
from inbound.http.dependencies import get_session_id
from inbound.http.limiter import limiter
from inbound.http.rating.request import RatingCreateBody, RatingUpdateBody
from inbound.http.rating.response import RatingResponseData
from inbound.http.response import envelope, no_cache

router = APIRouter(prefix="/briefs/{brief_id}/ratings", tags=["ratings"])


def _get_service(request: Request) -> RatingService:
    return request.state.rating_service


@router.post("", status_code=201)
@limiter.limit("10/minute")
async def create_rating(
    brief_id: int,
    body: RatingCreateBody,
    request: Request,
    response: Response,
    session_id: str = Depends(get_session_id),
):
    svc = _get_service(request)
    domain_req = CreateRatingRequest(
        brief_id=brief_id,
        session_id=session_id,
        is_positive=body.is_positive,
        feedback=body.feedback,
    )
    rating = await svc.create_rating(domain_req)
    no_cache(response)
    return envelope(RatingResponseData.from_domain(rating).model_dump(mode="json"))


@router.patch("")
@limiter.limit("10/minute")
async def update_rating(
    brief_id: int,
    body: RatingUpdateBody,
    request: Request,
    response: Response,
    session_id: str = Depends(get_session_id),
):
    svc = _get_service(request)
    domain_req = UpdateRatingRequest(
        brief_id=brief_id,
        session_id=session_id,
        is_positive=body.is_positive,
        feedback=body.feedback,
    )
    rating = await svc.update_rating(domain_req)
    no_cache(response)
    return envelope(RatingResponseData.from_domain(rating).model_dump(mode="json"))
