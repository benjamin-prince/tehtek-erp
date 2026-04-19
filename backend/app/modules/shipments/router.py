"""Shipment endpoints — internal CRUD, mobile scan, public tracking."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_permission
from app.core.rbac import Permission, Role, has_permission
from app.modules.shipments import service
from app.modules.shipments.models import Shipment, ShipmentStatus
from app.modules.shipments.schemas import (
    PublicTrackingResponse,
    ShipmentCreate,
    ShipmentDetail,
    ShipmentRead,
    ShipmentUpdate,
    TrackingEventCreate,
    TrackingEventRead,
)

router = APIRouter(prefix="/shipments", tags=["shipments"])
public_router = APIRouter(prefix="/track", tags=["public-tracking"])


def _first_name(full: str) -> str:
    return full.split()[0] if full else ""


def _city_from_address(address: str) -> str:
    parts = [p.strip() for p in address.split(",") if p.strip()]
    return parts[-1] if parts else ""


def _can_view(user, shipment: Shipment) -> bool:
    """Check if a user may see a given shipment."""
    if has_permission(user.role, Permission.SHIPMENT_READ_ALL):
        return True
    if has_permission(user.role, Permission.SHIPMENT_READ_OWN):
        return user.id in {
            shipment.sender_user_id,
            shipment.recipient_user_id,
            shipment.carrier_user_id,
            shipment.created_by_id,
        }
    return False


# --------- Internal (authenticated) endpoints ---------

@router.post("", response_model=ShipmentRead, status_code=201)
async def create_shipment(
    data: ShipmentCreate,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.SHIPMENT_CREATE)),
):
    return await service.create_shipment(session, data, created_by_id=current.id)


@router.get("", response_model=list[ShipmentRead])
async def list_shipments(
    status: ShipmentStatus | None = Query(None),
    carrier_user_id: str | None = Query(None),
    mine_only: bool = Query(False, description="Limit to shipments you sent/received/carry"),
    limit: int = Query(50, le=200),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current=Depends(get_current_user),
):
    # If user only has READ_OWN, force mine_only
    if not has_permission(current.role, Permission.SHIPMENT_READ_ALL):
        mine_only = True

    sender_id = current.id if mine_only and current.role == Role.CUSTOMER else None
    recipient_id = current.id if mine_only and current.role == Role.CUSTOMER else None
    carrier_filter = current.id if mine_only and current.role in (Role.DRIVER, Role.TRAVELER) else carrier_user_id

    if mine_only and current.role == Role.MIDDLEMAN:
        # Middlemen see what they created
        results = await service.list_shipments(session, status=status, limit=limit, offset=offset)
        return [s for s in results if s.created_by_id == current.id]

    return await service.list_shipments(
        session,
        status=status,
        carrier_user_id=carrier_filter,
        sender_user_id=sender_id,
        recipient_user_id=recipient_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{shipment_id}", response_model=ShipmentDetail)
async def get_shipment(
    shipment_id: str,
    session: AsyncSession = Depends(get_session),
    current=Depends(get_current_user),
):
    shipment = await service.get_by_id(session, shipment_id, with_events=True)
    if not _can_view(current, shipment):
        raise HTTPException(status_code=403, detail="Not allowed")
    events = sorted(shipment.events, key=lambda e: e.timestamp, reverse=True)
    return ShipmentDetail(
        **shipment.model_dump(),
        events=[TrackingEventRead.model_validate(e) for e in events],
    )


@router.patch("/{shipment_id}", response_model=ShipmentRead)
async def update_shipment(
    shipment_id: str,
    data: ShipmentUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.SHIPMENT_UPDATE)),
):
    shipment = await service.get_by_id(session, shipment_id)
    return await service.update_shipment(session, shipment, data)


@router.post("/{shipment_id}/events", response_model=TrackingEventRead, status_code=201)
async def add_event(
    shipment_id: str,
    data: TrackingEventCreate,
    session: AsyncSession = Depends(get_session),
    current=Depends(get_current_user),
):
    shipment = await service.get_by_id(session, shipment_id)
    # Carriers can scan their assigned shipments; everyone else needs UPDATE
    can_scan = (
        has_permission(current.role, Permission.SHIPMENT_UPDATE)
        or (has_permission(current.role, Permission.SHIPMENT_SCAN)
            and shipment.carrier_user_id == current.id)
    )
    if not can_scan:
        raise HTTPException(status_code=403, detail="Not allowed to update this shipment")
    return await service.add_tracking_event(session, shipment, data, recorded_by_id=current.id)


@router.post("/scan/{tracking_code}/events", response_model=TrackingEventRead, status_code=201)
async def scan_and_update(
    tracking_code: str,
    data: TrackingEventCreate,
    session: AsyncSession = Depends(get_session),
    current=Depends(get_current_user),
):
    """Mobile scan endpoint — lookup by tracking code."""
    shipment = await service.get_by_tracking_code(session, tracking_code)
    can_scan = (
        has_permission(current.role, Permission.SHIPMENT_UPDATE)
        or (has_permission(current.role, Permission.SHIPMENT_SCAN)
            and shipment.carrier_user_id == current.id)
    )
    if not can_scan:
        raise HTTPException(status_code=403, detail="Not allowed to update this shipment")
    return await service.add_tracking_event(session, shipment, data, recorded_by_id=current.id)


# --------- Public tracking (no auth) ---------

@public_router.get("/{tracking_code}", response_model=PublicTrackingResponse)
async def track_public(
    tracking_code: str,
    session: AsyncSession = Depends(get_session),
):
    shipment = await service.get_by_tracking_code(session, tracking_code, with_events=True)
    events = sorted(shipment.events, key=lambda e: e.timestamp, reverse=True)
    return PublicTrackingResponse(
        tracking_code=shipment.tracking_code,
        status=shipment.status,
        recipient_first_name=_first_name(shipment.recipient_name),
        destination_city=_city_from_address(shipment.recipient_address),
        created_at=shipment.created_at,
        delivered_at=shipment.delivered_at,
        events=[TrackingEventRead.model_validate(e) for e in events],
    )