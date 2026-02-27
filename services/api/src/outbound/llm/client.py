import json
import logging
import re
from typing import Any

from google import genai
from tenacity import retry, stop_after_attempt, wait_exponential

from domain.pipeline.models import BriefDraft, ClusteringResult, RawProduct, TaggingResult
from domain.post.models import VALID_POST_TYPES, Post

logger = logging.getLogger(__name__)

_VALID_SENTIMENTS = {
    "positive", "negative", "neutral", "mixed",
}
_TAG_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?$")
_MAX_TAG_SLUGS = 5
_MAX_STRING_LEN = 5000

_TAGGING_PROMPT = """\
Classify each Reddit post below. For each post, return a JSON object:
- "post_id": the integer ID from [ID:X]
- "sentiment": one of "positive", "negative", "neutral", "mixed"
- "post_type": one of "need", "complaint", "feature_request", \
"alternative_seeking", "comparison", "question", "review", \
"showcase", "discussion", "other"
- "tag_slugs": 2-3 TOPIC tags only (e.g. "saas", "developer-tools", \
"mobile-app", "pricing", "ai-ml"). \
Do NOT include post type as a tag.

You MUST reuse existing tags whenever possible. Only create a new tag \
if absolutely no existing tag fits the post content.

Existing tags (REUSE these):
{existing_tags}

Return a JSON array of objects. No explanation, just valid JSON.

Posts:
{posts_text}"""

_SYNTHESIS_PROMPT = """\
You are a product analyst. Given a cluster of user complaints, \
synthesize a product opportunity brief.

Cluster label: {label}
Cluster summary: {summary}

Source posts:
{posts_text}

{trends_section}
{products_section}
Output a single JSON object with these fields:
- "title": a compelling brief title (50-80 chars)
- "slug": URL-friendly version of the title (lowercase, hyphens)
- "summary": 2-3 sentence executive summary
- "problem_statement": detailed description of the pain point
- "opportunity": description of the product opportunity
- "solution_directions": list of 3-5 concrete solution approaches
- "demand_signals": object with "post_count" (int), \
"subreddit_count" (int), "avg_score" (float), \
"total_comments" (int){demand_signals_extra}
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


class GeminiLlmClient:
    def __init__(
        self,
        api_key: str,
        model: str,
        lite_model: str = "gemini-2.5-flash-lite",
        brief_temperature: float = 0.9,
    ) -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._lite_model = lite_model
        self._brief_temperature = brief_temperature

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=2, max=30),
    )
    async def tag_posts(
        self, posts: list[Post], *, existing_tags: list[str] | None = None,
    ) -> list[TaggingResult]:
        posts_text = "\n---\n".join(
            _post_to_prompt_item(p) for p in posts
        )
        safe_tags = [s for s in (existing_tags or []) if _TAG_SLUG_RE.match(s)]
        tags_text = ", ".join(safe_tags) if safe_tags else "(none yet)"
        prompt = _TAGGING_PROMPT.format(
            posts_text=posts_text, existing_tags=tags_text,
        )

        response = await self._client.aio.models.generate_content(
            model=self._lite_model,
            contents=prompt,
        )

        if not response.text:
            raise ValueError("Gemini returned empty response (possibly safety-filtered)")

        raw = _strip_code_fences(response.text)
        items = json.loads(raw)

        valid_ids = {p.id for p in posts}
        results: list[TaggingResult] = []
        for item in items:
            post_id = item.get("post_id")
            if not isinstance(post_id, int):
                logger.warning("LLM returned non-int post_id %r", post_id)
                continue
            sentiment = item.get("sentiment", "neutral")
            post_type = item.get("post_type", "other")
            tag_slugs = item.get("tag_slugs", [])

            if post_id not in valid_ids:
                logger.warning("LLM returned unknown post_id %s", post_id)
                continue
            if sentiment not in _VALID_SENTIMENTS:
                sentiment = "neutral"
            if post_type not in VALID_POST_TYPES:
                post_type = "other"
            tag_slugs = [
                s[:64] for s in tag_slugs
                if isinstance(s, str) and _TAG_SLUG_RE.match(s)
            ][:_MAX_TAG_SLUGS]

            results.append(TaggingResult(
                post_id=post_id,
                sentiment=sentiment,
                post_type=post_type,
                tag_slugs=tag_slugs,
            ))
        return results

    async def cluster_posts(
        self, posts: list[Post]
    ) -> list[ClusteringResult]:
        if len(posts) < 3:
            return [ClusteringResult(
                label="General",
                summary="Mixed topics",
                post_ids=[p.id for p in posts],
            )]

        # 1. Generate embeddings (batch to stay under API limit of 100)
        texts = [f"{p.title} {(p.body or '')[:300]}" for p in posts]
        embeddings: list[list[float]] = []
        for i in range(0, len(texts), 100):
            batch = await self._get_embeddings(texts[i : i + 100])
            embeddings.extend(batch)

        # 2. HDBSCAN clustering
        groups = self._hdbscan_cluster(embeddings, posts)

        # 3. Label clusters via LLM
        labeled = await self._label_clusters(groups, posts)
        return labeled

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=2, max=30),
    )
    async def _get_embeddings(self, texts: list[str]) -> list[list[float]]:
        result = await self._client.aio.models.embed_content(
            model="gemini-embedding-001",
            contents=texts,
        )
        return [e.values for e in result.embeddings]

    def _hdbscan_cluster(
        self, embeddings: list[list[float]], posts: list[Post]
    ) -> dict[int, list[int]]:
        import numpy as np
        from sklearn.cluster import HDBSCAN

        X = np.array(embeddings)
        clusterer = HDBSCAN(min_cluster_size=3, min_samples=2)
        labels = clusterer.fit_predict(X)

        groups: dict[int, list[int]] = {}
        noise_ids: list[int] = []
        for idx, label in enumerate(labels):
            if label == -1:
                noise_ids.append(posts[idx].id)
            else:
                groups.setdefault(int(label), []).append(posts[idx].id)

        if noise_ids:
            groups[-1] = noise_ids

        return groups

    async def _label_clusters(
        self, groups: dict[int, list[int]], posts: list[Post]
    ) -> list[ClusteringResult]:
        import asyncio

        post_map = {p.id: p for p in posts}
        results: list[ClusteringResult] = []

        # Separate noise cluster from real clusters
        noise_ids = groups.get(-1)
        if noise_ids is not None:
            results.append(ClusteringResult(
                label="Miscellaneous",
                summary="Posts that don't fit into other clusters",
                post_ids=noise_ids,
            ))

        # Label real clusters in parallel
        async def _label_one(cluster_label: int, post_ids: list[int]) -> ClusteringResult:
            titles = [
                post_map[pid].title for pid in post_ids if pid in post_map
            ][:10]
            prompt = (
                "Given these post titles from one thematic cluster, generate a "
                "JSON object with 'label' (short descriptive label) and 'summary' "
                "(1 sentence). Titles:\n"
                + "\n".join(f"- {t}" for t in titles)
                + "\nReturn only valid JSON."
            )

            response = await self._client.aio.models.generate_content(
                model=self._lite_model, contents=prompt,
            )
            if not response.text:
                return ClusteringResult(
                    label=f"Cluster {cluster_label}",
                    summary="",
                    post_ids=post_ids,
                )
            raw = _strip_code_fences(response.text)
            data = json.loads(raw)
            if isinstance(data, list):
                data = data[0] if data else {}

            return ClusteringResult(
                label=data.get("label", f"Cluster {cluster_label}"),
                summary=data.get("summary", ""),
                post_ids=post_ids,
            )

        tasks = [
            _label_one(cl, pids)
            for cl, pids in groups.items()
            if cl != -1
        ]
        if tasks:
            labeled = await asyncio.gather(*tasks)
            results.extend(labeled)

        return results

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=2, max=30),
    )
    async def synthesize_brief(
        self,
        label: str,
        summary: str,
        posts: list[Post],
        *,
        trends_data: dict[str, Any] | None = None,
        related_products: list[RawProduct] | None = None,
    ) -> BriefDraft:
        posts_text = "\n---\n".join(
            _post_to_prompt_item(p) for p in posts
        )

        # Build optional sections
        trends_section = ""
        demand_signals_extra = ""
        if trends_data:
            trends_section = (
                "Google Trends data for related keywords:\n"
                f"{json.dumps(trends_data, default=str)}\n"
            )
            demand_signals_extra = ', "trend_data" (object with trend info)'

        products_section = ""
        if related_products:
            products_text = "\n".join(
                f"- {p.name}: {p.tagline or 'N/A'} ({p.url or 'no url'})"
                for p in related_products[:10]
            )
            products_section = (
                "Related recently launched products (for competitive context):\n"
                f"{products_text}\n\n"
                'Include a "competitive_landscape" field in your JSON output '
                "with analysis of existing solutions and gaps.\n"
            )
            demand_signals_extra += ', "competitive_landscape" (string with analysis)'

        prompt = _SYNTHESIS_PROMPT.format(
            label=label,
            summary=summary,
            posts_text=posts_text,
            trends_section=trends_section,
            products_section=products_section,
            demand_signals_extra=demand_signals_extra,
        )

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=prompt,
            config={"temperature": self._brief_temperature},
        )

        if not response.text:
            raise ValueError("Gemini returned empty response (possibly safety-filtered)")

        raw = _strip_code_fences(response.text)
        data = json.loads(raw)

        return BriefDraft(
            title=str(data["title"])[:200],
            slug=str(data["slug"])[:200],
            summary=str(data["summary"])[:_MAX_STRING_LEN],
            problem_statement=str(data["problem_statement"])[:_MAX_STRING_LEN],
            opportunity=str(data["opportunity"])[:_MAX_STRING_LEN],
            solution_directions=data["solution_directions"],
            demand_signals=data["demand_signals"],
            source_snapshots=data["source_snapshots"],
            source_post_ids=[
                pid for pid in data["source_post_ids"] if isinstance(pid, int)
            ],
        )
