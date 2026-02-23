import functools
import re

from pydantic import model_validator
from pydantic_settings import BaseSettings

_SUBREDDIT_RE = re.compile(r"^[A-Za-z0-9_]{1,50}$")


class Settings(BaseSettings):
    API_DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/idea_fork"
    API_CORS_ALLOWED_ORIGINS: str = "https://idea-fork.com"
    API_DEBUG: bool = False
    API_INTERNAL_SECRET: str = ""

    # Reddit API
    REDDIT_USER_AGENT: str = "idea-fork/0.1.0"

    # Pipeline
    PIPELINE_SUBREDDITS: str = "SaaS,SideProject,AskReddit,healthcare,BlockchainStartups,Web3,FinancialPlanning,ContentCreators,mentalhealth,Supplements,MealPrepSunday,personalfinance,CryptoCurrency,ecommerce,smallbusiness"
    PIPELINE_FETCH_LIMIT: int = 30

    # RSS
    PIPELINE_RSS_FEEDS: str = "https://hnrss.org/newest?points=50,https://techcrunch.com/feed/"

    # Gemini
    GOOGLE_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_LITE_MODEL: str = "gemini-2.5-flash-lite"
    LLM_BRIEF_TEMPERATURE: float = 0.9

    # Product Hunt
    PRODUCTHUNT_API_TOKEN: str = ""

    model_config = {"env_file": ".env", "env_prefix": "", "case_sensitive": True}

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
