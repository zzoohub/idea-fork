from domain.brief.errors import BriefNotFoundError
from domain.brief.ports import BriefRepository
from domain.rating.errors import RatingNotFoundError
from domain.rating.models import CreateRatingRequest, Rating, UpdateRatingRequest
from domain.rating.ports import RatingRepository


class RatingService:
    def __init__(self, repo: RatingRepository, brief_repo: BriefRepository) -> None:
        self._repo = repo
        self._brief_repo = brief_repo

    async def create_rating(self, request: CreateRatingRequest) -> Rating:
        brief = await self._brief_repo.get_brief_by_id(request.brief_id)
        if brief is None:
            raise BriefNotFoundError(str(request.brief_id))
        return await self._repo.create_rating(request)

    async def update_rating(self, request: UpdateRatingRequest) -> Rating:
        brief = await self._brief_repo.get_brief_by_id(request.brief_id)
        if brief is None:
            raise BriefNotFoundError(str(request.brief_id))
        rating = await self._repo.update_rating(request)
        if rating is None:
            raise RatingNotFoundError()
        return rating
