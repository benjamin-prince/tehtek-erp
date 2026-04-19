"""Shipment models — shipments + tracking events.

Relationships:
- sender / recipient → User (optional; they may be non-registered contacts too)
- origin / destination → Location
- carrier → User with role driver/traveler/middleman
- created_by / updated_by → User (audit)
- events ← TrackingEvent (one-to-many)

Free-form sender/recipient name/phone/address fields exist alongside optional
FK links so you can create a shipment for a non-registered recipient.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship

from app.core.utils import gen_id, now, short_code


def gen_tracking_code() -> str:
    return short_code("SH")  # e.g. SH-A3F92K


class ShipmentStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"               # created, not yet picked up
    PICKED_UP = "picked_up"
    AT_ORIGIN_HUB = "at_origin_hub"
    IN_TRANSIT = "in_transit"
    AT_CUSTOMS = "at_customs"
    AT_DESTINATION_HUB = "at_destination_hub"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    FAILED_DELIVERY = "failed_delivery"
    RETURNED = "returned"
    CANCELLED = "cancelled"


class CarrierType(str, Enum):
    DRIVER = "driver"        # internal driver (employee)
    TRAVELER = "traveler"    # person carrying in plane
    MIDDLEMAN = "middleman"  # external facilitator
    EXTERNAL = "external"    # third-party courier (DHL, etc.)


class Shipment(SQLModel, table=True):
    __tablename__ = "shipments"

    id: str = Field(default_factory=gen_id, primary_key=True)
    tracking_code: str = Field(default_factory=gen_tracking_code, unique=True, index=True)

    # --- Parties ---
    # Sender: may be a registered user (customer) or just free-form contact
    sender_user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    sender_name: str
    sender_phone: str
    sender_email: Optional[str] = None
    sender_address: str

    recipient_user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_name: str
    recipient_phone: str
    recipient_email: Optional[str] = None
    recipient_address: str

    # --- Route ---
    origin_location_id: Optional[str] = Field(default=None, foreign_key="locations.id", index=True)
    destination_location_id: Optional[str] = Field(default=None, foreign_key="locations.id", index=True)

    # --- Carrier assignment ---
    carrier_type: Optional[CarrierType] = None
    carrier_user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    # For traveler shipments: flight info
    flight_number: Optional[str] = None
    flight_date: Optional[datetime] = None

    # --- Package ---
    description: Optional[str] = None
    weight_kg: Optional[float] = None
    volume_m3: Optional[float] = None
    declared_value: Optional[float] = None
    currency: str = "EUR"
    piece_count: int = 1

    # --- Status + pricing ---
    status: ShipmentStatus = Field(default=ShipmentStatus.PENDING, index=True)
    shipping_cost: Optional[float] = None

    # --- Linkage ---
    order_id: Optional[str] = Field(default=None, foreign_key="orders.id", index=True)

    # --- Audit ---
    created_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    events: list["TrackingEvent"] = Relationship(
        back_populates="shipment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class TrackingEvent(SQLModel, table=True):
    __tablename__ = "tracking_events"

    id: str = Field(default_factory=gen_id, primary_key=True)
    shipment_id: str = Field(foreign_key="shipments.id", index=True)

    status: ShipmentStatus
    note: Optional[str] = None

    # Location of event — either a named location (FK) or raw coords
    location_id: Optional[str] = Field(default=None, foreign_key="locations.id")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None  # free text, e.g. "Near Douala airport"

    recorded_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    timestamp: datetime = Field(default_factory=now, index=True)

    shipment: Optional[Shipment] = Relationship(back_populates="events")