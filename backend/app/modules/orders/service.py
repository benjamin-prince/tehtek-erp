"""Order business logic — totals, status transitions."""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.exceptions import NotFoundError
from app.core.utils import now
from app.modules.orders.models import Order, OrderItem, OrderStatus
from app.modules.orders.schemas import OrderCreate, OrderItemCreate, OrderUpdate


def _item_line_total(item: OrderItemCreate | OrderItem) -> float:
    gross = max(0.0, item.quantity * item.unit_price - item.discount)
    return round(gross * (1 + item.tax_rate), 2)


def _item_tax(item: OrderItemCreate | OrderItem) -> float:
    gross = max(0.0, item.quantity * item.unit_price - item.discount)
    return round(gross * item.tax_rate, 2)


async def create_order(
    session: AsyncSession, data: OrderCreate, created_by_id: str
) -> Order:
    subtotal = sum(i.quantity * i.unit_price for i in data.items)
    discount_total = sum(i.discount for i in data.items)
    tax_total = sum(_item_tax(i) for i in data.items)
    grand_total = subtotal - discount_total + tax_total + data.shipping_total

    order = Order(
        customer_user_id=data.customer_user_id,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        billing_address=data.billing_address,
        shipping_address=data.shipping_address,
        source_location_id=data.source_location_id,
        currency=data.currency,
        notes=data.notes,
        shipping_total=data.shipping_total,
        subtotal=round(subtotal, 2),
        discount_total=round(discount_total, 2),
        tax_total=round(tax_total, 2),
        grand_total=round(grand_total, 2),
        created_by_id=created_by_id,
    )
    session.add(order)
    await session.flush()

    for item_data in data.items:
        session.add(OrderItem(
            order_id=order.id,
            **item_data.model_dump(),
            line_total=_item_line_total(item_data),
        ))

    await session.commit()
    # Re-fetch with items
    return await get_by_id(session, order.id, with_items=True)


async def get_by_id(session: AsyncSession, order_id: str, with_items: bool = False) -> Order:
    query = select(Order).where(Order.id == order_id)
    if with_items:
        query = query.options(selectinload(Order.items))
    result = await session.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundError("Order not found")
    return order


async def list_orders(
    session: AsyncSession,
    status: Optional[OrderStatus] = None,
    customer_user_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Order]:
    query = select(Order).order_by(Order.created_at.desc())
    if status:
        query = query.where(Order.status == status)
    if customer_user_id:
        query = query.where(Order.customer_user_id == customer_user_id)
    result = await session.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())


async def update_order(session: AsyncSession, order: Order, data: OrderUpdate) -> Order:
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(order, k, v)
    order.updated_at = now()
    if data.status == OrderStatus.CONFIRMED and not order.confirmed_at:
        order.confirmed_at = now()
    if data.status == OrderStatus.PAID and not order.paid_at:
        order.paid_at = now()
    await session.commit()
    await session.refresh(order)
    return order