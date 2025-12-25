"""
LangGraph workflow for idea generation.

Implements a Prompt Chaining pattern with sequential nodes:
generate_concept -> expand_prd -> categorize -> save
"""

import logging
import uuid
from typing import Any, AsyncGenerator, Callable, Optional

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
    available_functions: list[str],
    available_industries: list[str],
    available_target_users: list[str],
    available_categories: list[str],
    function_slug: Optional[str] = None,
    industry_slug: Optional[str] = None,
    idea_seed: Optional[str] = None,
    user_id: Optional[str] = None,
    progress_callback: Optional[Callable[[GenerationProgress], Any]] = None,
) -> tuple[Optional[int], Optional[str], Optional[str]]:
    """Generate a single idea using the pipeline.

    Supports multiple generation modes:
    1. Auto-generate: function_slug/industry_slug = None → random selection
    2. Taxonomy selection: User provides function_slug/industry_slug
    3. Seed-based: idea_seed provided → AI structures the user's idea

    Args:
        run_id: Unique run identifier
        idea_index: Index of this idea in the batch (0-based)
        available_functions: List of function slugs from database
        available_industries: List of industry slugs from database
        available_target_users: List of target user slugs from database
        available_categories: List of category slugs (legacy)
        function_slug: Optional function type (random if not provided)
        industry_slug: Optional industry (random if not provided)
        idea_seed: Optional user idea text for seed-based generation
        user_id: Optional user ID for on-demand generation
        progress_callback: Optional callback for progress updates

    Returns:
        Tuple of (idea_id, idea_slug, error_message) - idea_id/slug are None on failure
    """
    import random

    # Random selection if not provided
    target_function = function_slug or random.choice(available_functions)
    target_industry = industry_slug or random.choice(available_industries)

    logger.info(
        f"[{run_id}] Starting idea generation {idea_index + 1} "
        f"(function={target_function}, industry={target_industry}, has_seed={bool(idea_seed)})"
    )

    # Create initial state with taxonomy info
    initial_state = create_initial_state(
        run_id=run_id,
        idea_index=idea_index,
        target_function=target_function,
        available_functions=available_functions,
        available_industries=available_industries,
        available_target_users=available_target_users,
        available_categories=available_categories,
        target_industry=target_industry,
        idea_seed=idea_seed,
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
    available_functions: list[str],
    available_industries: list[str],
    available_target_users: list[str],
    available_categories: list[str],
    user_id: Optional[str] = None,
    modifications: Optional[dict[str, Any]] = None,
    progress_callback: Optional[Callable[[GenerationProgress], Any]] = None,
) -> tuple[Optional[int], Optional[str], Optional[str]]:
    """Fork an existing idea with optional modifications.

    Args:
        run_id: Unique run identifier
        forked_from_slug: Slug of the idea to fork
        available_functions: List of function slugs from database
        available_industries: List of industry slugs from database
        available_target_users: List of target user slugs from database
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

    # Get function from original idea for fork
    target_function = original_idea.get("function_slug", "create")

    # Create fork state with original idea data
    fork_modifications = {
        "original_idea": original_idea,
        "modifications": modifications or {},
    }

    initial_state = create_fork_state(
        run_id=run_id,
        forked_from_id=forked_from_id,
        target_function=target_function,
        available_functions=available_functions,
        available_industries=available_industries,
        available_target_users=available_target_users,
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


async def generate_single_idea_stream(
    run_id: str,
    idea_index: int,
    available_functions: list[str],
    available_industries: list[str],
    available_target_users: list[str],
    available_categories: list[str],
    function_slug: Optional[str] = None,
    industry_slug: Optional[str] = None,
    idea_seed: Optional[str] = None,
    user_id: Optional[str] = None,
) -> AsyncGenerator[GenerationProgress, None]:
    """Generate a single idea with streaming progress updates.

    Yields GenerationProgress at each pipeline step for real-time SSE streaming.
    Use this for user-triggered generation that requires immediate feedback.

    Args:
        run_id: Unique run identifier
        idea_index: Index of this idea in the batch (0-based)
        available_functions: List of function slugs from database
        available_industries: List of industry slugs from database
        available_target_users: List of target user slugs from database
        available_categories: List of category slugs (legacy)
        function_slug: Optional function type (random if not provided)
        industry_slug: Optional industry (random if not provided)
        idea_seed: Optional user idea text for seed-based generation
        user_id: Optional user ID for on-demand generation

    Yields:
        GenerationProgress objects at each step
    """
    import random

    # Random selection if not provided
    target_function = function_slug or random.choice(available_functions)
    target_industry = industry_slug or random.choice(available_industries)

    logger.info(
        f"[{run_id}] Starting streaming idea generation "
        f"(function={target_function}, industry={target_industry}, has_seed={bool(idea_seed)})"
    )

    # Initial progress
    yield GenerationProgress(
        status=GenerationStatus.QUEUED,
        current_step=0,
        total_steps=4,
        message="Starting idea generation...",
    )

    # Create initial state with taxonomy info
    initial_state = create_initial_state(
        run_id=run_id,
        idea_index=idea_index,
        target_function=target_function,
        available_functions=available_functions,
        available_industries=available_industries,
        available_target_users=available_target_users,
        available_categories=available_categories,
        target_industry=target_industry,
        idea_seed=idea_seed,
        user_id=user_id,
    )

    # Create graph
    graph = create_idea_generation_graph()

    # Node to step mapping for progress tracking
    node_progress = {
        "generate_concept": (GenerationStatus.GENERATING_CONCEPT, 1, "Generating concept..."),
        "expand_prd": (GenerationStatus.EXPANDING_PRD, 2, "Expanding PRD..."),
        "categorize": (GenerationStatus.CATEGORIZING, 3, "Categorizing..."),
        "save": (GenerationStatus.SAVING, 4, "Saving to database..."),
    }

    try:
        # Stream through each node
        async for event in graph.astream(initial_state, stream_mode="updates"):
            for node_name, node_output in event.items():
                if node_name in node_progress:
                    status, step, message = node_progress[node_name]

                    # Get progress from node output if available
                    if node_output.get("progress"):
                        progress = node_output["progress"]
                        yield progress
                    else:
                        yield GenerationProgress(
                            status=status,
                            current_step=step,
                            total_steps=4,
                            message=message,
                        )

                    # Check for error
                    if node_output.get("error"):
                        yield GenerationProgress(
                            status=GenerationStatus.FAILED,
                            current_step=step,
                            total_steps=4,
                            message=node_output["error"],
                            error=node_output["error"],
                        )
                        return

                    # Check for completion
                    if node_output.get("completed"):
                        yield GenerationProgress(
                            status=GenerationStatus.COMPLETED,
                            current_step=4,
                            total_steps=4,
                            message=f"Successfully generated: {node_output.get('idea_slug', 'idea')}",
                            idea_id=node_output.get("idea_id"),
                            idea_slug=node_output.get("idea_slug"),
                        )
                        return

    except Exception as e:
        logger.error(f"[{run_id}] Pipeline streaming failed: {e}")
        yield GenerationProgress(
            status=GenerationStatus.FAILED,
            current_step=0,
            total_steps=4,
            message=str(e),
            error=str(e),
        )


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
