"""
Configuration for the idea generation pipeline.

Uses the main API settings for consistency.
"""

from src.core.config import settings


class PipelineConfig:
    """Pipeline configuration using API settings."""

    @property
    def google_api_key(self) -> str:
        return settings.google_api_key

    @property
    def llm_model(self) -> str:
        return getattr(settings, "llm_model", "gemini-2.0-flash")

    @property
    def llm_temperature(self) -> float:
        return getattr(settings, "llm_temperature", 0.8)

    @property
    def llm_max_tokens(self) -> int:
        return getattr(settings, "llm_max_tokens", 4096)

    @property
    def database_url(self) -> str:
        return settings.database_url


# Singleton instance
_config: PipelineConfig | None = None


def get_pipeline_config() -> PipelineConfig:
    """Get pipeline config singleton."""
    global _config
    if _config is None:
        _config = PipelineConfig()
    return _config
