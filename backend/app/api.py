"""API router aggregator — all modules plug in here.

Adding a new module is a two-line change:
  from app.modules.newmod import router as newmod_router
  api_router.include_router(newmod_router)

The `/api/v1` prefix is applied at the app level in main.py, so modules only
declare their own sub-prefix (e.g. `/shipments`).
"""
from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.locations.router import router as locations_router
from app.modules.shipments.router import router as shipments_router
from app.modules.shipments.router import public_router as tracking_public_router
from app.modules.orders.router import router as orders_router
from app.modules.documents.router import router as documents_router

api_router = APIRouter()

# Authenticated / internal endpoints
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(locations_router)
api_router.include_router(shipments_router)
api_router.include_router(orders_router)
api_router.include_router(documents_router)

# Public endpoints (no auth) — grouped under /track/*
api_router.include_router(tracking_public_router)