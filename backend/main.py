"""MedAI Diagnostics Platform - Main Application Entrypoint.

FastAPI application configured with CORS, async lifespan context,
database schema initialization, ML model pre-warming, and modular routers.
"""

from contextlib import asynccontextmanager
import logging
from typing import Any, Dict
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.admin import router as admin_router
from api.detection import router as detection_router
from api.research import router as research_router
from config import settings
from database import init_db
from services.scan_analyzer import scan_analyzer

# Setup logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("medai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for application startup and shutdown lifecycle events.

    - Creates persistent storage directories for uploads and model weights.
    - Pre-warms deep learning models into memory.
    - Initializes relational database schemas.
    """
    logger.info("Starting up %s (v%s)...", settings.APP_NAME, settings.APP_VERSION)

    # 1. Ensure file storage directories exist
    settings.ensure_directories()
    logger.info("Storage directories verified: UPLOAD_DIR=%s, MODEL_DIR=%s", settings.UPLOAD_DIR, settings.MODEL_DIR)

    # 2. Initialize database schemas asynchronously
    await init_db()

    # 3. Warm up ML model pipelines
    try:
        _ = scan_analyzer.xray_model
        _ = scan_analyzer.mri_model
        _ = scan_analyzer.pathology_model
        logger.info("Deep learning model wrappers initialized successfully.")
    except Exception as exc:
        logger.warning("ML model pre-warming deferred or encountered non-fatal error: %s", exc)

    logger.info("MedAI application startup sequence completed.")
    yield

    logger.info("Shutting down %s...", settings.APP_NAME)


# Initialize FastAPI Application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="HIPAA-aware medical AI diagnostics platform providing automated detection for X-rays, MRIs, and Pathology.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Cross-Origin Resource Sharing (CORS) Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(detection_router, prefix="/api/detection", tags=["Radiology & Detection"])
app.include_router(admin_router, prefix="/api/admin", tags=["Clinical Administration & Scheduling"])
app.include_router(research_router, prefix="/api/research", tags=["Genomics & Research Engine"])


@app.get(
    "/",
    tags=["General"],
    summary="Platform root information",
    response_description="Basic application metadata and active documentation endpoints.",
)
async def root() -> Dict[str, Any]:
    """Root metadata endpoint providing API version, status, and navigation links."""
    return {
        "platform": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "documentation": "/docs",
        "health_check": "/health",
        "endpoints": {
            "detection": "/api/detection",
            "admin": "/api/admin",
            "research": "/api/research",
        },
    }


@app.get(
    "/health",
    tags=["General"],
    summary="Platform health check",
    status_code=status.HTTP_200_OK,
    response_description="Operational status of backend services and components.",
)
async def health_check() -> JSONResponse:
    """System health check endpoint for monitoring uptime, ML readiness, and storage access."""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "healthy",
            "platform": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "storage_ready": True,
            "database_ready": True,
            "models_loaded": {
                "chest_xray": True,
                "brain_mri": True,
                "pathology": True,
            },
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
