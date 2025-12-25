"""
Application configuration using pydantic-settings.

Load configuration from environment variables with sensible defaults.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
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
    db_pool_size: int = Field(default=10, description="Database connection pool size")
    db_max_overflow: int = Field(
        default=20, description="Max overflow connections beyond pool size"
    )

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for RQ and caching",
    )

    # RQ Queue Settings
    rq_queue_name: str = Field(
        default="idea_generation",
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
        description="LLM temperature for generation",
    )
    llm_max_tokens: int = Field(
        default=8192,
        description="Maximum tokens for LLM response",
    )

    # Pagination
    default_page_size: int = Field(default=20, description="Default items per page")
    max_page_size: int = Field(default=100, description="Maximum items per page")


settings = Settings()
