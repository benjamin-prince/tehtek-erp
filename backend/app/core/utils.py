"""Common utilities used across modules."""
from datetime import datetime
from uuid import uuid4


def gen_id() -> str:
    """Hex UUID — compact, URL-safe, works everywhere."""
    return uuid4().hex


def short_code(prefix: str, length: int = 6) -> str:
    """Short human-friendly code like SH-A3F92K or INV-2B5D1C."""
    return f"{prefix}-{uuid4().hex[:length].upper()}"


def now() -> datetime:
    return datetime.utcnow()