"""
LLM prompts for the idea generation pipeline.

Contains system prompts and templates for each generation step.
"""

# System prompt for the idea generation agent
IDEA_GENERATOR_SYSTEM = """You are an innovative product strategist and entrepreneur. Your role is to generate creative, viable product ideas that solve real problems.

Key principles:
- Focus on solving genuine pain points people face
- Consider market viability and technical feasibility
- Target specific user segments with clear needs
- Generate ideas that could realistically be built as MVPs

Generate ideas across various domains: SaaS, mobile apps, e-commerce, health tech, fintech, edtech, developer tools, social platforms, productivity tools, etc."""

# Template for generating initial idea concept (with function context)
GENERATE_CONCEPT_PROMPT = """Generate a creative and innovative product idea focused on the "{function_name}" function.

FUNCTION CONTEXT:
- Function: {function_name} ({function_slug})
- Description: {function_description}

The product should primarily help users to {function_name.lower()} something. Think about tools, platforms, or services that excel at this function.

Requirements:
1. Title: A catchy, descriptive product name (2-4 words)
2. Problem: A clear statement of the problem being solved (2-3 sentences)
3. Solution: How the product solves this problem (2-3 sentences)
4. Target Users: Specific description of who would use this (1-2 sentences)
5. Key Features: Exactly 3 standout features that differentiate the product

Be creative and think beyond obvious solutions. Consider emerging trends, underserved markets, and innovative approaches.

Respond in the following JSON format:
{{
    "title": "Product Name",
    "problem": "Description of the problem...",
    "solution": "How the product solves it...",
    "target_users": "Who would use this...",
    "key_features": [
        "Feature 1 description",
        "Feature 2 description",
        "Feature 3 description"
    ]
}}"""

# Template for generating concept from user's idea seed
GENERATE_CONCEPT_FROM_SEED_PROMPT = """Based on the following user idea, structure and expand it into a complete product concept.

USER'S IDEA:
{idea_seed}

CONTEXT:
- Function: {function_name} ({function_slug}) - {function_description}
- Industry: {industry_name} ({industry_slug})

The product should primarily help users to {function_name_lower} something in the {industry_name_lower} space.

Your task is to take the user's rough idea and develop it into a structured, viable product concept:
1. Extract or create a compelling product title (2-4 words)
2. Clarify the core problem being solved (2-3 sentences)
3. Refine the solution approach (2-3 sentences)
4. Define specific target users (1-2 sentences)
5. Identify exactly 3 key differentiating features

Maintain the spirit of the user's original idea while making it more concrete and actionable.

Respond in the following JSON format:
{{
    "title": "Product Name",
    "problem": "Description of the problem...",
    "solution": "How the product solves it...",
    "target_users": "Who would use this...",
    "key_features": [
        "Feature 1 description",
        "Feature 2 description",
        "Feature 3 description"
    ]
}}"""

# Template for generating concept with industry context
GENERATE_CONCEPT_WITH_INDUSTRY_PROMPT = """Generate a creative and innovative product idea for the {industry_name} industry, focused on the "{function_name}" function.

CONTEXT:
- Function: {function_name} ({function_slug}) - {function_description}
- Target Industry: {industry_name} ({industry_slug})

The product should help users in the {industry_name_lower} space to {function_name_lower} something. Think about specific pain points and opportunities in this industry.

Requirements:
1. Title: A catchy, descriptive product name (2-4 words)
2. Problem: A clear statement of the problem being solved (2-3 sentences)
3. Solution: How the product solves this problem (2-3 sentences)
4. Target Users: Specific description of who would use this (1-2 sentences)
5. Key Features: Exactly 3 standout features that differentiate the product

Be creative and think beyond obvious solutions. Consider industry-specific regulations, workflows, and emerging trends.

Respond in the following JSON format:
{{
    "title": "Product Name",
    "problem": "Description of the problem...",
    "solution": "How the product solves it...",
    "target_users": "Who would use this...",
    "key_features": [
        "Feature 1 description",
        "Feature 2 description",
        "Feature 3 description"
    ]
}}"""

# Legacy template without function context (for backward compatibility)
GENERATE_CONCEPT_PROMPT_LEGACY = """Generate a creative and innovative product idea. This should be a fresh concept that addresses a real problem.

Requirements:
1. Title: A catchy, descriptive product name (2-4 words)
2. Problem: A clear statement of the problem being solved (2-3 sentences)
3. Solution: How the product solves this problem (2-3 sentences)
4. Target Users: Specific description of who would use this (1-2 sentences)
5. Key Features: Exactly 3 standout features that differentiate the product

Be creative and think beyond obvious solutions. Consider emerging trends, underserved markets, and innovative approaches.

Respond in the following JSON format:
{{
    "title": "Product Name",
    "problem": "Description of the problem...",
    "solution": "How the product solves it...",
    "target_users": "Who would use this...",
    "key_features": [
        "Feature 1 description",
        "Feature 2 description",
        "Feature 3 description"
    ]
}}"""

# Template for forking an existing idea with modifications
FORK_CONCEPT_PROMPT = """Based on the following product idea, create a new variation or improvement. Consider the modifications requested and create a fresh take on the concept.

ORIGINAL IDEA:
Title: {title}
Problem: {problem}
Solution: {solution}
Target Users: {target_users}
Key Features:
{key_features}

{modifications_section}

Create a new product concept that:
1. Builds upon or reimagines the original idea
2. Has a distinct title (can be similar but not identical)
3. Addresses the problem from a new angle or for a different audience
4. Incorporates fresh features while potentially keeping successful elements

Respond in the following JSON format:
{{
    "title": "New Product Name",
    "problem": "Description of the problem...",
    "solution": "How the product solves it...",
    "target_users": "Who would use this...",
    "key_features": [
        "Feature 1 description",
        "Feature 2 description",
        "Feature 3 description"
    ]
}}"""

# Template for expanding concept into full PRD
EXPAND_PRD_PROMPT = """Given the following product idea, create a comprehensive PRD (Product Requirements Document).

PRODUCT CONCEPT:
Title: {title}
Problem: {problem}
Solution: {solution}
Target Users: {target_users}
Key Features: {key_features}

Create a detailed PRD with the following sections:

1. Executive Summary (2-3 paragraphs)
   - Product vision and core value proposition
   - Key differentiators
   - Expected impact

2. Problem Definition (2-3 paragraphs)
   - Deep dive into the problem space
   - Current solutions and their limitations
   - Why this matters now

3. Market Analysis (2-3 paragraphs)
   - Market size and opportunity
   - Competitive landscape
   - Target market segments

4. User Personas (2-3 personas)
   - Name and demographics
   - Goals and pain points
   - How they would use the product

5. Feature Descriptions (expand on the 3 key features + 2-3 additional features)
   - Feature name
   - Description
   - User benefit
   - Priority (must-have, should-have, nice-to-have)

6. Tech Stack Recommendations
   - Frontend technologies
   - Backend technologies
   - Database and storage
   - Infrastructure and deployment

7. MVP Roadmap (3-4 phases)
   - Phase name
   - Duration
   - Key deliverables
   - Success criteria

8. Success Metrics (5-7 KPIs)
   - Metric name
   - Description
   - Target value
   - Measurement method

Respond in the following JSON format:
{{
    "executive_summary": "...",
    "problem_definition": "...",
    "market_analysis": "...",
    "user_personas": [
        {{"name": "...", "demographics": "...", "goals": "...", "pain_points": "...", "usage": "..."}}
    ],
    "features": [
        {{"name": "...", "description": "...", "benefit": "...", "priority": "must-have|should-have|nice-to-have"}}
    ],
    "tech_stack": {{
        "frontend": ["..."],
        "backend": ["..."],
        "database": ["..."],
        "infrastructure": ["..."]
    }},
    "mvp_roadmap": [
        {{"phase": "...", "duration": "...", "deliverables": "...", "success_criteria": "..."}}
    ],
    "success_metrics": [
        {{"metric": "...", "description": "...", "target": "...", "measurement": "..."}}
    ]
}}"""

# Template for categorizing the idea (legacy)
CATEGORIZE_PROMPT = """Given the following product idea, select the most appropriate categories from the available list.

PRODUCT:
Title: {title}
Problem: {problem}
Solution: {solution}
Target Users: {target_users}

AVAILABLE CATEGORIES:
{categories}

Select 1-3 categories that best describe this product. Consider:
- Primary domain (what industry/field)
- Product type (SaaS, mobile app, etc.)
- Secondary characteristics if applicable

Respond with a JSON array of category slugs:
{{"categories": ["category-slug-1", "category-slug-2"]}}"""

# Template for taxonomy classification (new system)
CLASSIFY_TAXONOMY_PROMPT = """Given the following product idea, classify it along two dimensions: industry and target user.

PRODUCT:
Title: {title}
Problem: {problem}
Solution: {solution}
Target Users: {target_users}
Function: {function_slug} ({function_name})

AVAILABLE INDUSTRIES:
{industries}

AVAILABLE TARGET USERS:
{target_users_list}

Select the SINGLE most appropriate industry and target user type for this product.

Respond in JSON format:
{{
    "industry_slug": "selected-industry-slug",
    "target_user_slug": "selected-target-user-slug"
}}

If no industry or target user fits well, you may set the value to null."""
