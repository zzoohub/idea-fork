from domain.post.errors import PostNotFoundError
from domain.post.models import Post, PostListParams
from domain.post.ports import PostRepository


class PostService:
    def __init__(self, repo: PostRepository) -> None:
        self._repo = repo

    async def list_posts(self, params: PostListParams) -> list[Post]:
        return await self._repo.list_posts(params)

    async def get_post(self, post_id: int) -> Post:
        post = await self._repo.get_post(post_id)
        if post is None:
            raise PostNotFoundError(post_id)
        return post
