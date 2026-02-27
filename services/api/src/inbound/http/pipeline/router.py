import hmac
import logging
from dataclasses import asdict

from fastapi import APIRouter, Header, Request
from starlette.responses import JSONResponse

from domain.pipeline.service import PipelineService
from shared.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


def _get_service(request: Request) -> PipelineService:
    return request.state.pipeline_service


@router.get("/status")
async def pipeline_status(request: Request):
    svc = _get_service(request)
    running = await svc.is_running()
    return JSONResponse(content={"data": {"is_running": running}})


@router.post("/run")
async def run_pipeline(
    request: Request,
    x_internal_secret: str | None = Header(None),
):
    settings = get_settings()

    if not settings.API_INTERNAL_SECRET or not hmac.compare_digest(
        x_internal_secret or "", settings.API_INTERNAL_SECRET
    ):
        return JSONResponse(
            status_code=403,
            content={
                "type": "https://api.idea-fork.com/errors/forbidden",
                "title": "Forbidden",
                "status": 403,
                "detail": "Invalid or missing internal secret.",
            },
            media_type="application/problem+json",
        )

    svc = _get_service(request)
    result = await svc.run()

    status_code = 200 if not result.has_errors else 207
    logger.info(
        "Pipeline run complete: fetched=%d upserted=%d tagged=%d clusters=%d briefs=%d errors=%d",
        result.posts_fetched,
        result.posts_upserted,
        result.posts_tagged,
        result.clusters_created,
        result.briefs_generated,
        len(result.errors),
    )

    return JSONResponse(status_code=status_code, content={"data": asdict(result)})
