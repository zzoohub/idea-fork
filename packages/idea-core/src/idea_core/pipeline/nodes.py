"""
LangGraph node functions for the idea generation pipeline.

Each node represents a step in the pipeline:
1. generate_concept: Creates initial idea concept (or forks existing)
2. expand_prd: Expands concept into full PRD
3. categorize: Assigns categories
4. save: Persists to database
"""

import json
import logging
import re
from typing import Any, Callable, Optional

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from idea_core.models.state import (
    GenerationProgress,
    GenerationStatus,
    IdeaConcept,
    IdeaGenerationState,
    PRDContent,
)
from idea_core.pipeline.config import get_settings
from idea_core.prompts.templates import (
    CATEGORIZE_PROMPT,
    EXPAND_PRD_PROMPT,
    FORK_CONCEPT_PROMPT,
    GENERATE_CONCEPT_PROMPT,
    IDEA_GENERATOR_SYSTEM,
)

logger = logging.getLogger(__name__)


def _get_llm() -> ChatAnthropic:
    """Get configured LLM instance."""
    settings = get_settings()
    return ChatAnthropic(
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        api_key=settings.anthropic_api_key,
    )


def _extract_json(text: str) -> dict[str, Any]:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Try to find JSON in code blocks first
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if json_match:
        text = json_match.group(1)

    # Find JSON object or array
    json_pattern = r"(\{[\s\S]*\}|\[[\s\S]*\])"
    match = re.search(json_pattern, text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON: {e}")
            raise ValueError(f"Invalid JSON in response: {e}")

    raise ValueError("No JSON found in response")


def _update_progress(
    status: GenerationStatus,
    message: str,
    current_step: int = 0,
) -> GenerationProgress:
    """Create a progress update."""
    return GenerationProgress(
        status=status,
        current_step=current_step,
        total_steps=4,
        message=message,
    )


async def generate_concept(state: IdeaGenerationState) -> dict[str, Any]:
    """Generate initial idea concept or fork from existing.

    This node creates the core idea: title, problem, solution,
    target users, and key features. If forked_from_id is set,
    it will fetch and modify the existing idea.
    """
    run_id = state["run_id"]
    logger.info(f"[{run_id}] Generating concept for idea {state['idea_index'] + 1}")

    # Update progress
    progress = _update_progress(
        GenerationStatus.GENERATING_CONCEPT,
        "Generating initial concept...",
        current_step=1,
    )

    try:
        llm = _get_llm()

        # Check if this is a fork operation
        if state.get("forked_from_id"):
            # Fetch original idea and generate fork
            concept = await _generate_fork_concept(state, llm)
        else:
            # Generate new concept
            messages = [
                SystemMessage(content=IDEA_GENERATOR_SYSTEM),
                HumanMessage(content=GENERATE_CONCEPT_PROMPT),
            ]

            response = await llm.ainvoke(messages)
            response_text = response.content

            # Parse response
            concept_data = _extract_json(response_text)

            # Validate required fields
            required_fields = ["title", "problem", "solution", "target_users", "key_features"]
            for field in required_fields:
                if field not in concept_data:
                    raise ValueError(f"Missing required field: {field}")

            # Ensure key_features is a list of exactly 3 items
            if not isinstance(concept_data["key_features"], list):
                raise ValueError("key_features must be a list")
            if len(concept_data["key_features"]) < 3:
                raise ValueError("key_features must have at least 3 items")
            concept_data["key_features"] = concept_data["key_features"][:3]

            concept: IdeaConcept = {
                "title": concept_data["title"],
                "problem": concept_data["problem"],
                "solution": concept_data["solution"],
                "target_users": concept_data["target_users"],
                "key_features": concept_data["key_features"],
            }

        logger.info(f"[{run_id}] Generated concept: {concept['title']}")

        return {"concept": concept, "progress": progress}

    except Exception as e:
        logger.error(f"[{run_id}] Failed to generate concept: {e}")
        return {
            "error": str(e),
            "completed": False,
            "progress": _update_progress(
                GenerationStatus.FAILED,
                f"Failed to generate concept: {e}",
                current_step=1,
            ),
        }


async def _generate_fork_concept(
    state: IdeaGenerationState,
    llm: ChatAnthropic,
) -> IdeaConcept:
    """Generate a forked concept based on an existing idea.

    This is called when forked_from_id is set in the state.
    The original idea should be pre-loaded in fork_modifications.
    """
    run_id = state["run_id"]
    fork_mods = state.get("fork_modifications", {}) or {}

    # Get original idea data from fork_modifications
    original = fork_mods.get("original_idea", {})
    if not original:
        raise ValueError("Original idea data required for forking")

    # Build modifications section
    modifications_section = ""
    user_mods = fork_mods.get("modifications", {})
    if user_mods:
        mod_parts = []
        if user_mods.get("focus"):
            mod_parts.append(f"New focus: {user_mods['focus']}")
        if user_mods.get("target_audience"):
            mod_parts.append(f"New target audience: {user_mods['target_audience']}")
        if user_mods.get("industry"):
            mod_parts.append(f"Apply to industry: {user_mods['industry']}")
        if user_mods.get("additional_notes"):
            mod_parts.append(f"Additional notes: {user_mods['additional_notes']}")

        if mod_parts:
            modifications_section = "REQUESTED MODIFICATIONS:\n" + "\n".join(f"- {m}" for m in mod_parts)

    # Format key features
    key_features = original.get("key_features", [])
    if isinstance(key_features, list):
        key_features_str = "\n".join(f"- {f}" for f in key_features)
    else:
        key_features_str = str(key_features)

    prompt = FORK_CONCEPT_PROMPT.format(
        title=original.get("title", ""),
        problem=original.get("problem", ""),
        solution=original.get("solution", ""),
        target_users=original.get("target_users", ""),
        key_features=key_features_str,
        modifications_section=modifications_section,
    )

    messages = [
        SystemMessage(content=IDEA_GENERATOR_SYSTEM),
        HumanMessage(content=prompt),
    ]

    response = await llm.ainvoke(messages)
    response_text = response.content

    # Parse response
    concept_data = _extract_json(response_text)

    # Validate required fields
    required_fields = ["title", "problem", "solution", "target_users", "key_features"]
    for field in required_fields:
        if field not in concept_data:
            raise ValueError(f"Missing required field: {field}")

    # Ensure key_features is a list of exactly 3 items
    if not isinstance(concept_data["key_features"], list):
        raise ValueError("key_features must be a list")
    if len(concept_data["key_features"]) < 3:
        raise ValueError("key_features must have at least 3 items")
    concept_data["key_features"] = concept_data["key_features"][:3]

    concept: IdeaConcept = {
        "title": concept_data["title"],
        "problem": concept_data["problem"],
        "solution": concept_data["solution"],
        "target_users": concept_data["target_users"],
        "key_features": concept_data["key_features"],
    }

    logger.info(f"[{run_id}] Generated fork concept: {concept['title']}")

    return concept


async def expand_prd(state: IdeaGenerationState) -> dict[str, Any]:
    """Expand concept into full PRD content.

    This node creates detailed PRD including executive summary,
    market analysis, user personas, features, tech stack, roadmap,
    and success metrics.
    """
    if state.get("error"):
        return {}  # Skip if previous node failed

    concept = state["concept"]
    if not concept:
        return {"error": "No concept to expand", "completed": False}

    run_id = state["run_id"]
    logger.info(f"[{run_id}] Expanding PRD for: {concept['title']}")

    # Update progress
    progress = _update_progress(
        GenerationStatus.EXPANDING_PRD,
        f"Expanding PRD for {concept['title']}...",
        current_step=2,
    )

    try:
        llm = _get_llm()

        # Format prompt with concept details
        prompt = EXPAND_PRD_PROMPT.format(
            title=concept["title"],
            problem=concept["problem"],
            solution=concept["solution"],
            target_users=concept["target_users"],
            key_features="\n".join(f"- {f}" for f in concept["key_features"]),
        )

        messages = [
            SystemMessage(content=IDEA_GENERATOR_SYSTEM),
            HumanMessage(content=prompt),
        ]

        response = await llm.ainvoke(messages)
        response_text = response.content

        # Parse response
        prd_data = _extract_json(response_text)

        # Validate and structure PRD content
        prd_content: PRDContent = {
            "executive_summary": prd_data.get("executive_summary", ""),
            "problem_definition": prd_data.get("problem_definition", ""),
            "market_analysis": prd_data.get("market_analysis", ""),
            "user_personas": prd_data.get("user_personas", []),
            "features": prd_data.get("features", []),
            "tech_stack": prd_data.get("tech_stack", {}),
            "mvp_roadmap": prd_data.get("mvp_roadmap", []),
            "success_metrics": prd_data.get("success_metrics", []),
        }

        logger.info(f"[{run_id}] Expanded PRD with {len(prd_content['features'])} features")

        return {"prd_content": prd_content, "progress": progress}

    except Exception as e:
        logger.error(f"[{run_id}] Failed to expand PRD: {e}")
        return {
            "error": str(e),
            "completed": False,
            "progress": _update_progress(
                GenerationStatus.FAILED,
                f"Failed to expand PRD: {e}",
                current_step=2,
            ),
        }


async def categorize(state: IdeaGenerationState) -> dict[str, Any]:
    """Assign categories to the idea.

    This node selects appropriate categories from the available list
    based on the idea content.
    """
    if state.get("error"):
        return {}  # Skip if previous node failed

    concept = state["concept"]
    if not concept:
        return {"error": "No concept to categorize", "completed": False}

    run_id = state["run_id"]
    available_categories = state.get("available_categories", [])
    if not available_categories:
        logger.warning(f"[{run_id}] No categories available, using defaults")
        return {
            "categories": ["saas"],
            "progress": _update_progress(
                GenerationStatus.CATEGORIZING,
                "Using default category",
                current_step=3,
            ),
        }

    logger.info(f"[{run_id}] Categorizing: {concept['title']}")

    # Update progress
    progress = _update_progress(
        GenerationStatus.CATEGORIZING,
        f"Categorizing {concept['title']}...",
        current_step=3,
    )

    try:
        llm = _get_llm()

        # Format categories for prompt
        categories_list = "\n".join(f"- {cat}" for cat in available_categories)

        prompt = CATEGORIZE_PROMPT.format(
            title=concept["title"],
            problem=concept["problem"],
            solution=concept["solution"],
            target_users=concept["target_users"],
            categories=categories_list,
        )

        messages = [
            SystemMessage(content="You are a product categorization expert."),
            HumanMessage(content=prompt),
        ]

        response = await llm.ainvoke(messages)
        response_text = response.content

        # Parse response
        result = _extract_json(response_text)
        categories = result.get("categories", [])

        # Validate categories exist in available list
        valid_categories = [cat for cat in categories if cat in available_categories]

        if not valid_categories:
            # Fallback to first available category
            valid_categories = [available_categories[0]]
            logger.warning(f"[{run_id}] No valid categories found, using: {valid_categories}")

        logger.info(f"[{run_id}] Assigned categories: {valid_categories}")

        return {"categories": valid_categories, "progress": progress}

    except Exception as e:
        logger.error(f"[{run_id}] Failed to categorize: {e}")
        # Use fallback category instead of failing
        return {
            "categories": [available_categories[0]] if available_categories else ["saas"],
            "progress": progress,
        }


async def save_idea(state: IdeaGenerationState) -> dict[str, Any]:
    """Save the generated idea to the database.

    This is the final node that persists the complete idea.
    """
    if state.get("error"):
        logger.error(f"[{state['run_id']}] Skipping save due to previous error: {state['error']}")
        return {"completed": False}

    concept = state.get("concept")
    prd_content = state.get("prd_content")
    categories = state.get("categories", [])

    if not concept:
        return {"error": "No concept to save", "completed": False}

    run_id = state["run_id"]
    logger.info(f"[{run_id}] Saving idea: {concept['title']}")

    # Update progress
    progress = _update_progress(
        GenerationStatus.SAVING,
        f"Saving {concept['title']}...",
        current_step=4,
    )

    try:
        from idea_core.pipeline.repository import IdeaCoreRepository, get_async_session

        async with get_async_session() as session:
            repo = IdeaCoreRepository(session)

            # Check for duplicates
            if await repo.idea_exists_with_title(concept["title"]):
                logger.warning(f"[{run_id}] Similar idea already exists: {concept['title']}")
                return {
                    "error": "Similar idea already exists",
                    "completed": False,
                    "progress": _update_progress(
                        GenerationStatus.FAILED,
                        "Similar idea already exists",
                        current_step=4,
                    ),
                }

            # Create the idea
            idea_id, idea_slug = await repo.create_idea(
                title=concept["title"],
                problem=concept["problem"],
                solution=concept["solution"],
                target_users=concept["target_users"],
                key_features=concept["key_features"],
                prd_content=prd_content or {},
                category_slugs=categories,
                user_id=state.get("user_id"),
                forked_from_id=state.get("forked_from_id"),
                is_published=False,  # Ideas need review before publishing
            )

            await session.commit()

            logger.info(
                f"[{run_id}] Saved idea {idea_id} ({idea_slug}): {concept['title']} "
                f"with categories {categories}"
            )

            return {
                "idea_id": idea_id,
                "idea_slug": idea_slug,
                "completed": True,
                "progress": _update_progress(
                    GenerationStatus.COMPLETED,
                    f"Successfully generated: {concept['title']}",
                    current_step=4,
                ),
            }

    except Exception as e:
        logger.error(f"[{run_id}] Failed to save idea: {e}")
        return {
            "error": str(e),
            "completed": False,
            "progress": _update_progress(
                GenerationStatus.FAILED,
                f"Failed to save idea: {e}",
                current_step=4,
            ),
        }
