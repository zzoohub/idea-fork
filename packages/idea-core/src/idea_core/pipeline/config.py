"""
Configuration for the idea generation pipeline.

Provides settings that can be overridden by environment variables.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class PipelineSettings(BaseSettings):
    """Settings for the idea generation pipeline."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
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

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/idea_fork",
        description="PostgreSQL connection URL with asyncpg driver",
    )


# Singleton settings instance
_settings: PipelineSettings | None = None


def get_settings() -> PipelineSettings:
    """Get pipeline settings singleton."""
    global _settings
    if _settings is None:
        _settings = PipelineSettings()
    return _settings


def configure_settings(settings: PipelineSettings) -> None:
    """Override pipeline settings (useful for testing or worker configuration)."""
    global _settings
    _settings = settings
