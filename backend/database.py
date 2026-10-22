"""MedAI Database Connection and Session Management.

Provides SQLAlchemy 2.0 asynchronous engine, session factory, declarative base,
and FastAPI dependency for database sessions.
Follows HIPAA security practices: masks credentials and PHI in logging.
"""

import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from config import settings

logger = logging.getLogger("medai.database")

# Mask sensitive connection strings for HIPAA/auditing compliance
def _sanitize_db_url(url: str) -> str:
    """Mask user/password from database connection string for safe logging."""
    try:
        if "@" in url:
            prefix, rest = url.split("@", 1)
            scheme = prefix.split("://")[0]
            return f"{scheme}://***:***@{rest}"
    except Exception:
        pass
    return "database_connection"


# Build Async Engine
database_url = settings.async_database_url
logger.info("Initializing async database engine with target: %s", _sanitize_db_url(database_url))

engine: AsyncEngine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
)

# Asynchronous sessionmaker factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(AsyncAttrs, DeclarativeBase):
    """Base declarative class for all SQLAlchemy ORM models in MedAI."""
    pass


_db_initialized = False


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session.

    Ensures proper transaction rollback on unhandled exceptions and cleans up
    the session context when requests terminate.
    """
    global _db_initialized
    if not _db_initialized:
        await init_db()
        _db_initialized = True

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables for all models registered with Base.

    Useful for development and automated tests. In production environments,
    Alembic migrations should be used.
    """
    try:
        async with engine.begin() as conn:
            # Import models dynamically inside function to ensure table registration
            import models  # noqa: F401
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database schemas verified and initialized successfully.")
    except Exception as exc:
        logger.warning(
            "Could not connect to primary database (%s). Ensure PostgreSQL is running or set DATABASE_URL.",
            exc,
        )
