from unittest.mock import AsyncMock

import pytest

from domain.post.errors import PostNotFoundError
from domain.post.models import PostListParams
from domain.post.service import PostService
from tests.conftest import make_post


@pytest.mark.asyncio
async def test_list_posts_delegates_to_repo():
    repo = AsyncMock()
    repo.list_posts = AsyncMock(return_value=[make_post(1)])
    svc = PostService(repo)

    params = PostListParams()
    result = await svc.list_posts(params)
    assert len(result) == 1
    repo.list_posts.assert_called_once_with(params)


@pytest.mark.asyncio
async def test_get_post_found():
    repo = AsyncMock()
    repo.get_post = AsyncMock(return_value=make_post(42))
    svc = PostService(repo)

    post = await svc.get_post(42)
    assert post.id == 42


@pytest.mark.asyncio
async def test_get_post_not_found_raises():
    repo = AsyncMock()
    repo.get_post = AsyncMock(return_value=None)
    svc = PostService(repo)

    with pytest.raises(PostNotFoundError):
        await svc.get_post(99999)
