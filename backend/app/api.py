"""API router aggregator — all modules plug in here."""
from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.locations.router import router as locations_router
from app.modules.shipments.router import router as shipments_router
from app.modules.shipments.router import public_router as tracking_public_router
from app.modules.orders.router import router as orders_router
from app.modules.documents.router import router as documents_router
from app.modules.inventory.router import router as inventory_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(locations_router)
api_router.include_router(shipments_router)
api_router.include_router(orders_router)
api_router.include_router(documents_router)
api_router.include_router(inventory_router)

api_router.include_router(tracking_public_router)