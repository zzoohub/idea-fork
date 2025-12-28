"""
Authentication module for Google OAuth.

Provides:
- Google OAuth authentication endpoints
- JWT token generation and validation
- User session management

Usage:
    Include the router in your FastAPI app:

    ```python
    from src.auth import router as auth_router
    app.include_router(auth_router, prefix="/api")
    ```
"""

from src.auth.router import router
from src.auth.schemas import AuthResponse, GoogleAuthRequest, TokenResponse, UserResponse
from src.auth.service import AuthService

__all__ = [
    # Router
    "router",
    # Schemas
    "AuthResponse",
    "GoogleAuthRequest",
    "TokenResponse",
    "UserResponse",
    # Service
    "AuthService",
]
