"""
LangGraph workflow for idea generation.

Implements a Prompt Chaining pattern with sequential nodes:
generate_concept -> expand_prd -> categorize -> save
"""

import uuid
from typing import Optional

from langgraph.graph import END, START, StateGraph

from src.agents.nodes import categorize, expand_prd, generate_concept, save_idea
from src.agents.state import IdeaGenerationState, create_initial_state
from src.core.logging import get_logger
from src.db.database import get_session
from src.db.repository import IdeaRepository

logger = get_logger(__name__)


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
) -> Optional[int]:
    """Generate a single idea using the pipeline.

    Args:
        run_id: Unique run identifier
        idea_index: Index of this idea in the batch (0-based)
        available_categories: List of category slugs from database

    Returns:
        The created idea ID if successful, None otherwise
    """
    logger.info(f"[{run_id}] Starting idea generation {idea_index + 1}")

    # Create initial state
    initial_state = create_initial_state(
        run_id=run_id,
        idea_index=idea_index,
        available_categories=available_categories,
    )

    # Create and run graph
    graph = create_idea_generation_graph()
    final_state = await graph.ainvoke(initial_state)

    if final_state.get("completed"):
        idea_id = final_state.get("idea_id")
        logger.info(f"[{run_id}] Successfully generated idea {idea_id}")
        return idea_id
    else:
        error = final_state.get("error", "Unknown error")
        logger.error(f"[{run_id}] Failed to generate idea: {error}")
        return None


async def generate_ideas(count: int = 3) -> list[int]:
    """Generate multiple ideas.

    Args:
        count: Number of ideas to generate

    Returns:
        List of created idea IDs (may be fewer than count if some fail)
    """
    run_id = str(uuid.uuid4())[:8]
    logger.info(f"[{run_id}] Starting batch generation of {count} ideas")

    # Get available categories from database
    async with get_session() as session:
        repo = IdeaRepository(session)
        available_categories = await repo.get_all_category_slugs()

    if not available_categories:
        logger.warning(f"[{run_id}] No categories found in database")
        available_categories = ["saas", "ai", "productivity"]  # Fallback

    logger.info(f"[{run_id}] Available categories: {available_categories}")

    # Generate ideas sequentially to avoid rate limits
    idea_ids: list[int] = []
    for i in range(count):
        idea_id = await generate_single_idea(run_id, i, available_categories)
        if idea_id:
            idea_ids.append(idea_id)

    logger.info(
        f"[{run_id}] Batch generation complete: "
        f"{len(idea_ids)}/{count} ideas created successfully"
    )

    return idea_ids
