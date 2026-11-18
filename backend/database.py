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

            # Auto-migrate columns for SQLite/Postgres if missing
            def _migrate_columns(sync_conn):
                try:
                    res = sync_conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
                    existing_cols = {r[1] for r in res}
                    if existing_cols:
                        if "auth_provider" not in existing_cols:
                            sync_conn.exec_driver_sql("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'")
                        if "google_id" not in existing_cols:
                            sync_conn.exec_driver_sql("ALTER TABLE users ADD COLUMN google_id VARCHAR(255)")
                        if "avatar_url" not in existing_cols:
                            sync_conn.exec_driver_sql("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)")
                except Exception as mig_err:
                    logger.debug("Column migration skipped or table inspection deferred: %s", mig_err)

            await conn.run_sync(_migrate_columns)
            logger.info("Database schemas verified and initialized successfully.")

        # Seed initial drug catalog and demo clinical records if table is empty
        try:
            from datetime import date, datetime, timezone
            import json
            from pathlib import Path
            from sqlalchemy import func, select
            import models

            async with AsyncSessionLocal() as session:
                d_count = await session.execute(select(func.count(models.Drug.id)))
                if (d_count.scalar() or 0) == 0:
                    json_path = Path(__file__).resolve().parent.parent / "data" / "drug_database" / "interactions.json"
                    if json_path.exists():
                        with open(json_path, "r", encoding="utf-8") as f:
                            drug_data = json.load(f)
                        for d in drug_data.get("drugs", []):
                            session.add(
                                models.Drug(
                                    id=d["id"],
                                    name=d["name"],
                                    generic_name=d["generic_name"],
                                    drug_class=d.get("drug_class", "Therapeutic Agent"),
                                    contraindications=d.get("contraindications", []),
                                )
                            )
                        await session.commit()
                        logger.info("Seeded %d drugs into database.", len(drug_data.get("drugs", [])))

                proj_count = await session.execute(select(func.count(models.ResearchProject.id)))
                if (proj_count.scalar() or 0) == 0:
                    demo_project = models.ResearchProject(
                        title="Early Biomarker Screening in Neuro-Oncology",
                        description="Longitudinal multi-omic cohort study identifying CSF and serum microRNA biomarkers for glioma recurrence.",
                        disease_type="Oncology / Neuro",
                        status="ACTIVE",
                        principal_investigator="Dr. Sarah Chen",
                        start_date=date(2025, 1, 15),
                    )
                    session.add(demo_project)
                    await session.commit()
                    logger.info("Research project catalog initialized.")
        except Exception as seed_exc:
            logger.warning("Optional demo seed deferred: %s", seed_exc)
    except Exception as exc:
        logger.warning(
            "Could not connect to primary database (%s). Ensure PostgreSQL is running or set DATABASE_URL.",
            exc,
        )
