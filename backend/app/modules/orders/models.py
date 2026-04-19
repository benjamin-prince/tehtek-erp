"""Order models — customer orders with line items.

An Order is what triggers the rest of the pipeline:
  Order → Documents (proforma, facture, BL) → Shipment

Line items are flexible: they can reference a product SKU (future inventory
module) or be free-text service items.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship

from app.core.utils import gen_id, now, short_code


def gen_order_number() -> str:
    return short_code("ORD")  # e.g. ORD-2B5D1C


class OrderStatus(str, Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    PAID = "paid"
    PREPARING = "preparing"
    READY_TO_SHIP = "ready_to_ship"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: str = Field(default_factory=gen_id, primary_key=True)
    order_number: str = Field(default_factory=gen_order_number, unique=True, index=True)

    customer_user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    # Free-form customer details (for walk-ins / non-registered buyers)
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None

    status: OrderStatus = Field(default=OrderStatus.DRAFT, index=True)

    # Totals (computed + stored for reporting)
    subtotal: float = 0.0
    tax_total: float = 0.0
    discount_total: float = 0.0
    shipping_total: float = 0.0
    grand_total: float = 0.0
    currency: str = "EUR"

    notes: Optional[str] = None

    # Origin store/warehouse (optional)
    source_location_id: Optional[str] = Field(default=None, foreign_key="locations.id")

    created_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)
    confirmed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    items: list["OrderItem"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: str = Field(default_factory=gen_id, primary_key=True)
    order_id: str = Field(foreign_key="orders.id", index=True)

    # Product reference (optional — inventory module will add a real FK)
    sku: Optional[str] = None
    name: str
    description: Optional[str] = None

    quantity: float = 1
    unit_price: float
    discount: float = 0.0
    tax_rate: float = 0.0  # e.g. 0.19 for 19% VAT

    # Derived but stored for invoice snapshots
    line_total: float = 0.0  # (qty * unit_price - discount) * (1 + tax_rate)

    order: Optional[Order] = Relationship(back_populates="items")