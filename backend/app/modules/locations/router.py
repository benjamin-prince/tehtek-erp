"""Location endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import require_permission
from app.core.rbac import Permission
from app.modules.locations import service
from app.modules.locations.models import LocationType
from app.modules.locations.schemas import LocationCreate, LocationRead, LocationUpdate

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationRead])
async def list_locations(
    type: LocationType | None = Query(None),
    country: str | None = Query(None),
    active_only: bool = Query(True),
    limit: int = Query(100, le=500),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.LOCATION_READ)),
):
    return await service.list_locations(
        session, type=type, country=country, active_only=active_only,
        limit=limit, offset=offset,
    )


@router.post("", response_model=LocationRead, status_code=201)
async def create_location(
    data: LocationCreate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.LOCATION_MANAGE)),
):
    return await service.create_location(session, data)


@router.get("/{location_id}", response_model=LocationRead)
async def get_location(
    location_id: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.LOCATION_READ)),
):
    return await service.get_by_id(session, location_id)


@router.patch("/{location_id}", response_model=LocationRead)
async def update_location(
    location_id: str,
    data: LocationUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.LOCATION_MANAGE)),
):
    loc = await service.get_by_id(session, location_id)
    return await service.update_location(session, loc, data)