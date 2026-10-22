"""Administrative and Clinical Pydantic Schemas.

Covers appointments, pharmacy catalog, prescriptions, drug interaction checks,
clinical note NLP extraction, and department workload analytics.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from models.appointment import AppointmentStatus
from models.drug import InteractionSeverity


# --- Appointments ---
class AppointmentBase(BaseModel):
    """Base fields for appointment."""
    patient_id: int = Field(..., description="Target patient ID")
    doctor_name: str = Field(..., min_length=2, max_length=255, description="Physician name")
    department: str = Field(..., min_length=2, max_length=100, description="Department name")
    scheduled_time: Union[datetime, str] = Field(..., description="Appointment ISO datetime")
    duration_minutes: int = Field(default=30, ge=5, le=480, description="Visit duration in minutes")
    notes: Optional[str] = Field(None, description="Pre-visit clinical notes")

    @field_validator("scheduled_time", mode="before")
    @classmethod
    def parse_scheduled_time(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v)
            except Exception:
                return v
        return v


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
    raw_text: Optional[str] = Field(None, description="Unstructured medical transcription/note")
    text: Optional[str] = Field(None, description="Alias for raw_text")
    patient_id: Optional[int] = Field(None, description="Associated patient ID if known")
    encounter_type: Optional[str] = Field("Consultation", description="Encounter specialty or setting")

    @model_validator(mode="before")
    @classmethod
    def resolve_text_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            content = data.get("raw_text") or data.get("text")
            data["raw_text"] = content
            data["text"] = content
        return data


class ClinicalNoteResponse(BaseModel):
    """Structured extraction result generated from clinical text."""
    patient_id: Optional[int] = None
    encounter_type: str
    summary: str
    extracted_entities: Dict[str, List[str]]
    entities: Optional[Dict[str, List[str]]] = None
    icd10_codes: List[Dict[str, str]]
    recommended_actions: List[str]
    processing_time_ms: float

    @model_validator(mode="before")
    @classmethod
    def set_entities_alias(cls, data: Any) -> Any:
        if isinstance(data, dict) and "extracted_entities" in data and "entities" not in data:
            data["entities"] = data["extracted_entities"]
        return data


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
