"""Medical Scan Pydantic Schemas.

Validation and response models for radiology uploads, status checks, and AI findings.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from models.scan import AnalysisStatus, ScanType


class MedicalScanBase(BaseModel):
    """Base medical scan metadata."""
    patient_id: int = Field(..., description="Target patient ID")
    scan_type: ScanType = Field(..., description="Imaging modality (XRAY, MRI, CT, PATHOLOGY)")
    radiologist_notes: Optional[str] = Field(None, description="Clinical remarks by clinician")


class MedicalScanCreate(MedicalScanBase):
    """Scan creation model payload."""
    pass


class MedicalScanResponse(BaseModel):
    """Medical scan full response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    scan_type: ScanType
    file_path: str
    upload_date: datetime
    analysis_status: AnalysisStatus
    analysis_result: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    findings: Optional[str] = None
    radiologist_notes: Optional[str] = None
    created_at: datetime


class ScanAnalysisResult(BaseModel):
    """Structured AI diagnostic response returned after model inference."""
    scan_id: int
    scan_type: ScanType
    status: AnalysisStatus
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    primary_finding: str
    detailed_probabilities: Dict[str, float]
    heatmap_available: bool = False
    clinical_recommendation: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DetectionStatsResponse(BaseModel):
    """Aggregated detection analytics and volume metrics."""
    total_scans: int
    by_modality: Dict[str, int]
    by_status: Dict[str, int]
    average_confidence: float
    abnormal_findings_count: int
    anomaly_rate: float
