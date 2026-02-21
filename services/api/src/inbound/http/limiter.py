from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _rate_limit_key(request: Request) -> str:
    session_id = request.cookies.get("session_id")
    return session_id or get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key)
