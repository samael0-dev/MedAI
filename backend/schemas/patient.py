"""Patient Pydantic Schemas.

Validation and serialization schemas for patient registration, updates, and clinical history.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PatientBase(BaseModel):
    """Base demographic and medical history attributes for Patient."""
    name: str = Field(..., min_length=2, max_length=255, description="Patient's legal full name")
    date_of_birth: Union[date, str] = Field(..., description="Date of birth (YYYY-MM-DD)")
    gender: str = Field(..., description="Gender (e.g. Female, Male, Non-binary, Other)")
    medical_record_number: str = Field(
        ..., min_length=3, max_length=100, description="Unique hospital Medical Record Number (MRN)"
    )
    blood_type: Optional[str] = Field(None, max_length=10, description="Blood group (e.g. A+, O-)")
    allergies: Optional[Union[List[str], str]] = Field(default_factory=list, description="Known patient allergies")
    emergency_contact: Optional[Union[str, Dict[str, Any]]] = Field(
        default=None, description="Contact info (name, relationship, phone)"
    )

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def parse_dob(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.split("T")[0]).date()
            except Exception:
                return v
        elif isinstance(v, datetime):
            return v.date()
        return v

    @field_validator("allergies", mode="before")
    @classmethod
    def parse_allergies(cls, v: Any) -> Any:
        if isinstance(v, str):
            return [a.strip() for a in v.split(",") if a.strip()]
        return v or []


class PatientCreate(PatientBase):
    """Schema for creating a new patient record."""
    pass


class PatientUpdate(BaseModel):
    """Schema for updating an existing patient record."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[Union[List[str], str]] = None
    emergency_contact: Optional[Union[str, Dict[str, Any]]] = None


class PatientResponse(PatientBase):
    """Standard API response schema for patient details."""
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Database identifier")
    created_at: datetime
    updated_at: Optional[datetime] = None


class PatientDetailResponse(PatientResponse):
    """Detailed patient response including related clinical history records."""
    model_config = ConfigDict(from_attributes=True)

    scans: List[Dict[str, Any]] = Field(default_factory=list)
    appointments: List[Dict[str, Any]] = Field(default_factory=list)
    prescriptions: List[Dict[str, Any]] = Field(default_factory=list)
    genetic_records: List[Dict[str, Any]] = Field(default_factory=list)
    trajectories: List[Dict[str, Any]] = Field(default_factory=list)
