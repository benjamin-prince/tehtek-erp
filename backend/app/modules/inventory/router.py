"""Inventory endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import require_permission
from app.core.rbac import Permission
from app.modules.inventory import service
from app.modules.inventory.models import MovementType, ProductStatus
from app.modules.inventory.schemas import (
    MovementCreateAdjust,
    MovementCreateIssue,
    MovementCreateReceive,
    MovementCreateTransfer,
    MovementRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    StockByProduct,
    StockLevelRead,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


# ─── Products ───

@router.post("/products", response_model=ProductRead, status_code=201)
async def create_product(
    data: ProductCreate,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.INVENTORY_MANAGE)),
):
    return await service.create_product(session, data, created_by_id=current.id)


@router.get("/products", response_model=list[ProductRead])
async def list_products(
    status: ProductStatus | None = Query(None),
    category: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.INVENTORY_READ)),
):
    return await service.list_products(
        session,
        status=status,
        category=category,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/products/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.INVENTORY_READ)),
):
    return await service.get_product(session, product_id)


@router.patch("/products/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.INVENTORY_MANAGE)),
):
    product = await service.get_product(session, product_id)
    return await service.update_product(session, product, data)


# ─── Stock levels ───

@router.get("/products/{product_id}/stock", response_model=StockByProduct)
async def product_stock(
    product_id: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.INVENTORY_READ)),
):
    await service.get_product(session, product_id)  # 404 if no product
    levels = await service.get_stock_by_product(session, product_id)
    total = sum(l.quantity for l in levels)
    return StockByProduct(
        product_id=product_id,
        total_quantity=total,
        levels=[StockLevelRead.model_validate(l) for l in levels],
    )


@router.get("/locations/{location_id}/stock", response_model=list[StockLevelRead])
async def location_stock(
    location_id: str,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.INVENTORY_READ)),
):
    return await service.get_stock_by_location(session, location_id)


# ─── Movements ───

@router.post("/movements/receive", response_model=MovementRead, status_code=201)
async def receive(
    data: MovementCreateReceive,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.INVENTORY_MANAGE)),
):
    return await service.receive_stock(session, data, recorded_by_id=current.id)


@router.post("/movements/issue", response_model=MovementRead, status_code=201)
async def issue(
    data: MovementCreateIssue,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.INVENTORY_MANAGE)),
):
    return await service.issue_stock(session, data, recorded_by_id=current.id)


@router.post("/movements/adjust", response_model=MovementRead, status_code=201)
async def adjust(
    data: MovementCreateAdjust,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.INVENTORY_MANAGE)),
):
    return await service.adjust_stock(session, data, recorded_by_id=current.id)


@router.post("/movements/transfer", response_model=list[MovementRead], status_code=201)
async def transfer(
    data: MovementCreateTransfer,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.INVENTORY_MANAGE)),
):
    out, in_ = await service.transfer_stock(session, data, recorded_by_id=current.id)
    return [
        MovementRead.model_validate(out),
        MovementRead.model_validate(in_),
    ]


@router.get("/movements", response_model=list[MovementRead])
async def list_movements(
    product_id: str | None = Query(None),
    location_id: str | None = Query(None),
    type: MovementType | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.INVENTORY_READ)),
):
    return await service.list_movements(
        session,
        product_id=product_id,
        location_id=location_id,
        type=type,
        limit=limit,
        offset=offset,
    )