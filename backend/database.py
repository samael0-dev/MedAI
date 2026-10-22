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

                p_count = await session.execute(select(func.count(models.Patient.id)))
                if (p_count.scalar() or 0) == 0:
                    demo_patients = [
                        models.Patient(
                            id=1,
                            name="Eleanor Vance",
                            date_of_birth=date(1982, 4, 12),
                            gender="female",
                            medical_record_number="MRN-78214",
                            blood_type="A+",
                            allergies=["Penicillin", "Sulfa drugs"],
                            emergency_contact={"name": "Robert Vance", "relation": "Spouse", "phone": "555-0142"},
                        ),
                        models.Patient(
                            id=2,
                            name="Marcus Thorne",
                            date_of_birth=date(1968, 11, 29),
                            gender="male",
                            medical_record_number="MRN-64902",
                            blood_type="O+",
                            allergies=["Latex"],
                            emergency_contact={"name": "Sarah Thorne", "relation": "Daughter", "phone": "555-0189"},
                        ),
                        models.Patient(
                            id=3,
                            name="Sophia Chen",
                            date_of_birth=date(1995, 8, 3),
                            gender="female",
                            medical_record_number="MRN-91238",
                            blood_type="B-",
                            allergies=[],
                            emergency_contact={"name": "David Chen", "relation": "Brother", "phone": "555-0199"},
                        ),
                    ]
                    session.add_all(demo_patients)
                    await session.commit()
                    logger.info("Seeded %d demo patients.", len(demo_patients))

                    # Seed demo scans
                    demo_scans = [
                        models.MedicalScan(
                            patient_id=1,
                            scan_type=models.ScanType.XRAY,
                            file_path="uploads/demo_xray_01.png",
                            file_format=".png",
                            file_size_bytes=1048576,
                            analysis_status=models.AnalysisStatus.COMPLETED,
                            findings="Bilateral lower lobe infiltration with consolidation. Findings suggestive of bacterial pneumonia.",
                            confidence_score=0.94,
                            primary_finding="Pneumonia (Bacterial)",
                            detailed_probabilities={"Pneumonia (Bacterial)": 0.94, "Pleural Effusion": 0.04, "Normal": 0.02},
                        ),
                        models.MedicalScan(
                            patient_id=2,
                            scan_type=models.ScanType.MRI,
                            file_path="uploads/demo_mri_01.png",
                            file_format=".png",
                            file_size_bytes=2097152,
                            analysis_status=models.AnalysisStatus.COMPLETED,
                            findings="Left temporal intra-axial mass with surrounding vasogenic edema. Strong suspicion for high-grade glioma.",
                            confidence_score=0.91,
                            primary_finding="Glioma",
                            detailed_probabilities={"Glioma": 0.91, "Meningioma": 0.06, "No Tumor": 0.03},
                        ),
                    ]
                    session.add_all(demo_scans)

                    # Seed demo appointments
                    demo_appts = [
                        models.Appointment(
                            patient_id=1,
                            doctor_name="Dr. Alan Mitchell",
                            department="Pulmonology",
                            scheduled_time=datetime.now(timezone.utc),
                            duration_minutes=30,
                            status=models.AppointmentStatus.SCHEDULED,
                            notes="Follow-up on pulmonary antibiotic response.",
                        ),
                        models.Appointment(
                            patient_id=2,
                            doctor_name="Dr. Sarah Chen",
                            department="Neurology",
                            scheduled_time=datetime.now(timezone.utc),
                            duration_minutes=45,
                            status=models.AppointmentStatus.CONFIRMED,
                            notes="Surgical resection consultation for intracranial lesion.",
                        ),
                    ]
                    session.add_all(demo_appts)

                    # Seed demo research project
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
                    logger.info("Demo clinical scans, appointments, and research studies initialized.")

                # Ensure standard demo clinician accounts exist
                from services.auth import hash_password

                demo_users_data = [
                    {
                        "email": "alan.mitchell@medai-hospital.org",
                        "password": "admin123",
                        "full_name": "Dr. Alan Mitchell",
                        "role": "radiologist",
                        "department": "Radiology",
                    },
                    {
                        "email": "sarah.chen@medai-hospital.org",
                        "password": "doctor123",
                        "full_name": "Dr. Sarah Chen",
                        "role": "doctor",
                        "department": "Neurology",
                    },
                    {
                        "email": "alex.taylor@medai-hospital.org",
                        "password": "researcher123",
                        "full_name": "Dr. Alex Taylor",
                        "role": "researcher",
                        "department": "Genomics & Translational Research",
                    },
                    {
                        "email": "admin@medai-hospital.org",
                        "password": "admin123",
                        "full_name": "System Administrator",
                        "role": "admin",
                        "department": "Hospital IT & Compliance",
                    },
                ]

                for du in demo_users_data:
                    existing = await session.execute(
                        select(models.User).where(models.User.email == du["email"])
                    )
                    if not existing.scalar_one_or_none():
                        session.add(
                            models.User(
                                email=du["email"],
                                hashed_password=hash_password(du["password"]),
                                full_name=du["full_name"],
                                role=du["role"],
                                department=du["department"],
                                is_active=True,
                            )
                        )
                await session.commit()
                logger.info("Demo clinician accounts verified/seeded.")
        except Exception as seed_exc:
            logger.warning("Optional demo seed deferred: %s", seed_exc)
    except Exception as exc:
        logger.warning(
            "Could not connect to primary database (%s). Ensure PostgreSQL is running or set DATABASE_URL.",
            exc,
        )
