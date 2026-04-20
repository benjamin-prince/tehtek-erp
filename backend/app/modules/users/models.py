"""User model — single table for all roles."""
from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field, Column, JSON

from app.core.rbac import Role
from app.core.utils import gen_id, now


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNDISCLOSED = "undisclosed"


class IdDocumentType(str, Enum):
    PASSPORT = "passport"
    NATIONAL_ID = "national_id"
    DRIVER_LICENSE = "driver_license"
    RESIDENCE_PERMIT = "residence_permit"
    OTHER = "other"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=gen_id, primary_key=True)

    # Identity
    first_name: str = Field(index=True)
    last_name: str = Field(index=True)
    middle_name: Optional[str] = None

    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    nationality: Optional[str] = None  # ISO 3166-1 alpha-2

    # Government ID
    id_document_type: Optional[IdDocumentType] = None
    id_document_number: Optional[str] = Field(default=None, index=True)
    id_document_expires_at: Optional[date] = None
    id_document_issuing_country: Optional[str] = None

    # Contact
    email: str = Field(unique=True, index=True)
    phone: Optional[str] = Field(default=None, index=True)
    phone_secondary: Optional[str] = None

    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = Field(default=None, index=True)
    region: Optional[str] = None
    country: Optional[str] = Field(default=None, index=True)
    postal_code: Optional[str] = None

    # Auth
    hashed_password: str
    role: Role = Field(default=Role.CUSTOMER, index=True)

    is_active: bool = True
    email_verified: bool = False
    phone_verified: bool = False
    kyc_verified: bool = False

    # Preferences
    preferred_language: str = Field(default="en")
    preferred_currency: str = Field(default="EUR")
    timezone: Optional[str] = None

    # Role-specific attributes — no migration needed
    profile: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    avatar_url: Optional[str] = None

    # Audit
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)

    @property
    def full_name(self) -> str:
        """Composed from name parts. Computed on access, never stored."""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return " ".join(p.strip() for p in parts if p and p.strip())