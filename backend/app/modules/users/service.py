"""User service — business logic.

Keeping service separate from the router means:
- Routers stay thin (just HTTP concerns)
- Services are testable without FastAPI
- Services are reusable (e.g. from a CLI, background job, etc.)
"""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password, verify_password
from app.core.utils import now
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserUpdate


async def create_user(session: AsyncSession, data: UserCreate) -> User:
    existing = await session.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise ConflictError("Email already registered")

    user = User(
        email=data.email,
        phone=data.phone,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        profile=data.profile,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_by_id(session: AsyncSession, user_id: str) -> User:
    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user


async def get_by_email(session: AsyncSession, email: str) -> Optional[User]:
    return (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()


async def authenticate(session: AsyncSession, email: str, password: str) -> Optional[User]:
    user = await get_by_email(session, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


async def update_user(session: AsyncSession, user: User, data: UserUpdate) -> User:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    user.updated_at = now()
    await session.commit()
    await session.refresh(user)
    return user


async def list_users(
    session: AsyncSession,
    role: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[User]:
    query = select(User).order_by(User.created_at.desc())
    if role:
        query = query.where(User.role == role)
    result = await session.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())