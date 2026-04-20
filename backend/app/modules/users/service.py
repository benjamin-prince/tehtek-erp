"""User service — business logic."""
from datetime import date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, or_

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.core.security import hash_password, verify_password
from app.core.utils import now
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserUpdate


MIN_AGE_YEARS = 13


def _validate_dob(dob: Optional[date]) -> None:
    if dob is None:
        return
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < MIN_AGE_YEARS:
        raise AppError(f"User must be at least {MIN_AGE_YEARS} years old")
    if dob > today:
        raise AppError("Date of birth cannot be in the future")


def _normalize(data: dict) -> dict:
    if data.get("email"):
        data["email"] = data["email"].strip().lower()
    for k in ("nationality", "country", "id_document_issuing_country"):
        if data.get(k):
            data[k] = data[k].upper()
    return data


async def create_user(session: AsyncSession, data: UserCreate) -> User:
    _validate_dob(data.date_of_birth)

    normalized = _normalize(data.model_dump())

    existing = await session.execute(
        select(User).where(User.email == normalized["email"])
    )
    if existing.scalar_one_or_none():
        raise ConflictError("Email already registered")

    password = normalized.pop("password")
    user = User(**normalized, hashed_password=hash_password(password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_by_id(session: AsyncSession, user_id: str) -> User:
    user = (
        await session.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user


async def get_by_email(session: AsyncSession, email: str) -> Optional[User]:
    normalized = email.strip().lower()
    return (
        await session.execute(select(User).where(User.email == normalized))
    ).scalar_one_or_none()


async def authenticate(
    session: AsyncSession, email: str, password: str
) -> Optional[User]:
    user = await get_by_email(session, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    user.last_login_at = now()
    await session.commit()
    return user


async def update_user(
    session: AsyncSession, user: User, data: UserUpdate
) -> User:
    updates = data.model_dump(exclude_unset=True)

    if "date_of_birth" in updates:
        _validate_dob(updates["date_of_birth"])

    updates = _normalize(updates)

    for k, v in updates.items():
        setattr(user, k, v)

    user.updated_at = now()
    await session.commit()
    await session.refresh(user)
    return user


async def list_users(
    session: AsyncSession,
    role: Optional[str] = None,
    country: Optional[str] = None,
    search: Optional[str] = None,
    active_only: bool = True,
    limit: int = 50,
    offset: int = 0,
) -> list[User]:
    query = select(User).order_by(User.created_at.desc())

    if role:
        query = query.where(User.role == role)
    if country:
        query = query.where(User.country == country.upper())
    if active_only:
        query = query.where(User.is_active == True)  # noqa: E712
    if search:
        pattern = f"%{search.lower()}%"
        # Match name parts, email, or phone. For fancier name search later,
        # add a Postgres generated column or a tsvector index.
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
            )
        )

    result = await session.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())