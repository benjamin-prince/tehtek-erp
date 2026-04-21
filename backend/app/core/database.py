"""Database setup — async SQLAlchemy + SQLModel."""
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def init_db() -> None:
    """Create tables at startup. Use Alembic migrations in production."""
    from app.modules.users import models as _users  # noqa: F401
    from app.modules.locations import models as _locations  # noqa: F401
    from app.modules.shipments import models as _shipments  # noqa: F401
    from app.modules.orders import models as _orders  # noqa: F401
    from app.modules.documents import models as _documents  # noqa: F401
    from app.modules.inventory import models as _inventory  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        

from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session