"""Order endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_permission
from app.core.rbac import Permission, has_permission
from app.modules.orders import service
from app.modules.orders.models import Order, OrderStatus
from app.modules.orders.schemas import (
    OrderCreate,
    OrderDetail,
    OrderItemRead,
    OrderRead,
    OrderUpdate,
)

router = APIRouter(prefix="/orders", tags=["orders"])


def _can_view(user, order: Order) -> bool:
    if has_permission(user.role, Permission.ORDER_READ_ALL):
        return True
    if has_permission(user.role, Permission.ORDER_READ_OWN):
        return user.id in {order.customer_user_id, order.created_by_id}
    return False


@router.post("", response_model=OrderDetail, status_code=201)
async def create_order(
    data: OrderCreate,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.ORDER_CREATE)),
):
    order = await service.create_order(session, data, created_by_id=current.id)
    return OrderDetail(
        **order.model_dump(),
        items=[OrderItemRead.model_validate(i) for i in order.items],
    )


@router.get("", response_model=list[OrderRead])
async def list_orders(
    status: OrderStatus | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current=Depends(get_current_user),
):
    if has_permission(current.role, Permission.ORDER_READ_ALL):
        return await service.list_orders(session, status=status, limit=limit, offset=offset)
    if has_permission(current.role, Permission.ORDER_READ_OWN):
        return await service.list_orders(
            session, status=status, customer_user_id=current.id,
            limit=limit, offset=offset,
        )
    raise HTTPException(status_code=403, detail="Not allowed")


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order(
    order_id: str,
    session: AsyncSession = Depends(get_session),
    current=Depends(get_current_user),
):
    order = await service.get_by_id(session, order_id, with_items=True)
    if not _can_view(current, order):
        raise HTTPException(status_code=403, detail="Not allowed")
    return OrderDetail(
        **order.model_dump(),
        items=[OrderItemRead.model_validate(i) for i in order.items],
    )


@router.patch("/{order_id}", response_model=OrderRead)
async def update_order(
    order_id: str,
    data: OrderUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.ORDER_UPDATE)),
):
    order = await service.get_by_id(session, order_id)
    return await service.update_order(session, order, data)