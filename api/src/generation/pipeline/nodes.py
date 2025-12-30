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
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from src.generation.models.state import (
    GenerationProgress,
    GenerationStatus,
    IdeaConcept,
    IdeaGenerationState,
    PRDContent,
    TaxonomyClassification,
)
from src.generation.pipeline.config import get_pipeline_config
from src.generation.prompts.templates import (
    CLASSIFY_TAXONOMY_PROMPT,
    EXPAND_PRD_PROMPT,
    FORK_CONCEPT_PROMPT,
    GENERATE_CONCEPT_FROM_SEED_PROMPT,
    GENERATE_CONCEPT_PROMPT,
    GENERATE_CONCEPT_WITH_INDUSTRY_PROMPT,
    IDEA_GENERATOR_SYSTEM,
)

# Function type descriptions for prompts (fallback if not in state)
FUNCTION_DESCRIPTIONS = {
    "create": "Tools for content or product generation",
    "automate": "Tools for automating repetitive tasks",
    "analyze": "Tools for data analysis and insights",
    "connect": "Tools for communication and networking",
    "sell": "Tools for sales and monetization",
    "learn": "Tools for education and skill improvement",
    "manage": "Tools for management and organization",
    "protect": "Tools for security, backup, and privacy",
}

# Industry type descriptions for prompts
INDUSTRY_DESCRIPTIONS = {
    "healthcare": "Healthcare and medical services",
    "finance": "Financial services and banking",
    "education": "Education and e-learning",
    "e-commerce": "E-commerce and online retail",
    "entertainment": "Entertainment and media",
    "technology": "Technology and software",
    "retail": "Retail and consumer goods",
    "real-estate": "Real estate and property",
    "travel": "Travel and hospitality",
    "food": "Food and beverage industry",
    "manufacturing": "Manufacturing and production",
    "legal": "Legal services",
    "marketing": "Marketing and advertising",
    "media": "Media and publishing",
}

logger = logging.getLogger(__name__)


def _get_llm() -> ChatGoogleGenerativeAI:
    """Get configured LLM instance."""
    config = get_pipeline_config()
    return ChatGoogleGenerativeAI(
        model=config.llm_model,
        temperature=config.llm_temperature,
        max_output_tokens=config.llm_max_tokens,
        google_api_key=config.google_api_key,
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
    target users, and key features.

    Supports multiple modes:
    1. Fork: If forked_from_id is set, creates variation of existing idea
    2. Seed-based: If idea_seed is provided, structures user's idea
    3. Industry-targeted: If target_industry is set, generates for that industry
    4. Function-only: Default mode, generates based on function type

    Uses target_function and optionally target_industry from state.
    """
    run_id = state["run_id"]
    target_function = state.get("target_function", "create")
    target_industry = state.get("target_industry")
    idea_seed = state.get("idea_seed")

    mode = "fork" if state.get("forked_from_id") else (
        "seed" if idea_seed else (
            "industry" if target_industry else "function"
        )
    )
    logger.info(
        f"[{run_id}] Generating concept for idea {state['idea_index'] + 1} "
        f"(mode={mode}, function={target_function}, industry={target_industry})"
    )

    # Update progress
    progress = _update_progress(
        GenerationStatus.GENERATING_CONCEPT,
        f"Generating {target_function} concept...",
        current_step=1,
    )

    try:
        llm = _get_llm()

        # Check if this is a fork operation
        if state.get("forked_from_id"):
            # Fetch original idea and generate fork
            concept = await _generate_fork_concept(state, llm)
        else:
            # Prepare function context
            function_name = target_function.capitalize()
            function_description = FUNCTION_DESCRIPTIONS.get(
                target_function, f"Tools related to {target_function}"
            )

            # Prepare industry context if available
            industry_name = target_industry.replace("-", " ").title() if target_industry else None
            industry_description = INDUSTRY_DESCRIPTIONS.get(target_industry, "") if target_industry else None

            # Choose prompt based on available context
            if idea_seed:
                # Mode: Seed-based - structure user's idea
                prompt_content = GENERATE_CONCEPT_FROM_SEED_PROMPT.format(
                    idea_seed=idea_seed,
                    function_name=function_name,
                    function_slug=target_function,
                    function_description=function_description,
                    function_name_lower=function_name.lower(),
                    industry_name=industry_name or "General",
                    industry_slug=target_industry or "general",
                    industry_name_lower=(industry_name or "general").lower(),
                )
            elif target_industry:
                # Mode: Industry-targeted - generate for specific industry
                prompt_content = GENERATE_CONCEPT_WITH_INDUSTRY_PROMPT.format(
                    function_name=function_name,
                    function_slug=target_function,
                    function_description=function_description,
                    function_name_lower=function_name.lower(),
                    industry_name=industry_name,
                    industry_slug=target_industry,
                    industry_name_lower=industry_name.lower(),
                )
            else:
                # Mode: Function-only - default generation
                prompt_content = GENERATE_CONCEPT_PROMPT.format(
                    function_name=function_name,
                    function_slug=target_function,
                    function_description=function_description,
                )

            messages = [
                SystemMessage(content=IDEA_GENERATOR_SYSTEM),
                HumanMessage(content=prompt_content),
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
    llm: ChatGoogleGenerativeAI,
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
    """Assign taxonomy (industry, target_user) to the idea.

    This node uses the new taxonomy system to classify the idea.
    The function_slug is already determined by target_function.
    The industry_slug may be pre-selected via target_industry.
    This node determines target_user (and industry if not pre-selected).
    """
    if state.get("error"):
        return {}  # Skip if previous node failed

    concept = state["concept"]
    if not concept:
        return {"error": "No concept to categorize", "completed": False}

    run_id = state["run_id"]
    target_function = state.get("target_function", "create")
    target_industry = state.get("target_industry")  # Pre-selected industry
    available_industries = state.get("available_industries", [])
    available_target_users = state.get("available_target_users", [])

    logger.info(f"[{run_id}] Classifying taxonomy for: {concept['title']} (pre-selected industry: {target_industry})")

    # Update progress
    progress = _update_progress(
        GenerationStatus.CATEGORIZING,
        f"Classifying {concept['title']}...",
        current_step=3,
    )

    # Initialize taxonomy with function and pre-selected industry if available
    taxonomy: TaxonomyClassification = {
        "function_slug": target_function,
        "industry_slug": target_industry if target_industry in available_industries else None,
        "target_user_slug": None,
    }

    # If industry is pre-selected and no target users to classify, skip LLM call
    if taxonomy["industry_slug"] and not available_target_users:
        logger.info(f"[{run_id}] Using pre-selected industry, no target users to classify")
        return {
            "taxonomy": taxonomy,
            "categories": [],
            "progress": progress,
        }

    # If no industries or target users available, use default taxonomy
    if not available_industries and not available_target_users:
        logger.warning(f"[{run_id}] No taxonomy options available, using function only")
        return {
            "taxonomy": taxonomy,
            "categories": [],  # Legacy, empty
            "progress": progress,
        }

    try:
        llm = _get_llm()

        # Format taxonomy options for prompt
        industries_list = "\n".join(f"- {ind}" for ind in available_industries) if available_industries else "None available"
        target_users_list = "\n".join(f"- {tu}" for tu in available_target_users) if available_target_users else "None available"

        function_name = target_function.capitalize()

        prompt = CLASSIFY_TAXONOMY_PROMPT.format(
            title=concept["title"],
            problem=concept["problem"],
            solution=concept["solution"],
            target_users=concept["target_users"],
            function_slug=target_function,
            function_name=function_name,
            industries=industries_list,
            target_users_list=target_users_list,
        )

        messages = [
            SystemMessage(content="You are a product classification expert."),
            HumanMessage(content=prompt),
        ]

        response = await llm.ainvoke(messages)
        response_text = response.content

        # Parse response
        result = _extract_json(response_text)

        # Validate industry (only update if not pre-selected)
        if not taxonomy["industry_slug"]:
            industry_slug = result.get("industry_slug")
            if industry_slug and industry_slug in available_industries:
                taxonomy["industry_slug"] = industry_slug
            elif industry_slug:
                logger.warning(f"[{run_id}] Invalid industry '{industry_slug}', ignoring")

        # Validate target user
        target_user_slug = result.get("target_user_slug")
        if target_user_slug and target_user_slug in available_target_users:
            taxonomy["target_user_slug"] = target_user_slug
        elif target_user_slug:
            logger.warning(f"[{run_id}] Invalid target_user '{target_user_slug}', ignoring")

        logger.info(
            f"[{run_id}] Assigned taxonomy: function={taxonomy['function_slug']}, "
            f"industry={taxonomy['industry_slug']}, target_user={taxonomy['target_user_slug']}"
        )

        return {
            "taxonomy": taxonomy,
            "categories": [],  # Legacy, empty for new system
            "progress": progress,
        }

    except Exception as e:
        logger.error(f"[{run_id}] Failed to classify taxonomy: {e}")
        # Use function-only taxonomy as fallback
        return {
            "taxonomy": taxonomy,
            "categories": [],
            "progress": progress,
        }


async def save_idea(state: IdeaGenerationState) -> dict[str, Any]:
    """Save the generated idea to the database.

    This is the final node that persists the complete idea with taxonomy.
    """
    if state.get("error"):
        logger.error(f"[{state['run_id']}] Skipping save due to previous error: {state['error']}")
        return {"completed": False}

    concept = state.get("concept")
    prd_content = state.get("prd_content")
    taxonomy = state.get("taxonomy")
    categories = state.get("categories", [])  # Legacy

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
        from src.generation.pipeline.repository import IdeaCoreRepository, get_async_session

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

            # Extract taxonomy fields
            function_slug = taxonomy["function_slug"] if taxonomy else state.get("target_function", "create")
            industry_slug = taxonomy["industry_slug"] if taxonomy else None
            target_user_slug = taxonomy["target_user_slug"] if taxonomy else None

            # Create the idea with taxonomy
            idea_id, idea_slug = await repo.create_idea(
                title=concept["title"],
                problem=concept["problem"],
                solution=concept["solution"],
                target_users=concept["target_users"],
                key_features=concept["key_features"],
                prd_content=prd_content or {},
                function_slug=function_slug,
                industry_slug=industry_slug,
                target_user_slug=target_user_slug,
                category_slugs=categories,  # Legacy, can be empty
                user_id=state.get("user_id"),
                forked_from_id=state.get("forked_from_id"),
                is_published=False,  # Ideas need review before publishing
            )

            await session.commit()

            logger.info(
                f"[{run_id}] Saved idea {idea_id} ({idea_slug}): {concept['title']} "
                f"with taxonomy: function={function_slug}, industry={industry_slug}, target_user={target_user_slug}"
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
