"""
Generation service for managing idea generation requests.

Handles enqueueing RQ jobs and tracking request status.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

from redis import Redis as SyncRedis
from rq import Queue
from rq.job import Job
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.generation.models import GenerationRequest
from src.generation.schemas import (
    GenerationProgressStatus,
    GenerationStatusResponse,
    RequestStatus,
)

logger = logging.getLogger(__name__)


class GenerationService:
    """Service for managing idea generation requests."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._sync_redis: Optional[SyncRedis] = None

    def _get_sync_redis(self) -> SyncRedis:
        """Get sync Redis connection for RQ operations."""
        if self._sync_redis is None:
            self._sync_redis = SyncRedis.from_url(settings.redis_url)
        return self._sync_redis

    def _get_queue(self) -> Queue:
        """Get the RQ queue for idea generation."""
        return Queue(settings.rq_queue_name, connection=self._get_sync_redis())

    async def create_generation_request(
        self,
        user_id: Optional[UUID] = None,
        function_slug: Optional[str] = None,
        industry_slug: Optional[str] = None,
        idea_seed: Optional[str] = None,
    ) -> GenerationRequest:
        """Create a new generation request and enqueue the RQ job.

        Args:
            user_id: Optional user ID for the request
            function_slug: Optional function type (random if not provided)
            industry_slug: Optional industry (random if not provided)
            idea_seed: Optional user idea text for seed-based generation

        Returns:
            The created GenerationRequest
        """
        request_id = uuid4()

        # Enqueue the RQ job with taxonomy parameters
        queue = self._get_queue()
        job = queue.enqueue(
            "src.tasks.idea_generation.generate_idea_task",
            user_id=str(user_id) if user_id else None,
            request_id=str(request_id),
            function_slug=function_slug,
            industry_slug=industry_slug,
            idea_seed=idea_seed,
            job_timeout=600,
            result_ttl=86400,
            failure_ttl=604800,
        )

        # Create the database record
        insert_query = text("""
            INSERT INTO generation_requests (
                id, user_id, status, rq_job_id, created_at
            ) VALUES (
                :id, :user_id, :status, :rq_job_id, NOW()
            )
            RETURNING id
        """)

        await self.session.execute(
            insert_query,
            {
                "id": request_id,
                "user_id": user_id,
                "status": RequestStatus.QUEUED.value,
                "rq_job_id": job.id,
            },
        )
        await self.session.commit()

        logger.info(f"Created generation request {request_id} with job {job.id}")

        return GenerationRequest(
            id=request_id,
            user_id=user_id,
            status=RequestStatus.QUEUED,
            rq_job_id=job.id,
            created_at=datetime.now(timezone.utc),
        )

    async def create_fork_request(
        self,
        fork_from_slug: str,
        modifications: Optional[dict[str, Any]] = None,
        user_id: Optional[UUID] = None,
    ) -> GenerationRequest:
        """Create a fork request and enqueue the RQ job.

        Args:
            fork_from_slug: Slug of the idea to fork
            modifications: Optional modifications to apply
            user_id: Optional user ID for the request

        Returns:
            The created GenerationRequest

        Raises:
            ValueError: If the idea to fork is not found
        """
        request_id = uuid4()

        # Get the original idea ID
        get_idea_query = text("SELECT id FROM ideas WHERE slug = :slug")
        result = await self.session.execute(get_idea_query, {"slug": fork_from_slug})
        row = result.fetchone()

        if not row:
            raise ValueError(f"Idea not found: {fork_from_slug}")

        forked_from_id = row[0]

        # Enqueue the fork job
        queue = self._get_queue()
        job = queue.enqueue(
            "src.tasks.idea_generation.fork_idea_task",
            fork_from_slug=fork_from_slug,
            user_id=str(user_id) if user_id else None,
            request_id=str(request_id),
            modifications=modifications,
            job_timeout=600,
            result_ttl=86400,
            failure_ttl=604800,
        )

        # Create the database record
        insert_query = text("""
            INSERT INTO generation_requests (
                id, user_id, status, rq_job_id, forked_from_id, created_at
            ) VALUES (
                :id, :user_id, :status, :rq_job_id, :forked_from_id, NOW()
            )
            RETURNING id
        """)

        await self.session.execute(
            insert_query,
            {
                "id": request_id,
                "user_id": user_id,
                "status": RequestStatus.QUEUED.value,
                "rq_job_id": job.id,
                "forked_from_id": forked_from_id,
            },
        )
        await self.session.commit()

        logger.info(
            f"Created fork request {request_id} for {fork_from_slug} with job {job.id}"
        )

        return GenerationRequest(
            id=request_id,
            user_id=user_id,
            status=RequestStatus.QUEUED,
            rq_job_id=job.id,
            forked_from_id=forked_from_id,
            created_at=datetime.now(timezone.utc),
        )

    async def get_request_status(
        self,
        request_id: UUID,
    ) -> Optional[GenerationStatusResponse]:
        """Get the current status of a generation request.

        Combines database status with RQ job metadata for detailed progress.

        Args:
            request_id: The request ID to check

        Returns:
            GenerationStatusResponse or None if not found
        """
        # Fetch from database
        query = text("""
            SELECT
                id, user_id, status, rq_job_id,
                idea_id, forked_from_id, error_message,
                created_at, completed_at
            FROM generation_requests
            WHERE id = :request_id
        """)

        result = await self.session.execute(query, {"request_id": request_id})
        row = result.fetchone()

        if not row:
            return None

        db_status = RequestStatus(row[2])
        rq_job_id = row[3]
        idea_id = row[4]
        error_message = row[6]
        created_at = row[7]
        completed_at = row[8]

        # Get detailed progress from RQ job metadata
        progress_status = None
        progress_message = None
        progress_percent = 0
        idea_slug = None

        try:
            job = Job.fetch(rq_job_id, connection=self._get_sync_redis())

            if job:
                meta = job.meta or {}
                rq_status = meta.get("status", "QUEUED")
                progress_message = meta.get("message", "")
                progress_percent = meta.get("progress", 0)

                # Map RQ status to our progress enum
                status_map = {
                    "QUEUED": GenerationProgressStatus.QUEUED,
                    "GENERATING_CONCEPT": GenerationProgressStatus.GENERATING_CONCEPT,
                    "EXPANDING_PRD": GenerationProgressStatus.EXPANDING_PRD,
                    "CATEGORIZING": GenerationProgressStatus.CATEGORIZING,
                    "SAVING": GenerationProgressStatus.SAVING,
                    "COMPLETED": GenerationProgressStatus.COMPLETED,
                    "FAILED": GenerationProgressStatus.FAILED,
                }
                progress_status = status_map.get(
                    rq_status, GenerationProgressStatus.QUEUED
                )

                # Check job result for completion
                if job.is_finished:
                    result_data = job.result
                    if result_data and result_data.get("success"):
                        idea_slug = result_data.get("idea_slug")
                        if not idea_id:
                            idea_id = result_data.get("idea_id")
                        db_status = RequestStatus.COMPLETED
                        progress_status = GenerationProgressStatus.COMPLETED
                        # Update database
                        await self._sync_job_result(request_id, result_data)
                    elif result_data and not result_data.get("success"):
                        error_message = result_data.get("error")
                        db_status = RequestStatus.FAILED
                        progress_status = GenerationProgressStatus.FAILED
                        await self._mark_failed(request_id, error_message)

                # Check if job failed
                if job.is_failed:
                    progress_status = GenerationProgressStatus.FAILED
                    db_status = RequestStatus.FAILED
                    if not error_message:
                        error_message = (
                            str(job.exc_info) if job.exc_info else "Job failed"
                        )
                    await self._mark_failed(request_id, error_message)

                # Check if job is started but not finished
                if job.is_started and not job.is_finished and not job.is_failed:
                    db_status = RequestStatus.PROCESSING
                    await self._mark_processing(request_id)

        except Exception as e:
            logger.warning(f"Could not fetch RQ job {rq_job_id}: {e}")

        # Get idea slug if we have idea_id but no slug
        if idea_id and not idea_slug:
            slug_query = text("SELECT slug FROM ideas WHERE id = :idea_id")
            slug_result = await self.session.execute(slug_query, {"idea_id": idea_id})
            slug_row = slug_result.fetchone()
            if slug_row:
                idea_slug = slug_row[0]

        return GenerationStatusResponse(
            request_id=request_id,
            status=db_status,
            progress=progress_status,
            progress_message=progress_message,
            progress_percent=progress_percent,
            idea_id=idea_id,
            idea_slug=idea_slug,
            error=error_message,
            created_at=created_at,
            completed_at=completed_at,
        )

    async def _mark_processing(self, request_id: UUID) -> None:
        """Mark a request as processing in database."""
        update_query = text("""
            UPDATE generation_requests
            SET status = :status
            WHERE id = :request_id
            AND status = :queued_status
        """)

        await self.session.execute(
            update_query,
            {
                "request_id": request_id,
                "status": RequestStatus.PROCESSING.value,
                "queued_status": RequestStatus.QUEUED.value,
            },
        )
        await self.session.commit()

    async def _sync_job_result(
        self,
        request_id: UUID,
        result_data: dict[str, Any],
    ) -> None:
        """Sync successful job result to database."""
        idea_id = result_data.get("idea_id")
        if not idea_id:
            return

        update_query = text("""
            UPDATE generation_requests
            SET status = :status,
                idea_id = :idea_id,
                completed_at = NOW()
            WHERE id = :request_id
            AND status != :completed_status
        """)

        await self.session.execute(
            update_query,
            {
                "request_id": request_id,
                "status": RequestStatus.COMPLETED.value,
                "idea_id": idea_id,
                "completed_status": RequestStatus.COMPLETED.value,
            },
        )
        await self.session.commit()

    async def _mark_failed(
        self,
        request_id: UUID,
        error_message: Optional[str],
    ) -> None:
        """Mark a request as failed in database."""
        update_query = text("""
            UPDATE generation_requests
            SET status = :status,
                error_message = :error_message,
                completed_at = NOW()
            WHERE id = :request_id
            AND status NOT IN (:completed_status, :failed_status)
        """)

        await self.session.execute(
            update_query,
            {
                "request_id": request_id,
                "status": RequestStatus.FAILED.value,
                "error_message": error_message or "Unknown error",
                "completed_status": RequestStatus.COMPLETED.value,
                "failed_status": RequestStatus.FAILED.value,
            },
        )
        await self.session.commit()
