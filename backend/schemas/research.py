"""Research, Genomics, and Clinical Trial Matching Pydantic Schemas.

Validation and serialization schemas for clinical trials, genetic analyses,
longitudinal disease trajectory predictions, and biomarker correlations.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# --- Research Projects ---
class ResearchProjectBase(BaseModel):
    """Base fields for clinical research studies."""
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    disease_type: str = Field(..., min_length=2, max_length=100)
    status: str = Field(default="ACTIVE", max_length=50)
    principal_investigator: str = Field(..., min_length=2, max_length=255)
    start_date: Union[date, datetime, str]

    @field_validator("start_date", mode="before")
    @classmethod
    def parse_start_date(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.split("T")[0]).date()
            except Exception:
                return v
        elif isinstance(v, datetime):
            return v.date()
        return v


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
    genes: Optional[List[Dict[str, Any]]] = Field(None, description="Alias for custom_variants")
    analysis_type: Optional[str] = Field("differential_expression", description="Analysis type")

    @model_validator(mode="before")
    @classmethod
    def resolve_genes(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "genes" in data and not data.get("custom_variants"):
                data["custom_variants"] = data["genes"]
        return data


class GeneticAnalysisResponse(BaseModel):
    """Statistical genomic evaluation results."""
    patient_id: Optional[int] = None
    total_variants_analyzed: int
    high_risk_mutations: List[Dict[str, Any]]
    mean_expression: float
    pathway_alterations: List[str]
    pharmacogenomic_implications: List[str]
    summary: str
    results: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def set_results_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "results" not in data:
                data["results"] = {
                    "total_variants": data.get("total_variants_analyzed", 0),
                    "high_risk": data.get("high_risk_mutations", []),
                    "pathways": data.get("pathway_alterations", []),
                }
            if "analysis" not in data:
                data["analysis"] = data["results"]
        return data


# --- Disease Trajectory ---
class DiseaseTrajectoryRequest(BaseModel):
    """Request to compute longitudinal disease modeling and prognosis."""
    patient_id: int
    disease_type: str = Field(..., min_length=2, max_length=100)
    stage: Optional[str] = Field("Stage I", max_length=50)
    biomarkers: Optional[Union[Dict[str, float], Dict[str, Any]]] = Field(
        default_factory=dict, description="Biomarker concentration levels"
    )
    time_points_months: Optional[List[int]] = None


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
    condition: Optional[str] = Field(None, description="Target pathology or condition")
    diagnosis: Optional[str] = Field(None, description="Alias for condition")
    stage: Optional[str] = None
    biomarkers: Optional[Dict[str, Any]] = None
    age: Optional[int] = Field(None, ge=0, le=125)
    gender: Optional[str] = None
    prior_treatments: Optional[List[str]] = None
    comorbidities: Optional[List[str]] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_condition(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("condition") and data.get("diagnosis"):
                data["condition"] = data["diagnosis"]
            elif not data.get("condition"):
                data["condition"] = "general"
        return data


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
    trials: Optional[List[ClinicalTrialMatchItem]] = None

    @model_validator(mode="before")
    @classmethod
    def set_trials_alias(cls, data: Any) -> Any:
        if isinstance(data, dict) and "matches" in data and "trials" not in data:
            data["trials"] = data["matches"]
        return data
