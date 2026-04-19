"""Location schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.modules.locations.models import LocationType


class LocationBase(BaseModel):
    code: str
    name: str
    type: LocationType = LocationType.WAREHOUSE
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    region: Optional[str] = None
    country: str = ""
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    metadata_json: Optional[dict] = None
    manager_id: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[LocationType] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    metadata_json: Optional[dict] = None
    manager_id: Optional[str] = None
    is_active: Optional[bool] = None


class LocationRead(LocationBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True