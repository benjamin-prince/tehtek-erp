"""User request/response schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.core.rbac import Role


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: Role = Role.CUSTOMER
    profile: Optional[dict] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile: Optional[dict] = None
    is_active: Optional[bool] = None


class UserRead(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    phone: Optional[str]
    role: Role
    profile: Optional[dict]
    is_active: bool
    email_verified: bool
    phone_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True