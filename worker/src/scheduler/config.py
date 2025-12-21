"""
Scheduler configuration for rq-scheduler.

Defines settings for scheduled job execution timing and parameters.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SchedulerSettings(BaseSettings):
    """Scheduler-specific settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Schedule timing
    schedule_hour: int = Field(
        default=9,
        ge=0,
        le=23,
        description="Hour of day to run scheduled generation (0-23)",
    )
    schedule_minute: int = Field(
        default=0,
        ge=0,
        le=59,
        description="Minute of hour to run scheduled generation (0-59)",
    )
    schedule_timezone: str = Field(
        default="UTC",
        description="Timezone for schedule (e.g., UTC, America/New_York)",
    )

    # Generation settings
    ideas_per_day: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of ideas to generate per scheduled run",
    )


scheduler_settings = SchedulerSettings()
