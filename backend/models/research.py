"""Research, Genomic Analysis, and Disease Trajectory ORM Models.

Manages clinical research trials, genomic variant profiles, and longitudinal disease modeling.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import (
    Date,
    DateTime,
    Float,
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


class ResearchProject(Base):
    """Clinical research study or translational trial.

    Attributes:
        id: Unique project identifier.
        title: Study title.
        description: Abstract and research objectives.
        disease_type: Target condition/disease under study (e.g., Oncology-Lung, Neurology-AD).
        status: Project status (e.g. ACTIVE, COMPLETED, ENROLLING, SUSPENDED).
        principal_investigator: Lead researcher name.
        start_date: Formal project initiation date.
        created_at: Record creation timestamp.
    """

    __tablename__ = "research_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    disease_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False, index=True)
    principal_investigator: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<ResearchProject(id={self.id}, title='{self.title[:30]}', pi='{self.principal_investigator}')>"


class GeneticData(Base):
    """Genomic sequencing variant and gene expression profile for a patient.

    Attributes:
        id: Unique genomic measurement identifier.
        patient_id: Patient foreign key.
        gene_name: HUGO Gene Nomenclature Committee (HGNC) gene symbol (e.g., EGFR, BRCA1, TP53).
        variant: Observed mutation or nucleotide polymorphism (e.g., L858R, T790M, Del19).
        expression_level: Normalized expression abundance (e.g., TPM or FPKM).
        significance_score: Pathogenicity score or ACMG significance rating (0.0 to 1.0).
        dataset_source: Sequencer or panel dataset origin (e.g., NGS_PANEL_v2, TCGA, WGS).
        created_at: Record timestamp.
    """

    __tablename__ = "genetic_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    gene_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    variant: Mapped[str] = mapped_column(String(100), nullable=False)
    expression_level: Mapped[float] = mapped_column(Float, nullable=False)
    significance_score: Mapped[float] = mapped_column(Float, nullable=False)
    dataset_source: Mapped[str] = mapped_column(
        String(100), default="CLINICAL_PANEL", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    patient: Mapped["Patient"] = relationship("Patient", back_populates="genetic_records")

    def __repr__(self) -> str:
        return f"<GeneticData(id={self.id}, gene='{self.gene_name}', variant='{self.variant}', score={self.significance_score})>"


class DiseaseTrajectory(Base):
    """Longitudinal disease progression estimation and predictive forecast.

    Attributes:
        id: Unique trajectory calculation identifier.
        patient_id: Patient foreign key.
        disease_type: Clinical condition monitored (e.g., Tuberculosis, Glioblastoma, Alzheimer's).
        stage: Staging classification (e.g., Stage IIIA, Early Mild, Late Moderate).
        biomarkers: JSON dictionary of measured longitudinal biochemical markers.
        progression_score: Composite progression velocity score (0.0 to 100.0).
        predicted_trajectory: Predicted timeline data points (e.g., 3-month, 6-month, 12-month metrics).
        analysis_date: Timestamp of calculation.
    """

    __tablename__ = "disease_trajectories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    disease_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    biomarkers: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    progression_score: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_trajectory: Mapped[Dict[str, Any]] = mapped_column(
        JSON, default=dict, nullable=False
    )
    analysis_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    patient: Mapped["Patient"] = relationship("Patient", back_populates="trajectories")

    def __repr__(self) -> str:
        return f"<DiseaseTrajectory(id={self.id}, patient={self.patient_id}, disease='{self.disease_type}', score={self.progression_score})>"
