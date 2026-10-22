"""Administrative and Clinical Pydantic Schemas.

Covers appointments, pharmacy catalog, prescriptions, drug interaction checks,
clinical note NLP extraction, and department workload analytics.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.appointment import AppointmentStatus
from models.drug import InteractionSeverity


# --- Appointments ---
class AppointmentBase(BaseModel):
    """Base fields for appointment."""
    patient_id: int = Field(..., description="Target patient ID")
    doctor_name: str = Field(..., min_length=2, max_length=255, description="Physician name")
    department: str = Field(..., min_length=2, max_length=100, description="Department name")
    scheduled_time: datetime = Field(..., description="Appointment ISO datetime")
    duration_minutes: int = Field(default=30, ge=5, le=480, description="Visit duration in minutes")
    notes: Optional[str] = Field(None, description="Pre-visit clinical notes")


class AppointmentCreate(AppointmentBase):
    """Schema for scheduling a new appointment."""
    pass


class AppointmentUpdate(BaseModel):
    """Schema for updating appointment attributes or rescheduling."""
    doctor_name: Optional[str] = None
    department: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    """Appointment API response payload."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: AppointmentStatus
    created_at: datetime


# --- Drugs & Prescriptions ---
class DrugBase(BaseModel):
    """Base drug metadata."""
    name: str = Field(..., min_length=1, max_length=255)
    generic_name: str = Field(..., min_length=1, max_length=255)
    drug_class: str = Field(..., min_length=1, max_length=100)
    contraindications: List[str] = Field(default_factory=list)


class DrugCreate(DrugBase):
    """Schema for registering a drug."""
    pass


class DrugResponse(DrugBase):
    """Drug API response."""
    model_config = ConfigDict(from_attributes=True)

    id: int


class PrescriptionBase(BaseModel):
    """Prescription base attributes."""
    patient_id: int
    drug_id: int
    dosage: str = Field(..., min_length=1, max_length=100, description="Dosage and strength")
    frequency: str = Field(..., min_length=1, max_length=100, description="Frequency e.g. BID, Daily")
    start_date: date
    end_date: Optional[date] = None
    prescribing_doctor: str = Field(..., min_length=2, max_length=255)
    is_active: bool = True


class PrescriptionCreate(PrescriptionBase):
    """Schema to issue a prescription."""
    pass


class PrescriptionResponse(PrescriptionBase):
    """Prescription API response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    drug: Optional[DrugResponse] = None


# --- Drug Interaction Checking ---
class DrugInteractionItem(BaseModel):
    """Single pairwise drug interaction alert."""
    drug_a_id: int
    drug_a_name: str
    drug_b_id: int
    drug_b_name: str
    severity: InteractionSeverity
    description: str
    recommendation: str


class DrugInteractionCheckRequest(BaseModel):
    """Request to check drug interactions by patient ID or explicit drug list."""
    patient_id: Optional[int] = Field(None, description="Patient whose active medications should be checked")
    drug_ids: Optional[List[int]] = Field(None, description="Explicit list of drug IDs to cross-reference")


class DrugInteractionCheckResponse(BaseModel):
    """Results of drug-drug interaction safety evaluation."""
    patient_id: Optional[int] = None
    evaluated_drugs: List[Dict[str, Any]]
    total_interactions_found: int
    has_critical_interaction: bool
    interactions: List[DrugInteractionItem]


# --- Clinical Notes NLP ---
class ClinicalNoteRequest(BaseModel):
    """Request payload containing unstructured clinician notes."""
    raw_text: str = Field(..., min_length=10, description="Unstructured medical transcription/note")
    patient_id: Optional[int] = Field(None, description="Associated patient ID if known")
    encounter_type: Optional[str] = Field("Consultation", description="Encounter specialty or setting")


class ClinicalNoteResponse(BaseModel):
    """Structured extraction result generated from clinical text."""
    patient_id: Optional[int] = None
    encounter_type: str
    summary: str
    extracted_entities: Dict[str, List[str]]
    icd10_codes: List[Dict[str, str]]
    recommended_actions: List[str]
    processing_time_ms: float


# --- Staff Workload Statistics ---
class StaffMemberLoad(BaseModel):
    """Individual clinician workload breakdown."""
    doctor_name: str
    department: str
    scheduled_appointments: int
    total_minutes: int
    utilization_percentage: float


class WorkloadStatsResponse(BaseModel):
    """Aggregate dashboard metrics for hospital operations."""
    total_active_appointments: int
    pending_scan_reviews: int
    department_distribution: Dict[str, int]
    clinician_workloads: List[StaffMemberLoad]
    average_wait_days: float
