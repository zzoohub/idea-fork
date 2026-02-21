from typing import Protocol

from domain.post.models import Post, PostListParams


class PostRepository(Protocol):
    async def list_posts(self, params: PostListParams) -> list[Post]: ...

    async def get_post(self, post_id: int) -> Post | None: ...
