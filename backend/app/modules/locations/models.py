"""Location model — stores, warehouses, airports, hubs, customs, etc.

Design decision: one Location table with a `type` field instead of separate
tables. Reasons:
- All location types share core fields (name, address, coords, contact)
- Shipments reference locations polymorphically — source/destination/waypoint
  don't care if it's a store or an airport
- Adding a new type (e.g. locker, drop-point) is a single enum value
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field, Column, JSON

from app.core.utils import gen_id, now


class LocationType(str, Enum):
    STORE = "store"
    WAREHOUSE = "warehouse"
    AIRPORT = "airport"
    HUB = "hub"             # sorting/transit hub
    CUSTOMS = "customs"
    PICKUP_POINT = "pickup_point"
    OTHER = "other"


class Location(SQLModel, table=True):
    __tablename__ = "locations"

    id: str = Field(default_factory=gen_id, primary_key=True)
    code: str = Field(unique=True, index=True)  # e.g. "WH-DLA-01", "CDG" for airports
    name: str
    type: LocationType = Field(default=LocationType.WAREHOUSE, index=True)

    # Address
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    region: Optional[str] = None
    country: str = Field(default="", index=True)  # ISO 2-letter code
    postal_code: Optional[str] = None

    # Coordinates (for map display, distance calculations)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Contact
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

    # Store/warehouse extras (hours, capacity, etc.) — flexible
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # Manager / responsible user (optional FK to users)
    manager_id: Optional[str] = Field(default=None, foreign_key="users.id")

    is_active: bool = True
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)