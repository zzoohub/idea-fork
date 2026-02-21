from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from domain.brief.errors import BriefNotFoundError
from domain.post.errors import PostNotFoundError
from domain.product.errors import ProductNotFoundError
from domain.rating.errors import DuplicateRatingError, RatingNotFoundError


class BadRequestError(Exception):
    pass


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


async def _post_not_found(_req: Request, exc: PostNotFoundError) -> JSONResponse:
    return _problem(404, "not-found", "Not Found", str(exc))


async def _brief_not_found(_req: Request, exc: BriefNotFoundError) -> JSONResponse:
    return _problem(404, "not-found", "Not Found", str(exc))


async def _product_not_found(_req: Request, exc: ProductNotFoundError) -> JSONResponse:
    return _problem(404, "not-found", "Not Found", str(exc))


async def _duplicate_rating(_req: Request, exc: DuplicateRatingError) -> JSONResponse:
    return _problem(409, "duplicate-rating", "Duplicate Rating", str(exc))


async def _rating_not_found(_req: Request, exc: RatingNotFoundError) -> JSONResponse:
    return _problem(404, "not-found", "Not Found", str(exc))


async def _bad_request(_req: Request, exc: BadRequestError) -> JSONResponse:
    return _problem(400, "bad-request", "Bad Request", str(exc))


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
    app.add_exception_handler(PostNotFoundError, _post_not_found)
    app.add_exception_handler(BriefNotFoundError, _brief_not_found)
    app.add_exception_handler(ProductNotFoundError, _product_not_found)
    app.add_exception_handler(DuplicateRatingError, _duplicate_rating)
    app.add_exception_handler(RatingNotFoundError, _rating_not_found)
    app.add_exception_handler(BadRequestError, _bad_request)
    app.add_exception_handler(RequestValidationError, _validation_error)
