"""Order schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.modules.orders.models import OrderStatus


class OrderItemCreate(BaseModel):
    sku: Optional[str] = None
    name: str
    description: Optional[str] = None
    quantity: float = 1
    unit_price: float
    discount: float = 0.0
    tax_rate: float = 0.0


class OrderItemRead(OrderItemCreate):
    id: str
    line_total: float

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    customer_user_id: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    source_location_id: Optional[str] = None
    currency: str = "EUR"
    notes: Optional[str] = None
    shipping_total: float = 0.0
    items: list[OrderItemCreate]


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None


class OrderRead(BaseModel):
    id: str
    order_number: str
    customer_user_id: Optional[str]
    customer_name: str
    customer_phone: Optional[str]
    customer_email: Optional[str]
    billing_address: Optional[str]
    shipping_address: Optional[str]
    status: OrderStatus
    subtotal: float
    tax_total: float
    discount_total: float
    shipping_total: float
    grand_total: float
    currency: str
    notes: Optional[str]
    source_location_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    confirmed_at: Optional[datetime]
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True


class OrderDetail(OrderRead):
    items: list[OrderItemRead] = []