"""
Taxonomy Pydantic schemas for API responses.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class TaxonomyResponse(BaseModel):
    """Base taxonomy response schema."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

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

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    functions: list[FunctionTypeResponse]
    industries: list[IndustryTypeResponse]
    target_users: list[TargetUserTypeResponse]
