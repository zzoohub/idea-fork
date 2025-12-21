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
    app_name: str = "Idea Generator"
    debug: bool = False
    log_level: str = Field(default="INFO", description="Logging level")

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/idea_fork",
        description="PostgreSQL connection URL with asyncpg driver",
    )
    db_pool_size: int = Field(default=5, description="Database connection pool size")
    db_max_overflow: int = Field(
        default=10, description="Max overflow connections beyond pool size"
    )

    # Anthropic API
    anthropic_api_key: str = Field(
        default="",
        description="Anthropic API key for Claude",
    )

    # Scheduler
    schedule_hour: int = Field(
        default=9,
        ge=0,
        le=23,
        description="Hour of day to run idea generation (0-23)",
    )
    schedule_minute: int = Field(
        default=0,
        ge=0,
        le=59,
        description="Minute of hour to run idea generation (0-59)",
    )
    schedule_timezone: str = Field(
        default="UTC",
        description="Timezone for scheduler",
    )

    # Idea Generation
    ideas_per_run: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of ideas to generate per run",
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
