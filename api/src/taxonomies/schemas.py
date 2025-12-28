"""
Taxonomy Pydantic schemas for API responses.
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict


class TaxonomyResponse(BaseModel):
    """Base taxonomy response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    description: str
    is_active: bool


class FunctionTypeResponse(TaxonomyResponse):
    """Function type response for API."""

    icon: Optional[str] = None
    display_order: int


class IndustryTypeResponse(TaxonomyResponse):
    """Industry type response for API."""

    pass


class TargetUserTypeResponse(TaxonomyResponse):
    """Target user type response for API."""

    pass


class TaxonomyListResponse(BaseModel):
    """Combined taxonomy list response."""

    functions: list[FunctionTypeResponse]
    industries: list[IndustryTypeResponse]
    target_users: list[TargetUserTypeResponse]
