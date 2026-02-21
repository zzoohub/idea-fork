from typing import Any

from starlette.responses import Response


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
