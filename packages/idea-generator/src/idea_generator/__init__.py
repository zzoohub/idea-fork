"""
Idea Core - Shared idea generation pipeline for Idea Fork platform.

This package provides the LangGraph-based pipeline for generating product ideas,
used by both the scheduler job and the on-demand worker.
"""

from idea_generator.models.state import (
    GenerationProgress,
    GenerationStatus,
    IdeaConcept,
    IdeaGenerationState,
    PRDContent,
    create_initial_state,
    create_fork_state,
)
from idea_generator.pipeline.graph import (
    create_idea_generation_graph,
    generate_single_idea,
)

__version__ = "0.1.0"

__all__ = [
    # State models
    "IdeaGenerationState",
    "IdeaConcept",
    "PRDContent",
    "GenerationProgress",
    "GenerationStatus",
    "create_initial_state",
    "create_fork_state",
    # Pipeline
    "create_idea_generation_graph",
    "generate_single_idea",
]
