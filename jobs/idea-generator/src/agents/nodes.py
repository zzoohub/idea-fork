"""
LangGraph node functions for the idea generation pipeline.

Each node represents a step in the pipeline:
1. generate_concept: Creates initial idea concept
2. expand_prd: Expands concept into full PRD
3. categorize: Assigns categories
4. save: Persists to database
"""

import json
import re
from typing import Any

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from src.agents.prompts import (
    CATEGORIZE_PROMPT,
    EXPAND_PRD_PROMPT,
    GENERATE_CONCEPT_PROMPT,
    IDEA_GENERATOR_SYSTEM,
)
from src.agents.state import IdeaConcept, IdeaGenerationState, PRDContent
from src.core.config import settings
from src.core.logging import get_logger
from src.db.database import get_session
from src.db.repository import IdeaRepository

logger = get_logger(__name__)


def _get_llm() -> ChatAnthropic:
    """Get configured LLM instance."""
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


async def generate_concept(state: IdeaGenerationState) -> dict[str, Any]:
    """Generate initial idea concept.

    This node creates the core idea: title, problem, solution,
    target users, and key features.
    """
    logger.info(f"[{state['run_id']}] Generating concept for idea {state['idea_index'] + 1}")

    try:
        llm = _get_llm()

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

        logger.info(f"[{state['run_id']}] Generated concept: {concept['title']}")

        return {"concept": concept}

    except Exception as e:
        logger.error(f"[{state['run_id']}] Failed to generate concept: {e}")
        return {"error": str(e), "completed": False}


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

    logger.info(f"[{state['run_id']}] Expanding PRD for: {concept['title']}")

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

        logger.info(f"[{state['run_id']}] Expanded PRD with {len(prd_content['features'])} features")

        return {"prd_content": prd_content}

    except Exception as e:
        logger.error(f"[{state['run_id']}] Failed to expand PRD: {e}")
        return {"error": str(e), "completed": False}


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

    available_categories = state.get("available_categories", [])
    if not available_categories:
        logger.warning(f"[{state['run_id']}] No categories available, using defaults")
        return {"categories": ["saas"]}  # Default fallback

    logger.info(f"[{state['run_id']}] Categorizing: {concept['title']}")

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
        valid_categories = [
            cat for cat in categories if cat in available_categories
        ]

        if not valid_categories:
            # Fallback to first available category
            valid_categories = [available_categories[0]]
            logger.warning(
                f"[{state['run_id']}] No valid categories found, using: {valid_categories}"
            )

        logger.info(f"[{state['run_id']}] Assigned categories: {valid_categories}")

        return {"categories": valid_categories}

    except Exception as e:
        logger.error(f"[{state['run_id']}] Failed to categorize: {e}")
        # Use fallback category instead of failing
        return {"categories": [available_categories[0]] if available_categories else ["saas"]}


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

    logger.info(f"[{state['run_id']}] Saving idea: {concept['title']}")

    try:
        async with get_session() as session:
            repo = IdeaRepository(session)

            # Check for duplicates
            if await repo.idea_exists_with_title(concept["title"]):
                logger.warning(
                    f"[{state['run_id']}] Similar idea already exists: {concept['title']}"
                )
                return {"error": "Similar idea already exists", "completed": False}

            # Create the idea
            idea_id = await repo.create_idea(
                title=concept["title"],
                problem=concept["problem"],
                solution=concept["solution"],
                target_users=concept["target_users"],
                key_features=concept["key_features"],
                prd_content=prd_content or {},
                category_slugs=categories,
                is_published=False,  # Ideas need review before publishing
            )

            await session.commit()

            logger.info(
                f"[{state['run_id']}] Saved idea {idea_id}: {concept['title']} "
                f"with categories {categories}"
            )

            return {"idea_id": idea_id, "completed": True}

    except Exception as e:
        logger.error(f"[{state['run_id']}] Failed to save idea: {e}")
        return {"error": str(e), "completed": False}
