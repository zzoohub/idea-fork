"""
LangGraph workflow for idea generation.

Implements a Prompt Chaining pattern with sequential nodes:
generate_concept -> expand_prd -> categorize -> save
"""

import logging
import uuid
from typing import Any, Callable, Optional

from langgraph.graph import END, START, StateGraph

from idea_generator.models.state import (
    GenerationProgress,
    GenerationStatus,
    IdeaGenerationState,
    create_fork_state,
    create_initial_state,
)
from idea_generator.pipeline.nodes import categorize, expand_prd, generate_concept, save_idea
from idea_generator.pipeline.repository import IdeaCoreRepository, get_async_session

logger = logging.getLogger(__name__)


def _should_continue(state: IdeaGenerationState) -> str:
    """Determine if pipeline should continue or end due to error."""
    if state.get("error"):
        logger.warning(f"Pipeline ending due to error: {state['error']}")
        return "end"
    return "continue"


def create_idea_generation_graph() -> StateGraph:
    """Create the idea generation LangGraph workflow.

    Pipeline flow:
    START -> generate_concept -> expand_prd -> categorize -> save -> END

    Each node can set an error state which causes the pipeline to skip
    remaining nodes and end early.

    Returns:
        Compiled StateGraph for idea generation
    """
    # Create graph with state schema
    builder = StateGraph(IdeaGenerationState)

    # Add nodes
    builder.add_node("generate_concept", generate_concept)
    builder.add_node("expand_prd", expand_prd)
    builder.add_node("categorize", categorize)
    builder.add_node("save", save_idea)

    # Add edges - linear pipeline
    builder.add_edge(START, "generate_concept")

    # Conditional edges to handle errors
    builder.add_conditional_edges(
        "generate_concept",
        _should_continue,
        {"continue": "expand_prd", "end": END},
    )

    builder.add_conditional_edges(
        "expand_prd",
        _should_continue,
        {"continue": "categorize", "end": END},
    )

    builder.add_conditional_edges(
        "categorize",
        _should_continue,
        {"continue": "save", "end": END},
    )

    builder.add_edge("save", END)

    # Compile and return
    graph = builder.compile()
    logger.debug("Idea generation graph compiled successfully")

    return graph


async def generate_single_idea(
    run_id: str,
    idea_index: int,
    available_categories: list[str],
    user_id: Optional[str] = None,
    progress_callback: Optional[Callable[[GenerationProgress], Any]] = None,
) -> tuple[Optional[int], Optional[str], Optional[str]]:
    """Generate a single idea using the pipeline.

    Args:
        run_id: Unique run identifier
        idea_index: Index of this idea in the batch (0-based)
        available_categories: List of category slugs from database
        user_id: Optional user ID for on-demand generation
        progress_callback: Optional callback for progress updates

    Returns:
        Tuple of (idea_id, idea_slug, error_message) - idea_id/slug are None on failure
    """
    logger.info(f"[{run_id}] Starting idea generation {idea_index + 1}")

    # Create initial state
    initial_state = create_initial_state(
        run_id=run_id,
        idea_index=idea_index,
        available_categories=available_categories,
        user_id=user_id,
    )

    # Create and run graph
    graph = create_idea_generation_graph()

    try:
        final_state = await graph.ainvoke(initial_state)

        # Call progress callback with final state
        if progress_callback and final_state.get("progress"):
            progress_callback(final_state["progress"])

        if final_state.get("completed"):
            idea_id = final_state.get("idea_id")
            idea_slug = final_state.get("idea_slug")
            logger.info(f"[{run_id}] Successfully generated idea {idea_id} ({idea_slug})")
            return idea_id, idea_slug, None
        else:
            error = final_state.get("error", "Unknown error")
            logger.error(f"[{run_id}] Failed to generate idea: {error}")
            return None, None, error

    except Exception as e:
        logger.error(f"[{run_id}] Pipeline execution failed: {e}")
        if progress_callback:
            progress_callback(
                GenerationProgress(
                    status=GenerationStatus.FAILED,
                    current_step=0,
                    total_steps=4,
                    message=str(e),
                )
            )
        return None, None, str(e)


async def fork_idea(
    run_id: str,
    forked_from_slug: str,
    available_categories: list[str],
    user_id: Optional[str] = None,
    modifications: Optional[dict[str, Any]] = None,
    progress_callback: Optional[Callable[[GenerationProgress], Any]] = None,
) -> tuple[Optional[int], Optional[str], Optional[str]]:
    """Fork an existing idea with optional modifications.

    Args:
        run_id: Unique run identifier
        forked_from_slug: Slug of the idea to fork
        available_categories: List of category slugs from database
        user_id: Optional user ID for on-demand generation
        modifications: Optional modifications to apply
        progress_callback: Optional callback for progress updates

    Returns:
        Tuple of (idea_id, idea_slug, error_message) - idea_id/slug are None on failure
    """
    logger.info(f"[{run_id}] Starting fork of idea {forked_from_slug}")

    # Fetch the original idea
    async with get_async_session() as session:
        repo = IdeaCoreRepository(session)
        original_idea = await repo.get_idea_by_slug(forked_from_slug)

        if not original_idea:
            error = f"Original idea not found: {forked_from_slug}"
            logger.error(f"[{run_id}] {error}")
            return None, None, error

        forked_from_id = original_idea["id"]

    # Create fork state with original idea data
    fork_modifications = {
        "original_idea": original_idea,
        "modifications": modifications or {},
    }

    initial_state = create_fork_state(
        run_id=run_id,
        forked_from_id=forked_from_id,
        available_categories=available_categories,
        user_id=user_id,
        modifications=fork_modifications,
    )

    # Create and run graph
    graph = create_idea_generation_graph()

    try:
        final_state = await graph.ainvoke(initial_state)

        # Call progress callback with final state
        if progress_callback and final_state.get("progress"):
            progress_callback(final_state["progress"])

        if final_state.get("completed"):
            idea_id = final_state.get("idea_id")
            idea_slug = final_state.get("idea_slug")
            logger.info(f"[{run_id}] Successfully forked idea {idea_id} ({idea_slug})")
            return idea_id, idea_slug, None
        else:
            error = final_state.get("error", "Unknown error")
            logger.error(f"[{run_id}] Failed to fork idea: {error}")
            return None, None, error

    except Exception as e:
        logger.error(f"[{run_id}] Fork pipeline execution failed: {e}")
        if progress_callback:
            progress_callback(
                GenerationProgress(
                    status=GenerationStatus.FAILED,
                    current_step=0,
                    total_steps=4,
                    message=str(e),
                )
            )
        return None, None, str(e)


async def generate_ideas(count: int = 3, user_id: Optional[str] = None) -> list[int]:
    """Generate multiple ideas.

    Args:
        count: Number of ideas to generate
        user_id: Optional user ID for on-demand generation

    Returns:
        List of created idea IDs (may be fewer than count if some fail)
    """
    run_id = str(uuid.uuid4())[:8]
    logger.info(f"[{run_id}] Starting batch generation of {count} ideas")

    # Get available categories from database
    async with get_async_session() as session:
        repo = IdeaCoreRepository(session)
        available_categories = await repo.get_all_category_slugs()

    if not available_categories:
        logger.warning(f"[{run_id}] No categories found in database")
        available_categories = ["saas", "ai", "productivity"]  # Fallback

    logger.info(f"[{run_id}] Available categories: {available_categories}")

    # Generate ideas sequentially to avoid rate limits
    idea_ids: list[int] = []
    for i in range(count):
        idea_id, idea_slug, error = await generate_single_idea(
            run_id, i, available_categories, user_id
        )
        if idea_id:
            idea_ids.append(idea_id)

    logger.info(
        f"[{run_id}] Batch generation complete: "
        f"{len(idea_ids)}/{count} ideas created successfully"
    )

    return idea_ids
