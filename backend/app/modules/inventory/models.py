"""Inventory models — products, stock levels per location, stock movements.

Design:
- Product         : catalog. One row per item, identified by SKU.
- StockLevel      : current on-hand per (product, location). Updated by movements.
- StockMovement   : append-only audit log. Every change to a StockLevel comes
                    from a movement. Never edit or delete — corrections are
                    new movements of type ADJUST.

Stock levels could be computed on the fly from movements, but for a busy
warehouse that's expensive. We store the running total and update it in the
service layer whenever a movement is recorded. A periodic reconcile job can
verify StockLevel = sum(movements) if drift is ever suspected.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field, Column, JSON, UniqueConstraint

from app.core.utils import gen_id, now


class ProductStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class MovementType(str, Enum):
    RECEIVE = "receive"      # stock coming in (from supplier, return)
    ISSUE = "issue"          # stock going out (sale, shipment)
    TRANSFER_IN = "transfer_in"    # incoming leg of a transfer
    TRANSFER_OUT = "transfer_out"  # outgoing leg of a transfer
    ADJUST = "adjust"        # manual correction (positive or negative qty)


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: str = Field(default_factory=gen_id, primary_key=True)

    sku: str = Field(unique=True, index=True)
    barcode: Optional[str] = Field(default=None, index=True)  # EAN/UPC

    name: str = Field(index=True)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, index=True)
    brand: Optional[str] = None

    # Default selling price + tax. Orders can override per line.
    default_price: float = 0.0
    default_tax_rate: float = 0.0
    currency: str = Field(default="EUR")

    # Cost (what we paid). Used for margin reporting later.
    cost_price: Optional[float] = None

    # Physical attributes — handy for shipping cost estimates
    weight_kg: Optional[float] = None
    volume_m3: Optional[float] = None

    unit: str = Field(default="unit")  # "unit", "kg", "l", "m", etc.

    # Reorder thresholds — simple low-stock warning
    low_stock_threshold: Optional[float] = None

    status: ProductStatus = Field(default=ProductStatus.ACTIVE, index=True)

    image_url: Optional[str] = None
    attributes: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class StockLevel(SQLModel, table=True):
    """On-hand quantity of a product at a location. Updated by movements."""
    __tablename__ = "stock_levels"
    __table_args__ = (
        UniqueConstraint("product_id", "location_id", name="uq_stock_prod_loc"),
    )

    id: str = Field(default_factory=gen_id, primary_key=True)
    product_id: str = Field(foreign_key="products.id", index=True)
    location_id: str = Field(foreign_key="locations.id", index=True)

    # Free to ship (committed stock is tracked implicitly when we create
    # shipments — a reserved count can be added later if needed).
    quantity: float = 0.0

    updated_at: datetime = Field(default_factory=now)


class StockMovement(SQLModel, table=True):
    """Immutable record of a stock change. The source of truth."""
    __tablename__ = "stock_movements"

    id: str = Field(default_factory=gen_id, primary_key=True)
    product_id: str = Field(foreign_key="products.id", index=True)
    location_id: str = Field(foreign_key="locations.id", index=True)

    type: MovementType = Field(index=True)
    # Always positive in the DB; the `type` field tells you direction.
    # For ADJUST, use `signed_quantity` below for the actual delta.
    quantity: float

    # For ADJUST only — may be negative. For other types, matches `quantity`
    # with the right sign (RECEIVE = +qty, ISSUE = -qty, etc.).
    signed_quantity: float

    # Resulting on-hand at this location immediately after the movement.
    # Cached for fast timeline queries.
    balance_after: float

    # Cross-references
    related_shipment_id: Optional[str] = Field(default=None, foreign_key="shipments.id")
    related_order_id: Optional[str] = Field(default=None, foreign_key="orders.id")
    # For transfers — link the two legs together
    transfer_pair_id: Optional[str] = Field(default=None, index=True)

    reference: Optional[str] = None  # free-text ref (PO number, invoice, etc.)
    note: Optional[str] = None

    recorded_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    timestamp: datetime = Field(default_factory=now, index=True)