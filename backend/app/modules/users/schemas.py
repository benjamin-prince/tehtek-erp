"""User request/response schemas."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

from app.core.rbac import Role
from app.modules.users.models import Gender, IdDocumentType


class UserBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    middle_name: Optional[str] = Field(default=None, max_length=80)

    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    nationality: Optional[str] = Field(default=None, min_length=2, max_length=2)

    id_document_type: Optional[IdDocumentType] = None
    id_document_number: Optional[str] = None
    id_document_expires_at: Optional[date] = None
    id_document_issuing_country: Optional[str] = Field(
        default=None, min_length=2, max_length=2
    )

    email: EmailStr
    phone: Optional[str] = None
    phone_secondary: Optional[str] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = Field(default=None, min_length=2, max_length=2)
    postal_code: Optional[str] = None

    role: Role = Role.CUSTOMER

    preferred_language: str = "en"
    preferred_currency: str = "EUR"
    timezone: Optional[str] = None

    profile: Optional[dict] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("nationality", "country", "id_document_issuing_country")
    @classmethod
    def _upper_country(cls, v: Optional[str]) -> Optional[str]:
        return v.upper() if v else v


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None

    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    nationality: Optional[str] = None

    id_document_type: Optional[IdDocumentType] = None
    id_document_number: Optional[str] = None
    id_document_expires_at: Optional[date] = None
    id_document_issuing_country: Optional[str] = None

    phone: Optional[str] = None
    phone_secondary: Optional[str] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

    preferred_language: Optional[str] = None
    preferred_currency: Optional[str] = None
    timezone: Optional[str] = None

    profile: Optional[dict] = None
    avatar_url: Optional[str] = None

    # Admin-only — routers decide whether to honor these
    is_active: Optional[bool] = None
    email_verified: Optional[bool] = None
    phone_verified: Optional[bool] = None
    kyc_verified: Optional[bool] = None
    role: Optional[Role] = None


class UserRead(BaseModel):
    id: str
    first_name: str
    last_name: str
    middle_name: Optional[str]

    date_of_birth: Optional[date]
    gender: Optional[Gender]
    nationality: Optional[str]

    id_document_type: Optional[IdDocumentType]
    id_document_number: Optional[str]
    id_document_expires_at: Optional[date]
    id_document_issuing_country: Optional[str]

    email: EmailStr
    phone: Optional[str]
    phone_secondary: Optional[str]

    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    region: Optional[str]
    country: Optional[str]
    postal_code: Optional[str]

    role: Role
    is_active: bool
    email_verified: bool
    phone_verified: bool
    kyc_verified: bool

    preferred_language: str
    preferred_currency: str
    timezone: Optional[str]

    profile: Optional[dict]
    avatar_url: Optional[str]

    last_login_at: Optional[datetime]
    created_at: datetime

    # Serialized into the JSON response but never stored.
    # Frontend always gets `full_name` in API responses.
    @computed_field
    @property
    def full_name(self) -> str:
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(p.strip() for p in parts if p and p.strip())

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Minimal safe-to-share view — no DOB, no ID doc, no address."""
    id: str
    first_name: str
    last_name: str
    role: Role
    avatar_url: Optional[str]

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    class Config:
        from_attributes = True