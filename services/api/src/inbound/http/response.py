from typing import Any, Self

from pydantic import BaseModel, ConfigDict
from starlette.responses import Response


class ResponseData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_domain(cls, obj: Any) -> Self:
        return cls.model_validate(obj)


class TagData(ResponseData):
    slug: str
    name: str


def envelope(data: Any, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {"data": data}
    if meta:
        result["meta"] = meta
    return result


def cache_collection(response: Response) -> None:
    response.headers["Cache-Control"] = "public, max-age=60"


def cache_detail(response: Response) -> None:
    response.headers["Cache-Control"] = "public, max-age=300"


def cache_static(response: Response) -> None:
    response.headers["Cache-Control"] = "public, max-age=3600"


def no_cache(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"
