from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from domain.brief.errors import BriefNotFoundError
from domain.post.errors import PostNotFoundError
from domain.product.errors import ProductNotFoundError
from domain.rating.errors import DuplicateRatingError, RatingNotFoundError


class BadRequestError(Exception):
    pass


_EXCEPTION_MAP: list[tuple[type[Exception], int, str, str]] = [
    (PostNotFoundError, 404, "not-found", "Not Found"),
    (BriefNotFoundError, 404, "not-found", "Not Found"),
    (ProductNotFoundError, 404, "not-found", "Not Found"),
    (RatingNotFoundError, 404, "not-found", "Not Found"),
    (DuplicateRatingError, 409, "duplicate-rating", "Duplicate Rating"),
    (BadRequestError, 400, "bad-request", "Bad Request"),
]


def _problem(status: int, error_type: str, title: str, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "type": f"https://api.idea-fork.com/errors/{error_type}",
            "title": title,
            "status": status,
            "detail": detail,
        },
        media_type="application/problem+json",
    )


def _make_handler(status: int, error_type: str, title: str):
    async def _handler(_req: Request, exc: Exception) -> JSONResponse:
        return _problem(status, error_type, title, str(exc))

    return _handler


async def _validation_error(
    _req: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for err in exc.errors():
        loc = err.get("loc", ())
        field = str(loc[-1]) if loc else "unknown"
        errors.append({
            "field": field,
            "code": err.get("type", "invalid"),
            "message": err.get("msg", "Invalid value."),
        })
    return JSONResponse(
        status_code=422,
        content={
            "type": "https://api.idea-fork.com/errors/validation-failed",
            "title": "Validation Failed",
            "status": 422,
            "detail": "Request body contains invalid fields.",
            "errors": errors,
        },
        media_type="application/problem+json",
    )


def register_exception_handlers(app: FastAPI) -> None:
    for exc_cls, status, error_type, title in _EXCEPTION_MAP:
        app.add_exception_handler(exc_cls, _make_handler(status, error_type, title))
    app.add_exception_handler(RequestValidationError, _validation_error)
