"""Shipment schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.modules.shipments.models import CarrierType, ShipmentStatus


class ShipmentCreate(BaseModel):
    # Parties
    sender_user_id: Optional[str] = None
    sender_name: str
    sender_phone: str
    sender_email: Optional[str] = None
    sender_address: str

    recipient_user_id: Optional[str] = None
    recipient_name: str
    recipient_phone: str
    recipient_email: Optional[str] = None
    recipient_address: str

    # Route
    origin_location_id: Optional[str] = None
    destination_location_id: Optional[str] = None

    # Carrier
    carrier_type: Optional[CarrierType] = None
    carrier_user_id: Optional[str] = None
    flight_number: Optional[str] = None
    flight_date: Optional[datetime] = None

    # Package
    description: Optional[str] = None
    weight_kg: Optional[float] = None
    volume_m3: Optional[float] = None
    declared_value: Optional[float] = None
    currency: str = "EUR"
    piece_count: int = 1

    shipping_cost: Optional[float] = None
    order_id: Optional[str] = None


class ShipmentUpdate(BaseModel):
    status: Optional[ShipmentStatus] = None
    carrier_type: Optional[CarrierType] = None
    carrier_user_id: Optional[str] = None
    flight_number: Optional[str] = None
    flight_date: Optional[datetime] = None
    shipping_cost: Optional[float] = None
    description: Optional[str] = None


class TrackingEventCreate(BaseModel):
    status: ShipmentStatus
    note: Optional[str] = None
    location_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None


class TrackingEventRead(BaseModel):
    id: str
    status: ShipmentStatus
    note: Optional[str]
    location_id: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    location_name: Optional[str]
    recorded_by_id: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class ShipmentRead(BaseModel):
    id: str
    tracking_code: str
    status: ShipmentStatus

    sender_user_id: Optional[str]
    sender_name: str
    sender_phone: str
    sender_address: str

    recipient_user_id: Optional[str]
    recipient_name: str
    recipient_phone: str
    recipient_address: str

    origin_location_id: Optional[str]
    destination_location_id: Optional[str]

    carrier_type: Optional[CarrierType]
    carrier_user_id: Optional[str]
    flight_number: Optional[str]
    flight_date: Optional[datetime]

    description: Optional[str]
    weight_kg: Optional[float]
    declared_value: Optional[float]
    currency: str
    piece_count: int

    shipping_cost: Optional[float]
    order_id: Optional[str]

    created_at: datetime
    updated_at: datetime
    picked_up_at: Optional[datetime]
    delivered_at: Optional[datetime]

    class Config:
        from_attributes = True


class ShipmentDetail(ShipmentRead):
    events: list[TrackingEventRead] = []


class PublicTrackingResponse(BaseModel):
    """Sanitized view for the public tracking page — no phones, no full addresses."""
    tracking_code: str
    status: ShipmentStatus
    recipient_first_name: str
    destination_city: str
    created_at: datetime
    delivered_at: Optional[datetime]
    events: list[TrackingEventRead]