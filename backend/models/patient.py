"""Patient ORM Model.

Defines demographic, clinical identity, and relationship links for patients.
Complies with HIPAA de-identification requirements where necessary.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Date, DateTime, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

if TYPE_CHECKING:
    from .scan import MedicalScan
    from .appointment import Appointment
    from .drug import Prescription
    from .research import GeneticData, DiseaseTrajectory


class Patient(Base):
    """Patient entity representing clinical profile and medical history.

    Attributes:
        id: Unique database identifier.
        name: Full legal name of patient.
        date_of_birth: Date of birth.
        gender: Administrative gender.
        medical_record_number: Unique hospital/clinical identifier (MRN).
        blood_type: Blood group (e.g., A+, O-, etc.).
        allergies: JSON list of documented allergens and reactions.
        emergency_contact: Emergency contact details (name, relation, phone).
        created_at: Record creation timestamp.
        updated_at: Record last modification timestamp.
    """

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(50), nullable=False)
    medical_record_number: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    blood_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    allergies: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    emergency_contact: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    scans: Mapped[List["MedicalScan"]] = relationship(
        "MedicalScan", back_populates="patient", cascade="all, delete-orphan", lazy="selectin"
    )
    appointments: Mapped[List["Appointment"]] = relationship(
        "Appointment", back_populates="patient", cascade="all, delete-orphan", lazy="selectin"
    )
    prescriptions: Mapped[List["Prescription"]] = relationship(
        "Prescription", back_populates="patient", cascade="all, delete-orphan", lazy="selectin"
    )
    genetic_records: Mapped[List["GeneticData"]] = relationship(
        "GeneticData", back_populates="patient", cascade="all, delete-orphan", lazy="selectin"
    )
    trajectories: Mapped[List["DiseaseTrajectory"]] = relationship(
        "DiseaseTrajectory", back_populates="patient", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        # Avoid logging full patient names in logs for HIPAA compliance
        return f"<Patient(id={self.id}, mrn='{self.medical_record_number}', gender='{self.gender}')>"
