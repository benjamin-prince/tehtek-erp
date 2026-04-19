"""Shipment business logic — create, assign, scan, track."""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.exceptions import NotFoundError
from app.core.utils import now
from app.modules.shipments.models import Shipment, ShipmentStatus, TrackingEvent
from app.modules.shipments.schemas import (
    ShipmentCreate,
    ShipmentUpdate,
    TrackingEventCreate,
)


async def create_shipment(
    session: AsyncSession,
    data: ShipmentCreate,
    created_by_id: str,
) -> Shipment:
    shipment = Shipment(**data.model_dump(), created_by_id=created_by_id)
    session.add(shipment)
    await session.flush()

    # Seed initial tracking event
    session.add(TrackingEvent(
        shipment_id=shipment.id,
        status=ShipmentStatus.PENDING,
        note="Shipment created",
        recorded_by_id=created_by_id,
    ))
    await session.commit()
    await session.refresh(shipment)
    return shipment


async def get_by_id(session: AsyncSession, shipment_id: str, with_events: bool = False) -> Shipment:
    query = select(Shipment).where(Shipment.id == shipment_id)
    if with_events:
        query = query.options(selectinload(Shipment.events))
    result = await session.execute(query)
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise NotFoundError("Shipment not found")
    return shipment


async def get_by_tracking_code(
    session: AsyncSession, code: str, with_events: bool = False
) -> Shipment:
    query = select(Shipment).where(Shipment.tracking_code == code.upper())
    if with_events:
        query = query.options(selectinload(Shipment.events))
    result = await session.execute(query)
    shipment = result.scalar_one_or_none()
    if not shipment:
        raise NotFoundError("Tracking code not found")
    return shipment


async def list_shipments(
    session: AsyncSession,
    status: Optional[ShipmentStatus] = None,
    carrier_user_id: Optional[str] = None,
    sender_user_id: Optional[str] = None,
    recipient_user_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Shipment]:
    query = select(Shipment).order_by(Shipment.created_at.desc())
    if status:
        query = query.where(Shipment.status == status)
    if carrier_user_id:
        query = query.where(Shipment.carrier_user_id == carrier_user_id)
    if sender_user_id:
        query = query.where(Shipment.sender_user_id == sender_user_id)
    if recipient_user_id:
        query = query.where(Shipment.recipient_user_id == recipient_user_id)
    result = await session.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())


async def update_shipment(
    session: AsyncSession, shipment: Shipment, data: ShipmentUpdate
) -> Shipment:
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(shipment, k, v)
    shipment.updated_at = now()
    if data.status == ShipmentStatus.DELIVERED and not shipment.delivered_at:
        shipment.delivered_at = now()
    if data.status == ShipmentStatus.PICKED_UP and not shipment.picked_up_at:
        shipment.picked_up_at = now()
    await session.commit()
    await session.refresh(shipment)
    return shipment


async def add_tracking_event(
    session: AsyncSession,
    shipment: Shipment,
    data: TrackingEventCreate,
    recorded_by_id: str,
) -> TrackingEvent:
    event = TrackingEvent(
        shipment_id=shipment.id,
        **data.model_dump(),
        recorded_by_id=recorded_by_id,
    )
    session.add(event)

    # Sync shipment status + timestamps
    shipment.status = data.status
    shipment.updated_at = now()
    if data.status == ShipmentStatus.DELIVERED and not shipment.delivered_at:
        shipment.delivered_at = now()
    if data.status == ShipmentStatus.PICKED_UP and not shipment.picked_up_at:
        shipment.picked_up_at = now()

    await session.commit()
    await session.refresh(event)
    return event