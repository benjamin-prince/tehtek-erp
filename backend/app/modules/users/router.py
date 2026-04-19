"""User endpoints — admin/manager management of users."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.modules.users import service
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def read_me(current: User = Depends(get_current_user)):
    return current


@router.patch("/me", response_model=UserRead)
async def update_me(
    data: UserUpdate,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Regular users cannot flip themselves inactive
    data_dict = data.model_dump(exclude_unset=True)
    data_dict.pop("is_active", None)
    return await service.update_user(session, current, UserUpdate(**data_dict))


@router.get("", response_model=list[UserRead])
async def list_users(
    role: Role | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.USER_READ)),
):
    return await service.list_users(session, role=role.value if role else None, limit=limit, offset=offset)


@router.post("", response_model=UserRead, status_code=201)
async def create_user(
    data: UserCreate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.USER_MANAGE)),
):
    return await service.create_user(session, data)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.USER_READ)),
):
    return await service.get_by_id(session, user_id)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str,
    data: UserUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.USER_MANAGE)),
):
    user = await service.get_by_id(session, user_id)
    return await service.update_user(session, user, data)