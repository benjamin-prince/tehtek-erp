"""Location business logic."""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import ConflictError, NotFoundError
from app.core.utils import now
from app.modules.locations.models import Location, LocationType
from app.modules.locations.schemas import LocationCreate, LocationUpdate


async def create_location(session: AsyncSession, data: LocationCreate) -> Location:
    existing = (
        await session.execute(select(Location).where(Location.code == data.code))
    ).scalar_one_or_none()
    if existing:
        raise ConflictError(f"Location code '{data.code}' already exists")

    location = Location(**data.model_dump())
    session.add(location)
    await session.commit()
    await session.refresh(location)
    return location


async def get_by_id(session: AsyncSession, location_id: str) -> Location:
    loc = (await session.execute(select(Location).where(Location.id == location_id))).scalar_one_or_none()
    if not loc:
        raise NotFoundError("Location not found")
    return loc


async def get_by_code(session: AsyncSession, code: str) -> Optional[Location]:
    return (await session.execute(select(Location).where(Location.code == code))).scalar_one_or_none()


async def list_locations(
    session: AsyncSession,
    type: Optional[LocationType] = None,
    country: Optional[str] = None,
    active_only: bool = True,
    limit: int = 100,
    offset: int = 0,
) -> list[Location]:
    query = select(Location).order_by(Location.name)
    if type:
        query = query.where(Location.type == type)
    if country:
        query = query.where(Location.country == country)
    if active_only:
        query = query.where(Location.is_active == True)  # noqa: E712
    result = await session.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())


async def update_location(session: AsyncSession, loc: Location, data: LocationUpdate) -> Location:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(loc, k, v)
    loc.updated_at = now()
    await session.commit()
    await session.refresh(loc)
    return loc