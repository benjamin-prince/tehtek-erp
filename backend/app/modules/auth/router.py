"""Auth endpoints — register (customer), login, refresh."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.rbac import Role
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.modules.auth.schemas import (
    AccessToken,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.modules.users import service as user_service
from app.modules.users.schemas import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_pair(user) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(
            subject=user.id, extra_claims={"role": user.role.value}
        ),
        refresh_token=create_refresh_token(subject=user.id),
        user=UserRead.model_validate(user),
    )


@router.post("/register", response_model=TokenPair, status_code=201)
async def register(data: RegisterRequest, session: AsyncSession = Depends(get_session)):
    """Self-registration is always `customer` role. Internal roles are created
    via the users admin endpoints."""
    user = await user_service.create_user(
        session,
        UserCreate(
            email=data.email,
            password=data.password,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            role=Role.CUSTOMER,
        ),
    )
    return _token_pair(user)


@router.post("/login", response_model=TokenPair)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_session)):
    user = await user_service.authenticate(session, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return _token_pair(user)


@router.post("/refresh", response_model=AccessToken)
async def refresh_token(data: RefreshRequest, session: AsyncSession = Depends(get_session)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await user_service.get_by_id(session, payload["sub"])
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")

    return AccessToken(
        access_token=create_access_token(
            subject=user.id, extra_claims={"role": user.role.value}
        )
    )