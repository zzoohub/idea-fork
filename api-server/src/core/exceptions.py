"""
Global exception classes for the application.

Define custom exceptions that can be used across domains.
"""

from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    """Resource not found exception."""

    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found",
        )


class BadRequestError(HTTPException):
    """Bad request exception."""

    def __init__(self, detail: str = "Bad request"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class UnauthorizedError(HTTPException):
    """Unauthorized exception."""

    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )


class ForbiddenError(HTTPException):
    """Forbidden exception."""

    def __init__(self, detail: str = "Forbidden"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )
