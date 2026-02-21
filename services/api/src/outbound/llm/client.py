import json
import logging
import re

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from domain.pipeline.models import BriefDraft, ClusteringResult, TaggingResult
from domain.post.models import Post

logger = logging.getLogger(__name__)

_VALID_POST_TYPES = {
    "complaint", "feature_request", "question", "discussion", "other",
}
_VALID_SENTIMENTS = {
    "positive", "negative", "neutral", "mixed",
}
_TAG_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$")
_MAX_TAG_SLUGS = 10
_MAX_STRING_LEN = 5000

_TAGGING_PROMPT = """\
Classify each Reddit post below. For each post, return a JSON object:
- "post_id": the integer ID from [ID:X]
- "post_type": one of "complaint", "feature_request", \
"question", "discussion", "other"
- "sentiment": one of "positive", "negative", "neutral", "mixed"
- "tag_slugs": 1-3 category tag slugs (lowercase, hyphens). \
Examples: "saas", "developer-tools", "mobile-app", \
"customer-support", "pricing", "ux-design", "productivity", \
"e-commerce", "ai-ml", "social-media"

Return a JSON array of objects. No explanation, just valid JSON.

Posts:
{posts_text}"""

_CLUSTERING_PROMPT = """\
Group the following Reddit posts into thematic clusters \
based on the user problem or need they express. \
Each cluster should represent a distinct product opportunity.

For each cluster, output a JSON object with:
- "label": a short descriptive label for the theme
- "summary": a 1-2 sentence summary of the shared problem
- "post_ids": list of integer post IDs belonging to this cluster

Rules:
- Every post must be assigned to exactly one cluster
- Minimum 2 posts per cluster (singletons go to "Miscellaneous")
- Maximum 10 clusters

Return a JSON array. No explanation, just valid JSON.

Posts:
{posts_text}"""

_SYNTHESIS_PROMPT = """\
You are a product analyst. Given a cluster of user complaints, \
synthesize a product opportunity brief.

Cluster label: {label}
Cluster summary: {summary}

Source posts:
{posts_text}

Output a single JSON object with these fields:
- "title": a compelling brief title (50-80 chars)
- "slug": URL-friendly version of the title (lowercase, hyphens)
- "summary": 2-3 sentence executive summary
- "problem_statement": detailed description of the pain point
- "opportunity": description of the product opportunity
- "solution_directions": list of 3-5 concrete solution approaches
- "demand_signals": object with "post_count" (int), \
"subreddit_count" (int), "avg_score" (float), \
"total_comments" (int)
- "source_snapshots": list of objects with "post_id" (int), \
"title" (string), "snippet" (first 200 chars of body), \
"external_url" (string), "subreddit" (string), "score" (int)
- "source_post_ids": list of all post IDs used

Return only valid JSON. No explanation."""


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    match = re.match(
        r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL
    )
    return match.group(1).strip() if match else text


def _post_to_prompt_item(post: Post) -> str:
    body_snippet = (post.body or "")[:500]
    return (
        f"[ID:{post.id}] r/{post.subreddit} | "
        f"score:{post.score} | comments:{post.num_comments}\n"
        f"Title: {post.title}\n"
        f"Body: {body_snippet}"
    )


class AnthropicLlmClient:
    def __init__(
        self,
        api_key: str,
        tagging_model: str,
        synthesis_model: str,
    ) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._tagging_model = tagging_model
        self._synthesis_model = synthesis_model

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=2, max=30),
    )
    async def tag_posts(
        self, posts: list[Post]
    ) -> list[TaggingResult]:
        posts_text = "\n---\n".join(
            _post_to_prompt_item(p) for p in posts
        )
        prompt = _TAGGING_PROMPT.format(posts_text=posts_text)

        message = await self._client.messages.create(
            model=self._tagging_model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = _strip_code_fences(message.content[0].text)
        items = json.loads(raw)

        valid_ids = {p.id for p in posts}
        results: list[TaggingResult] = []
        for item in items:
            post_id = item.get("post_id")
            post_type = item.get("post_type", "other")
            sentiment = item.get("sentiment", "neutral")
            tag_slugs = item.get("tag_slugs", [])

            if post_id not in valid_ids:
                logger.warning("LLM returned unknown post_id %s", post_id)
                continue
            if post_type not in _VALID_POST_TYPES:
                post_type = "other"
            if sentiment not in _VALID_SENTIMENTS:
                sentiment = "neutral"
            tag_slugs = [
                s[:64] for s in tag_slugs
                if isinstance(s, str) and _TAG_SLUG_RE.match(s)
            ][:_MAX_TAG_SLUGS]

            results.append(TaggingResult(
                post_id=post_id,
                post_type=post_type,
                sentiment=sentiment,
                tag_slugs=tag_slugs,
            ))
        return results

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=2, max=30),
    )
    async def cluster_posts(
        self, posts: list[Post]
    ) -> list[ClusteringResult]:
        posts_text = "\n---\n".join(
            _post_to_prompt_item(p) for p in posts
        )
        prompt = _CLUSTERING_PROMPT.format(posts_text=posts_text)

        message = await self._client.messages.create(
            model=self._synthesis_model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = _strip_code_fences(message.content[0].text)
        items = json.loads(raw)

        return [
            ClusteringResult(
                label=item["label"],
                summary=item["summary"],
                post_ids=item["post_ids"],
            )
            for item in items
        ]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=2, max=30),
    )
    async def synthesize_brief(
        self, label: str, summary: str, posts: list[Post]
    ) -> BriefDraft:
        posts_text = "\n---\n".join(
            _post_to_prompt_item(p) for p in posts
        )
        prompt = _SYNTHESIS_PROMPT.format(
            label=label, summary=summary, posts_text=posts_text
        )

        message = await self._client.messages.create(
            model=self._synthesis_model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = _strip_code_fences(message.content[0].text)
        data = json.loads(raw)

        return BriefDraft(
            title=data["title"],
            slug=data["slug"],
            summary=data["summary"],
            problem_statement=data["problem_statement"],
            opportunity=data["opportunity"],
            solution_directions=data["solution_directions"],
            demand_signals=data["demand_signals"],
            source_snapshots=data["source_snapshots"],
            source_post_ids=data["source_post_ids"],
        )
