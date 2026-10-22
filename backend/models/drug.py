"""Drug, Interaction, and Prescription ORM Models.

Manages medication catalog, pairwise drug-drug contraindications, and active patient prescriptions.
"""

import enum
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

if TYPE_CHECKING:
    from .patient import Patient


class InteractionSeverity(str, enum.Enum):
    """Clinical severity grading for drug interactions."""
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Drug(Base):
    """Pharmaceutical drug entity.

    Attributes:
        id: Unique drug identifier.
        name: Commercial brand name.
        generic_name: Active chemical or non-proprietary international name.
        drug_class: Pharmacologic class (e.g. Anticoagulant, Statin, Macrolide).
        contraindications: List of medical conditions or factors contraindicating use.
    """

    __tablename__ = "drugs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    generic_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    drug_class: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    contraindications: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # Relationships
    prescriptions: Mapped[List["Prescription"]] = relationship("Prescription", back_populates="drug")

    def __repr__(self) -> str:
        return f"<Drug(id={self.id}, name='{self.name}', generic='{self.generic_name}')>"


class DrugInteraction(Base):
    """Pairwise interaction between two pharmaceutical substances.

    Attributes:
        id: Unique interaction record identifier.
        drug_a_id: Foreign key to first drug.
        drug_b_id: Foreign key to second drug.
        severity: Clinical severity level (LOW, MODERATE, HIGH, CRITICAL).
        description: Mechanistic and pharmacokinetic explanation of the interaction.
        recommendation: Actionable clinical guidance (e.g. dosage adjustment, avoid combination).
    """

    __tablename__ = "drug_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    drug_a_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drugs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    drug_b_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drugs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    severity: Mapped[InteractionSeverity] = mapped_column(
        SQLEnum(InteractionSeverity, name="interaction_severity_enum"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    drug_a: Mapped["Drug"] = relationship("Drug", foreign_keys=[drug_a_id])
    drug_b: Mapped["Drug"] = relationship("Drug", foreign_keys=[drug_b_id])

    def __repr__(self) -> str:
        return f"<DrugInteraction(id={self.id}, drug_a={self.drug_a_id}, drug_b={self.drug_b_id}, severity={self.severity})>"


class Prescription(Base):
    """Patient prescription record.

    Attributes:
        id: Unique prescription identifier.
        patient_id: Patient receiving medication.
        drug_id: Specific drug prescribed.
        dosage: Dosage amount and unit (e.g., '10mg', '500mg').
        frequency: Administration schedule (e.g., 'Once daily', 'BID with meals').
        start_date: Medication course start date.
        end_date: Expected completion date or null for chronic regimens.
        prescribing_doctor: Clinician who authorized the medication.
        is_active: Active status flag for rapid drug interaction queries.
    """

    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    drug_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drugs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    prescribing_doctor: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="prescriptions")
    drug: Mapped["Drug"] = relationship("Drug", back_populates="prescriptions")

    def __repr__(self) -> str:
        return f"<Prescription(id={self.id}, patient_id={self.patient_id}, drug_id={self.drug_id}, active={self.is_active})>"
