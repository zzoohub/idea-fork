from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from domain.rating.errors import DuplicateRatingError
from domain.rating.models import CreateRatingRequest, Rating, UpdateRatingRequest
from outbound.postgres.database import Database
from outbound.postgres.mapper import rating_to_domain
from outbound.postgres.models import BriefRow, RatingRow


class PostgresRatingRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def create_rating(self, request: CreateRatingRequest) -> Rating:
        async with self._db.session() as session:
            async with session.begin():
                row = RatingRow(
                    brief_id=request.brief_id,
                    session_id=request.session_id,
                    is_positive=request.is_positive,
                    feedback=request.feedback,
                )
                session.add(row)
                try:
                    await session.flush()
                except IntegrityError:
                    raise DuplicateRatingError()

                # Update denormalized counter
                if request.is_positive:
                    await session.execute(
                        update(BriefRow)
                        .where(BriefRow.id == request.brief_id)
                        .values(upvote_count=BriefRow.upvote_count + 1)
                    )
                else:
                    await session.execute(
                        update(BriefRow)
                        .where(BriefRow.id == request.brief_id)
                        .values(downvote_count=BriefRow.downvote_count + 1)
                    )

                return rating_to_domain(row)

    async def update_rating(self, request: UpdateRatingRequest) -> Rating | None:
        async with self._db.session() as session:
            async with session.begin():
                stmt = select(RatingRow).where(
                    RatingRow.brief_id == request.brief_id,
                    RatingRow.session_id == request.session_id,
                )
                result = await session.execute(stmt)
                row = result.scalars().first()
                if row is None:
                    return None

                old_positive = row.is_positive
                row.is_positive = request.is_positive
                row.feedback = request.feedback

                # Adjust counters if vote flipped
                if old_positive != request.is_positive:
                    if request.is_positive:
                        await session.execute(
                            update(BriefRow)
                            .where(BriefRow.id == request.brief_id)
                            .values(
                                upvote_count=BriefRow.upvote_count + 1,
                                downvote_count=BriefRow.downvote_count - 1,
                            )
                        )
                    else:
                        await session.execute(
                            update(BriefRow)
                            .where(BriefRow.id == request.brief_id)
                            .values(
                                upvote_count=BriefRow.upvote_count - 1,
                                downvote_count=BriefRow.downvote_count + 1,
                            )
                        )

                return rating_to_domain(row)
