"""Inventory schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.modules.inventory.models import MovementType, ProductStatus


# ─── Product ───

class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=80)
    barcode: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    default_price: float = 0.0
    default_tax_rate: float = 0.0
    currency: str = "EUR"
    cost_price: Optional[float] = None
    weight_kg: Optional[float] = None
    volume_m3: Optional[float] = None
    unit: str = "unit"
    low_stock_threshold: Optional[float] = None
    status: ProductStatus = ProductStatus.ACTIVE
    image_url: Optional[str] = None
    attributes: Optional[dict] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    default_price: Optional[float] = None
    default_tax_rate: Optional[float] = None
    currency: Optional[str] = None
    cost_price: Optional[float] = None
    weight_kg: Optional[float] = None
    volume_m3: Optional[float] = None
    unit: Optional[str] = None
    low_stock_threshold: Optional[float] = None
    status: Optional[ProductStatus] = None
    image_url: Optional[str] = None
    attributes: Optional[dict] = None


class ProductRead(ProductBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Stock level ───

class StockLevelRead(BaseModel):
    id: str
    product_id: str
    location_id: str
    quantity: float
    updated_at: datetime

    class Config:
        from_attributes = True


class StockByProduct(BaseModel):
    """Aggregate view — total on-hand across all locations for one product."""
    product_id: str
    total_quantity: float
    levels: list[StockLevelRead]


# ─── Movements ───

class MovementCreateReceive(BaseModel):
    product_id: str
    location_id: str
    quantity: float = Field(..., gt=0)
    reference: Optional[str] = None
    note: Optional[str] = None


class MovementCreateIssue(BaseModel):
    product_id: str
    location_id: str
    quantity: float = Field(..., gt=0)
    related_shipment_id: Optional[str] = None
    related_order_id: Optional[str] = None
    reference: Optional[str] = None
    note: Optional[str] = None


class MovementCreateAdjust(BaseModel):
    product_id: str
    location_id: str
    signed_quantity: float  # may be negative
    reference: Optional[str] = None
    note: Optional[str] = None


class MovementCreateTransfer(BaseModel):
    product_id: str
    from_location_id: str
    to_location_id: str
    quantity: float = Field(..., gt=0)
    reference: Optional[str] = None
    note: Optional[str] = None


class MovementRead(BaseModel):
    id: str
    product_id: str
    location_id: str
    type: MovementType
    quantity: float
    signed_quantity: float
    balance_after: float
    related_shipment_id: Optional[str]
    related_order_id: Optional[str]
    transfer_pair_id: Optional[str]
    reference: Optional[str]
    note: Optional[str]
    recorded_by_id: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True