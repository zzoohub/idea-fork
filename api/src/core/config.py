"""
Application configuration using pydantic-settings.

Load configuration from environment variables with sensible defaults.
Validates settings at startup to catch configuration errors early.
"""

import logging
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Supported JWT algorithms
JWTAlgorithm = Literal["HS256", "HS384", "HS512"]


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    All settings can be overridden via environment variables.
    Boolean values accept: true/false, 1/0, yes/no.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown environment variables
    )

    # Application
    app_name: str = "Idea Fork API"
    debug: bool = False
    api_prefix: str = "/api"

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/idea_fork",
        description="PostgreSQL connection URL with asyncpg driver",
    )
    db_pool_size: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Database connection pool size",
    )
    db_max_overflow: int = Field(
        default=20,
        ge=0,
        le=100,
        description="Max overflow connections beyond pool size",
    )

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for RQ and caching",
    )

    # RQ Queue Settings
    rq_queue_name: str = Field(
        default="idea_generation",
        min_length=1,
        description="Name of the RQ queue for idea generation tasks",
    )

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins",
    )

    # Idea Generator (LLM settings for direct API generation)
    google_api_key: str = Field(
        default="",
        description="Google API key for Gemini LLM",
    )
    llm_model: str = Field(
        default="gemini-2.0-flash",
        description="LLM model name",
    )
    llm_temperature: float = Field(
        default=0.8,
        ge=0.0,
        le=2.0,
        description="LLM temperature for generation",
    )
    llm_max_tokens: int = Field(
        default=8192,
        ge=1,
        description="Maximum tokens for LLM response",
    )

    # Pagination
    default_page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Default items per page",
    )
    max_page_size: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Maximum items per page",
    )

    # Google OAuth
    google_client_id: str = Field(
        default="",
        description="Google OAuth Client ID (required for authentication)",
    )
    google_client_secret: str = Field(
        default="",
        description="Google OAuth Client Secret (required for authentication)",
    )

    # JWT
    jwt_secret_key: str = Field(
        default="change-me-in-production-use-a-strong-secret",
        min_length=32,
        description="Secret key for JWT encoding (min 32 characters)",
    )
    jwt_algorithm: JWTAlgorithm = Field(
        default="HS256",
        description="JWT signing algorithm",
    )
    jwt_access_token_expire_minutes: int = Field(
        default=60 * 24 * 7,  # 7 days
        ge=1,
        le=60 * 24 * 365,  # Max 1 year
        description="Access token expiration time in minutes",
    )

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format."""
        if not v.startswith(("postgresql://", "postgresql+asyncpg://")):
            raise ValueError(
                "Database URL must be a PostgreSQL connection string"
            )
        return v

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, v: list[str]) -> list[str]:
        """Validate CORS origins format."""
        for origin in v:
            if origin != "*" and not origin.startswith(("http://", "https://")):
                raise ValueError(f"Invalid CORS origin: {origin}")
        return v

    @model_validator(mode="after")
    def log_configuration_warnings(self) -> "Settings":
        """Log warnings for potentially insecure configurations."""
        if self.jwt_secret_key == "change-me-in-production-use-a-strong-secret":
            logger.warning(
                "Using default JWT secret key! "
                "Set JWT_SECRET_KEY environment variable in production."
            )

        if not self.google_client_id or not self.google_client_secret:
            logger.warning(
                "Google OAuth credentials not configured. "
                "Authentication will not work."
            )

        return self

    @property
    def is_oauth_configured(self) -> bool:
        """Check if Google OAuth is properly configured."""
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def jwt_expire_seconds(self) -> int:
        """Get JWT expiration time in seconds."""
        return self.jwt_access_token_expire_minutes * 60


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance.

    Uses lru_cache to ensure settings are only loaded once.
    """
    return Settings()


# Default settings instance for convenience
settings = get_settings()
