"""
Worker configuration using pydantic-settings.

Load configuration from environment variables with sensible defaults.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Worker settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars not defined in the model
    )

    # Application
    app_name: str = "Idea Fork Worker"
    debug: bool = False
    log_level: str = Field(default="INFO", description="Logging level")

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )

    # RQ Queue Settings
    queue_name: str = Field(
        default="idea_generation",
        description="Name of the RQ queue for idea generation tasks",
    )
    job_timeout: int = Field(
        default=600,
        description="Job timeout in seconds (10 minutes default for LLM operations)",
    )
    result_ttl: int = Field(
        default=86400,
        description="Time to keep job results in Redis (24 hours)",
    )
    failure_ttl: int = Field(
        default=604800,
        description="Time to keep failed job info in Redis (7 days)",
    )

    # API URL (for calling idea generation endpoints)
    api_url: str = Field(
        default="http://localhost:8000",
        description="Base URL of the Idea Fork API",
    )
    api_timeout: int = Field(
        default=120,
        description="Timeout in seconds for API calls (idea generation takes time)",
    )


settings = Settings()
