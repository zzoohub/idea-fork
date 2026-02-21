import functools
import re

from pydantic import model_validator
from pydantic_settings import BaseSettings

_SUBREDDIT_RE = re.compile(r"^[A-Za-z0-9_]{1,50}$")


class Settings(BaseSettings):
    API_DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/idea_fork"
    API_CORS_ALLOWED_ORIGINS: str = "https://idea-fork.com"
    API_DEBUG: bool = False

    # Reddit API
    REDDIT_CLIENT_ID: str = ""
    REDDIT_CLIENT_SECRET: str = ""
    REDDIT_USER_AGENT: str = "idea-fork/0.1.0"

    # Pipeline
    PIPELINE_SUBREDDITS: str = "SaaS,startups,webdev,selfhosted,smallbusiness"
    PIPELINE_FETCH_LIMIT: int = 100

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    LLM_TAGGING_MODEL: str = "claude-haiku-4-5-20251001"
    LLM_SYNTHESIS_MODEL: str = "claude-sonnet-4-5-20250514"

    model_config = {"env_prefix": "", "case_sensitive": True}

    @model_validator(mode="after")
    def validate_subreddit_names(self) -> "Settings":
        for name in self.PIPELINE_SUBREDDITS.split(","):
            name = name.strip()
            if name and not _SUBREDDIT_RE.match(name):
                msg = f"Invalid subreddit name: {name!r}"
                raise ValueError(msg)
        return self


@functools.lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
