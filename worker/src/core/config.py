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

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/idea_fork",
        description="PostgreSQL connection URL with asyncpg driver",
    )

    # Anthropic API
    anthropic_api_key: str = Field(
        default="",
        description="Anthropic API key for Claude",
    )

    # LLM Settings
    llm_model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Anthropic model to use for generation",
    )
    llm_temperature: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Temperature for LLM generation (higher = more creative)",
    )
    llm_max_tokens: int = Field(
        default=4096,
        description="Maximum tokens for LLM responses",
    )


settings = Settings()
