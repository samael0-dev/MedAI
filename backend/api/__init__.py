"""MedAI API Routers Package.

Exports FastAPI APIRouter modules for detection, administration, and research.
"""

from .detection import router as detection_router
from .admin import router as admin_router
from .research import router as research_router
from .auth import router as auth_router

__all__ = [
    "detection_router",
    "admin_router",
    "research_router",
    "auth_router",
]
