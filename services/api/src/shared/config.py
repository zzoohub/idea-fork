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
    PIPELINE_SUBREDDITS: str = (
        # Business & Startups
        "SaaS,SideProject,smallbusiness,ecommerce,Entrepreneur,startups,"
        # Finance & Crypto
        "personalfinance,FinancialPlanning,CryptoCurrency,BlockchainStartups,Web3,investing,"
        # Health & Medical
        "healthcare,mentalhealth,Supplements,loseit,Nutrition,AskDocs,"
        # Fitness
        "Fitness,bodyweightfitness,"
        # Food
        "MealPrepSunday,Cooking,EatCheapAndHealthy,"
        # Productivity
        "productivity,Notion,"
        # Education
        "learnprogramming,GetStudying,"
        # Social & Content
        "ContentCreators,socialmedia,Instagram,"
        # Entertainment
        "movies,cordcutters,"
        # Travel
        "travel,digitalnomad,"
        # Music
        "WeAreTheMusicMakers,"
        # Photography
        "photography,"
        # Utilities & Automation
        "selfhosted,automation,"
        # Shopping
        "BuyItForLife,"
        # Lifestyle
        "selfimprovement,minimalism,"
        # News & Tech
        "technology,technews,"
        # Communication
        "discordapp,"
        # Developer Tools
        "webdev,devops,"
        # General
        "marketing"
    )
    PIPELINE_FETCH_LIMIT: int = 50

    # RSS
    PIPELINE_RSS_FEEDS: str = "https://hnrss.org/newest?points=50,https://techcrunch.com/feed/"

    # Gemini
    GOOGLE_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_LITE_MODEL: str = "gemini-2.5-flash-lite"
    LLM_BRIEF_TEMPERATURE: float = 0.9

    # App Store / Play Store
    PIPELINE_APPSTORE_KEYWORDS: str = ""
    PIPELINE_APPSTORE_REVIEW_PAGES: int = 3
    PIPELINE_PLAYSTORE_REVIEW_COUNT: int = 100
    PIPELINE_APPSTORE_MAX_AGE_DAYS: int = 365

    # Product Hunt
    PRODUCTHUNT_API_TOKEN: str = ""

    # Sentry
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "development"

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
