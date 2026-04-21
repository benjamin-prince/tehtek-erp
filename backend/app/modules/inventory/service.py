"""Inventory business logic.

Movements are the source of truth. Whenever a movement is recorded, the
corresponding StockLevel is updated in the same transaction.
"""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.core.utils import gen_id, now
from app.modules.inventory.models import (
    MovementType,
    Product,
    ProductStatus,
    StockLevel,
    StockMovement,
)
from app.modules.inventory.schemas import (
    MovementCreateAdjust,
    MovementCreateIssue,
    MovementCreateReceive,
    MovementCreateTransfer,
    ProductCreate,
    ProductUpdate,
)


# ─── Product CRUD ───

async def create_product(
    session: AsyncSession, data: ProductCreate, created_by_id: str
) -> Product:
    existing = await session.execute(
        select(Product).where(Product.sku == data.sku)
    )
    if existing.scalar_one_or_none():
        raise ConflictError(f"SKU '{data.sku}' already exists")
    product = Product(**data.model_dump(), created_by_id=created_by_id)
    session.add(product)
    await session.commit()
    await session.refresh(product)
    return product


async def get_product(session: AsyncSession, product_id: str) -> Product:
    p = (
        await session.execute(select(Product).where(Product.id == product_id))
    ).scalar_one_or_none()
    if not p:
        raise NotFoundError("Product not found")
    return p


async def get_product_by_sku(session: AsyncSession, sku: str) -> Optional[Product]:
    return (
        await session.execute(select(Product).where(Product.sku == sku))
    ).scalar_one_or_none()


async def list_products(
    session: AsyncSession,
    status: Optional[ProductStatus] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Product]:
    query = select(Product).order_by(Product.created_at.desc())
    if status:
        query = query.where(Product.status == status)
    if category:
        query = query.where(Product.category == category)
    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            (Product.name.ilike(pattern))
            | (Product.sku.ilike(pattern))
            | (Product.barcode.ilike(pattern))
        )
    result = await session.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())


async def update_product(
    session: AsyncSession, product: Product, data: ProductUpdate
) -> Product:
    updates = data.model_dump(exclude_unset=True)

    if "sku" in updates and updates["sku"] != product.sku:
        existing = await session.execute(
            select(Product).where(Product.sku == updates["sku"])
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"SKU '{updates['sku']}' already exists")

    for k, v in updates.items():
        setattr(product, k, v)
    product.updated_at = now()
    await session.commit()
    await session.refresh(product)
    return product


# ─── Stock level helpers ───

async def _get_or_create_level(
    session: AsyncSession, product_id: str, location_id: str
) -> StockLevel:
    result = await session.execute(
        select(StockLevel).where(
            StockLevel.product_id == product_id,
            StockLevel.location_id == location_id,
        )
    )
    level = result.scalar_one_or_none()
    if level:
        return level
    level = StockLevel(product_id=product_id, location_id=location_id, quantity=0.0)
    session.add(level)
    await session.flush()
    return level


async def get_stock_level(
    session: AsyncSession, product_id: str, location_id: str
) -> Optional[StockLevel]:
    result = await session.execute(
        select(StockLevel).where(
            StockLevel.product_id == product_id,
            StockLevel.location_id == location_id,
        )
    )
    return result.scalar_one_or_none()


async def get_stock_by_product(
    session: AsyncSession, product_id: str
) -> list[StockLevel]:
    result = await session.execute(
        select(StockLevel).where(StockLevel.product_id == product_id)
    )
    return list(result.scalars().all())


async def get_stock_by_location(
    session: AsyncSession, location_id: str
) -> list[StockLevel]:
    result = await session.execute(
        select(StockLevel).where(StockLevel.location_id == location_id)
    )
    return list(result.scalars().all())


# ─── Movements ───

async def _record_movement(
    session: AsyncSession,
    *,
    product_id: str,
    location_id: str,
    type: MovementType,
    quantity: float,
    signed_quantity: float,
    recorded_by_id: str,
    related_shipment_id: Optional[str] = None,
    related_order_id: Optional[str] = None,
    transfer_pair_id: Optional[str] = None,
    reference: Optional[str] = None,
    note: Optional[str] = None,
) -> StockMovement:
    """Low-level — update StockLevel + insert StockMovement in one transaction."""
    level = await _get_or_create_level(session, product_id, location_id)

    new_balance = level.quantity + signed_quantity
    if new_balance < 0:
        raise AppError(
            f"Insufficient stock: would result in {new_balance:.2f} units"
        )

    level.quantity = new_balance
    level.updated_at = now()

    movement = StockMovement(
        product_id=product_id,
        location_id=location_id,
        type=type,
        quantity=quantity,
        signed_quantity=signed_quantity,
        balance_after=new_balance,
        related_shipment_id=related_shipment_id,
        related_order_id=related_order_id,
        transfer_pair_id=transfer_pair_id,
        reference=reference,
        note=note,
        recorded_by_id=recorded_by_id,
    )
    session.add(movement)
    return movement


async def receive_stock(
    session: AsyncSession, data: MovementCreateReceive, recorded_by_id: str
) -> StockMovement:
    await get_product(session, data.product_id)  # validate
    movement = await _record_movement(
        session,
        product_id=data.product_id,
        location_id=data.location_id,
        type=MovementType.RECEIVE,
        quantity=data.quantity,
        signed_quantity=data.quantity,
        recorded_by_id=recorded_by_id,
        reference=data.reference,
        note=data.note,
    )
    await session.commit()
    await session.refresh(movement)
    return movement


async def issue_stock(
    session: AsyncSession, data: MovementCreateIssue, recorded_by_id: str
) -> StockMovement:
    await get_product(session, data.product_id)
    movement = await _record_movement(
        session,
        product_id=data.product_id,
        location_id=data.location_id,
        type=MovementType.ISSUE,
        quantity=data.quantity,
        signed_quantity=-data.quantity,
        recorded_by_id=recorded_by_id,
        related_shipment_id=data.related_shipment_id,
        related_order_id=data.related_order_id,
        reference=data.reference,
        note=data.note,
    )
    await session.commit()
    await session.refresh(movement)
    return movement


async def adjust_stock(
    session: AsyncSession, data: MovementCreateAdjust, recorded_by_id: str
) -> StockMovement:
    await get_product(session, data.product_id)
    movement = await _record_movement(
        session,
        product_id=data.product_id,
        location_id=data.location_id,
        type=MovementType.ADJUST,
        quantity=abs(data.signed_quantity),
        signed_quantity=data.signed_quantity,
        recorded_by_id=recorded_by_id,
        reference=data.reference,
        note=data.note,
    )
    await session.commit()
    await session.refresh(movement)
    return movement


async def transfer_stock(
    session: AsyncSession,
    data: MovementCreateTransfer,
    recorded_by_id: str,
) -> tuple[StockMovement, StockMovement]:
    """Two linked movements — OUT from source, IN at destination."""
    if data.from_location_id == data.to_location_id:
        raise AppError("Source and destination must differ")

    await get_product(session, data.product_id)

    pair_id = gen_id()

    out = await _record_movement(
        session,
        product_id=data.product_id,
        location_id=data.from_location_id,
        type=MovementType.TRANSFER_OUT,
        quantity=data.quantity,
        signed_quantity=-data.quantity,
        recorded_by_id=recorded_by_id,
        transfer_pair_id=pair_id,
        reference=data.reference,
        note=data.note,
    )
    in_ = await _record_movement(
        session,
        product_id=data.product_id,
        location_id=data.to_location_id,
        type=MovementType.TRANSFER_IN,
        quantity=data.quantity,
        signed_quantity=data.quantity,
        recorded_by_id=recorded_by_id,
        transfer_pair_id=pair_id,
        reference=data.reference,
        note=data.note,
    )

    await session.commit()
    await session.refresh(out)
    await session.refresh(in_)
    return out, in_


async def list_movements(
    session: AsyncSession,
    product_id: Optional[str] = None,
    location_id: Optional[str] = None,
    type: Optional[MovementType] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[StockMovement]:
    query = select(StockMovement).order_by(StockMovement.timestamp.desc())
    if product_id:
        query = query.where(StockMovement.product_id == product_id)
    if location_id:
        query = query.where(StockMovement.location_id == location_id)
    if type:
        query = query.where(StockMovement.type == type)
    result = await session.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())