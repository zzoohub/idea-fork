from fastapi import Request

from inbound.http.errors import BadRequestError

# Mirror the DB constraint: chk_rating_session_id_length (1–255 chars).
_SESSION_ID_MAX_LEN = 255


def get_session_id(request: Request) -> str:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise BadRequestError("Missing session_id cookie.")
    if len(session_id) > _SESSION_ID_MAX_LEN:
        raise BadRequestError("Invalid session_id cookie.")
    return session_id
