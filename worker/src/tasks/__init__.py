"""
RQ task definitions for scheduled idea generation.

Note: On-demand generation and forking are now handled directly by
the API via SSE streaming endpoints.
"""

from src.tasks.idea_generation import generate_daily_ideas_task

__all__ = ["generate_daily_ideas_task"]
