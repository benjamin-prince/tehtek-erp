"""ERP Backend — FastAPI entry point.

Responsibilities kept here:
- App creation + lifespan (DB init on startup)
- CORS middleware
- Exception handlers
- Mounting the versioned API router

Everything domain-specific lives in modules/.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown hooks go here later (close connections, flush queues, etc.)


app = FastAPI(
    title=settings.app_name,
    description="Modular ERP — shipping tracking, store/warehouse management, orders, documents.",
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Mount all module routers under /api/v1
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["meta"])
async def root():
    return {
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "docs": "/docs",
    }


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "healthy"}