"""Research, Genomics, and Clinical Trial Matching Pydantic Schemas.

Validation and serialization schemas for clinical trials, genetic analyses,
longitudinal disease trajectory predictions, and biomarker correlations.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# --- Research Projects ---
class ResearchProjectBase(BaseModel):
    """Base fields for clinical research studies."""
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    disease_type: str = Field(..., min_length=2, max_length=100)
    status: str = Field(default="ACTIVE", max_length=50)
    principal_investigator: str = Field(..., min_length=2, max_length=255)
    start_date: date


class ResearchProjectCreate(ResearchProjectBase):
    """Schema for initializing a research project."""
    pass


class ResearchProjectResponse(ResearchProjectBase):
    """Research study API response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Genetic Data ---
class GeneticDataBase(BaseModel):
    """Base attributes for patient genomic records."""
    patient_id: int
    gene_name: str = Field(..., min_length=1, max_length=100)
    variant: str = Field(..., min_length=1, max_length=100)
    expression_level: float = Field(..., ge=0.0)
    significance_score: float = Field(..., ge=0.0, le=1.0)
    dataset_source: str = Field(default="CLINICAL_PANEL", max_length=100)


class GeneticDataCreate(GeneticDataBase):
    """Creation model for genetic records."""
    pass


class GeneticDataResponse(GeneticDataBase):
    """Genetic record response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class GeneticAnalysisRequest(BaseModel):
    """Request to perform statistical genomics pipeline on a patient or sample set."""
    patient_id: Optional[int] = Field(None, description="Patient ID whose genomic records to evaluate")
    custom_variants: Optional[List[Dict[str, Any]]] = Field(
        None, description="Optional raw variant list for ad-hoc analysis"
    )


class GeneticAnalysisResponse(BaseModel):
    """Statistical genomic evaluation results."""
    patient_id: Optional[int] = None
    total_variants_analyzed: int
    high_risk_mutations: List[Dict[str, Any]]
    mean_expression: float
    pathway_alterations: List[str]
    pharmacogenomic_implications: List[str]
    summary: str


# --- Disease Trajectory ---
class DiseaseTrajectoryRequest(BaseModel):
    """Request to compute longitudinal disease modeling and prognosis."""
    patient_id: int
    disease_type: str = Field(..., min_length=2, max_length=100)
    stage: str = Field(..., min_length=1, max_length=50)
    biomarkers: Dict[str, float] = Field(
        default_factory=dict, description="Biomarker concentration levels (e.g. CRP, PSA, LDH)"
    )


class DiseaseTrajectoryResponse(BaseModel):
    """Longitudinal disease prognosis and trajectory prediction."""
    id: Optional[int] = None
    patient_id: int
    disease_type: str
    stage: str
    biomarkers: Dict[str, Any]
    progression_score: float
    risk_category: str
    predicted_trajectory: Dict[str, Any]
    analysis_date: datetime


# --- Biomarkers Analysis ---
class BiomarkerAnalysisResponse(BaseModel):
    """Population-level biomarker correlations and survival curves."""
    disease_type: str
    cohort_size: int
    key_biomarkers: List[Dict[str, Any]]
    survival_statistics: Dict[str, Any]
    correlation_matrix: Dict[str, Dict[str, float]]


# --- Clinical Trial Matching ---
class ClinicalTrialMatchRequest(BaseModel):
    """Patient profiling query for clinical trial eligibility."""
    patient_id: Optional[int] = None
    condition: str = Field(..., description="Target pathology or condition")
    stage: Optional[str] = None
    biomarkers: Optional[Dict[str, Any]] = None
    age: Optional[int] = Field(None, ge=0, le=125)
    gender: Optional[str] = None


class ClinicalTrialMatchItem(BaseModel):
    """Single clinical trial candidate."""
    trial_id: str
    title: str
    phase: str
    match_score: float = Field(..., ge=0.0, le=1.0)
    criteria_matched: List[str]
    criteria_unmatched: List[str]
    contact_institution: str


class ClinicalTrialMatchResponse(BaseModel):
    """Trial matching search results."""
    patient_id: Optional[int] = None
    condition: str
    total_matches: int
    matches: List[ClinicalTrialMatchItem]
