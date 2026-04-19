"""User model — single table for all roles.

Design decision: one User table with a `role` field rather than separate tables
per role. Reasons:
- A person may change role over time (employee becomes manager)
- All roles need the same core fields (email, auth, contact)
- Role-specific data goes in optional JSON `profile` field or separate profile
  tables that link back (added later without migration pain)
"""
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Column, JSON

from app.core.rbac import Role
from app.core.utils import gen_id, now


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=gen_id, primary_key=True)
    email: str = Field(unique=True, index=True)
    phone: Optional[str] = Field(default=None, index=True)
    hashed_password: str

    full_name: str
    role: Role = Field(default=Role.CUSTOMER, index=True)

    # Role-specific attributes live here — flexible without migrations.
    # Examples:
    #   traveler: {"passport_number": "...", "usual_routes": ["CDG-DLA"]}
    #   driver:   {"license_number": "...", "vehicle_id": "..."}
    #   middleman:{"company_name": "...", "commission_rate": 0.1}
    #   customer: {"preferred_language": "fr"}
    profile: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    is_active: bool = True
    email_verified: bool = False
    phone_verified: bool = False

    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)