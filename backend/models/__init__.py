"""MedAI Data Models Package.

Exports all SQLAlchemy ORM models and enumeration classes for the healthcare diagnostics platform.
"""

from database import Base
from .user import User, UserRole
from .otp import OTPVerification
from .patient import Patient
from .scan import MedicalScan, ScanType, AnalysisStatus
from .appointment import Appointment, AppointmentStatus
from .drug import Drug, DrugInteraction, InteractionSeverity, Prescription
from .research import ResearchProject, GeneticData, DiseaseTrajectory

__all__ = [
    "Base",
    "User",
    "UserRole",
    "OTPVerification",
    "Patient",
    "MedicalScan",
    "ScanType",
    "AnalysisStatus",
    "Appointment",
    "AppointmentStatus",
    "Drug",
    "DrugInteraction",
    "InteractionSeverity",
    "Prescription",
    "ResearchProject",
    "GeneticData",
    "DiseaseTrajectory",
]
