import re

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = _SLUG_RE.sub("-", slug)
    return slug.strip("-")
