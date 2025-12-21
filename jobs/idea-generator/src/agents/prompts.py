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

# Template for generating initial idea concept
GENERATE_CONCEPT_PROMPT = """Generate a creative and innovative product idea. This should be a fresh concept that addresses a real problem.

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

# Template for categorizing the idea
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
