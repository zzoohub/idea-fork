"""
Taxonomy API router.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.taxonomies.schemas import (
    FunctionTypeResponse,
    IndustryTypeResponse,
    TargetUserTypeResponse,
    TaxonomyListResponse,
)
from src.taxonomies.service import TaxonomyService

router = APIRouter(prefix="/taxonomies", tags=["taxonomies"])


@router.get("", response_model=TaxonomyListResponse)
async def get_all_taxonomies(
    session: AsyncSession = Depends(get_session),
) -> TaxonomyListResponse:
    """Get all active taxonomies."""
    service = TaxonomyService(session)

    functions = await service.get_active_functions()
    industries = await service.get_active_industries()
    target_users = await service.get_active_target_users()

    return TaxonomyListResponse(
        functions=[FunctionTypeResponse.model_validate(f) for f in functions],
        industries=[IndustryTypeResponse.model_validate(i) for i in industries],
        target_users=[TargetUserTypeResponse.model_validate(t) for t in target_users],
    )


@router.get("/functions", response_model=list[FunctionTypeResponse])
async def get_functions(
    session: AsyncSession = Depends(get_session),
) -> list[FunctionTypeResponse]:
    """Get all active function types."""
    service = TaxonomyService(session)
    functions = await service.get_active_functions()
    return [FunctionTypeResponse.model_validate(f) for f in functions]


@router.get("/industries", response_model=list[IndustryTypeResponse])
async def get_industries(
    session: AsyncSession = Depends(get_session),
) -> list[IndustryTypeResponse]:
    """Get all active industry types."""
    service = TaxonomyService(session)
    industries = await service.get_active_industries()
    return [IndustryTypeResponse.model_validate(i) for i in industries]


@router.get("/target-users", response_model=list[TargetUserTypeResponse])
async def get_target_users(
    session: AsyncSession = Depends(get_session),
) -> list[TargetUserTypeResponse]:
    """Get all active target user types."""
    service = TaxonomyService(session)
    target_users = await service.get_active_target_users()
    return [TargetUserTypeResponse.model_validate(t) for t in target_users]
