from typing import Protocol

from domain.rating.models import CreateRatingRequest, Rating, UpdateRatingRequest


class RatingRepository(Protocol):
    async def create_rating(self, request: CreateRatingRequest) -> Rating: ...

    async def update_rating(self, request: UpdateRatingRequest) -> Rating | None: ...
