"""Additional tests for shared/config.py — covering the subreddit validator branches."""
import os
from unittest.mock import patch

import pytest

from shared.config import Settings


def test_validate_subreddit_names_raises_on_invalid_name():
    """model_validator should raise when a subreddit name is invalid."""
    env = {"PIPELINE_SUBREDDITS": "valid,invalid name!"}
    with patch.dict(os.environ, env, clear=False):
        with pytest.raises(Exception):
            Settings()


def test_validate_subreddit_names_accepts_valid_names():
    """model_validator should pass with all valid subreddit names."""
    env = {"PIPELINE_SUBREDDITS": "SaaS,startups,webdev"}
    with patch.dict(os.environ, env, clear=False):
        settings = Settings()
    assert "SaaS" in settings.PIPELINE_SUBREDDITS


def test_validate_subreddit_names_skips_empty_after_split():
    """model_validator should ignore empty strings produced by trailing commas."""
    env = {"PIPELINE_SUBREDDITS": "SaaS,startups,"}
    with patch.dict(os.environ, env, clear=False):
        settings = Settings()
    assert settings.PIPELINE_SUBREDDITS.startswith("SaaS")
