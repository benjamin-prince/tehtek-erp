"""Auth request/response schemas."""
from pydantic import BaseModel, EmailStr

from app.modules.users.schemas import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    # Self-registration is customer-only — admins/employees are created internally
    # Role defaults to customer and cannot be set from this endpoint.


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"