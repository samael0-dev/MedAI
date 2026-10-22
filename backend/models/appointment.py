"""Appointment ORM Model.

Manages clinical consultations, department assignments, and doctor schedules.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

if TYPE_CHECKING:
    from .patient import Patient


class AppointmentStatus(str, enum.Enum):
    """Appointment scheduling states."""
    SCHEDULED = "SCHEDULED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Appointment(Base):
    """Appointment entity linking patients with clinical practitioners.

    Attributes:
        id: Unique appointment identifier.
        patient_id: Patient receiving consultation.
        doctor_name: Name of attending clinician.
        department: Medical department (e.g. Oncology, Radiology, Pulmonology).
        scheduled_time: Start timestamp of the visit.
        duration_minutes: Expected consultation duration.
        status: Appointment status enum.
        notes: Pre-visit triage notes or clinical remarks.
        created_at: Audit creation timestamp.
    """

    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    scheduled_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        SQLEnum(AppointmentStatus, name="appointment_status_enum"),
        default=AppointmentStatus.SCHEDULED,
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="appointments")

    def __repr__(self) -> str:
        return f"<Appointment(id={self.id}, patient_id={self.patient_id}, doctor='{self.doctor_name}', time='{self.scheduled_time}')>"
