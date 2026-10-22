"""Genomics & Translational Research API Endpoints.

Handles clinical research study registry, genetic variant profiling,
longitudinal disease trajectory prediction, biomarker survival curves, and clinical trial matching.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.patient import Patient
from models.research import DiseaseTrajectory, GeneticData, ResearchProject
from schemas.research import (
    BiomarkerAnalysisResponse,
    ClinicalTrialMatchItem,
    ClinicalTrialMatchRequest,
    ClinicalTrialMatchResponse,
    DiseaseTrajectoryRequest,
    DiseaseTrajectoryResponse,
    GeneticAnalysisRequest,
    GeneticAnalysisResponse,
    ResearchProjectCreate,
    ResearchProjectResponse,
)
from services.research_engine import research_engine

logger = logging.getLogger("medai.api.research")

router = APIRouter()


# =========================================================================
# Research Projects
# =========================================================================

@router.post(
    "/projects",
    response_model=ResearchProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create research project",
    description="Registers a new translational clinical research project or clinical study.",
)
async def create_research_project(payload: ResearchProjectCreate, db: AsyncSession = Depends(get_db)):
    """Create a new research study."""
    project = ResearchProject(
        title=payload.title,
        description=payload.description,
        disease_type=payload.disease_type,
        status=payload.status,
        principal_investigator=payload.principal_investigator,
        start_date=payload.start_date,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get(
    "/projects",
    response_model=List[ResearchProjectResponse],
    summary="List research projects",
    description="Query active and completed clinical research projects with filtering.",
)
async def list_research_projects(
    disease_type: Optional[str] = Query(None, description="Filter by target disease/domain"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by study status (ACTIVE, ENROLLING, etc.)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve list of research projects."""
    query = select(ResearchProject)
    if disease_type:
        query = query.where(ResearchProject.disease_type.ilike(f"%{disease_type}%"))
    if status_filter:
        query = query.where(ResearchProject.status == status_filter)

    query = query.order_by(ResearchProject.id.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


# =========================================================================
# Genomic Variant Analysis
# =========================================================================

@router.post(
    "/genetic-analysis",
    response_model=GeneticAnalysisResponse,
    summary="Analyze patient genetic data",
    description="Performs variant significance scoring, pathway enrichment, and pharmacogenomic screening.",
)
async def analyze_genetics(payload: GeneticAnalysisRequest, db: AsyncSession = Depends(get_db)):
    """Evaluate patient genomic sequence and variant pathogenicity."""
    gene_records: List[dict] = []

    if payload.patient_id is not None:
        p_check = await db.execute(select(Patient).where(Patient.id == payload.patient_id))
        if not p_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Patient #{payload.patient_id} not found")

        stmt = select(GeneticData).where(GeneticData.patient_id == payload.patient_id)
        res = await db.execute(stmt)
        db_records = res.scalars().all()
        for r in db_records:
            gene_records.append({
                "gene_name": r.gene_name,
                "variant": r.variant,
                "expression_level": r.expression_level,
                "significance_score": r.significance_score,
                "dataset_source": r.dataset_source,
            })

    if payload.custom_variants:
        gene_records.extend(payload.custom_variants)

    if not gene_records:
        # Provide sample clinical NGS panel demonstration data
        gene_records = [
            {"gene_name": "EGFR", "variant": "L858R", "expression_level": 4.8, "significance_score": 0.94},
            {"gene_name": "TP53", "variant": "R273H", "expression_level": 5.2, "significance_score": 0.88},
            {"gene_name": "KRAS", "variant": "G12D", "expression_level": 1.2, "significance_score": 0.15},
            {"gene_name": "CYP2D6", "variant": "*4 (non-functional)", "expression_level": 0.6, "significance_score": 0.72},
        ]

    analysis = research_engine.analyze_genetic_data(gene_records)
    analysis["patient_id"] = payload.patient_id
    return GeneticAnalysisResponse(**analysis)


# =========================================================================
# Longitudinal Disease Trajectory
# =========================================================================

@router.post(
    "/disease-trajectory",
    response_model=DiseaseTrajectoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute disease trajectory",
    description="Calculates longitudinal progression timeline and multi-year prognostic curves.",
)
async def compute_disease_trajectory(
    payload: DiseaseTrajectoryRequest, db: AsyncSession = Depends(get_db)
):
    """Calculate and persist patient disease progression trajectory."""
    p_check = await db.execute(select(Patient).where(Patient.id == payload.patient_id))
    if not p_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"Patient #{payload.patient_id} not found")

    trajectory_calc = research_engine.compute_disease_trajectory(
        patient_data={"stage": payload.stage, "biomarkers": payload.biomarkers},
        disease_type=payload.disease_type,
    )

    trajectory_record = DiseaseTrajectory(
        patient_id=payload.patient_id,
        disease_type=payload.disease_type,
        stage=payload.stage,
        biomarkers=payload.biomarkers,
        progression_score=trajectory_calc["progression_score"],
        predicted_trajectory=trajectory_calc["predicted_trajectory"],
    )
    db.add(trajectory_record)
    await db.commit()
    await db.refresh(trajectory_record)

    return DiseaseTrajectoryResponse(
        id=trajectory_record.id,
        patient_id=trajectory_record.patient_id,
        disease_type=trajectory_record.disease_type,
        stage=trajectory_record.stage,
        biomarkers=trajectory_record.biomarkers,
        progression_score=trajectory_record.progression_score,
        risk_category=trajectory_calc["risk_category"],
        predicted_trajectory=trajectory_record.predicted_trajectory,
        analysis_date=trajectory_record.analysis_date,
    )


# =========================================================================
# Biomarker Analysis & Kaplan-Meier Survival Curves
# =========================================================================

@router.get(
    "/biomarkers/{disease_type}",
    response_model=BiomarkerAnalysisResponse,
    summary="Get biomarker correlation and survival analysis",
    description="Provides Kaplan-Meier survival analysis (via lifelines) and correlation matrices for disease cohorts.",
)
async def get_biomarker_analysis(disease_type: str):
    """Retrieve cohort-level biomarker correlations and survival modeling."""
    analysis = research_engine.find_biomarker_correlations(disease_type=disease_type)
    return BiomarkerAnalysisResponse(**analysis)


# =========================================================================
# Clinical Trial Matching
# =========================================================================

@router.post(
    "/clinical-trial-match",
    response_model=ClinicalTrialMatchResponse,
    summary="Match patient to clinical trials",
    description="Matches patient diagnostics, biomarkers, stage, and demographics against active clinical trial protocols.",
)
async def match_clinical_trials(
    payload: ClinicalTrialMatchRequest, db: AsyncSession = Depends(get_db)
):
    """Find eligible clinical research trials based on patient criteria."""
    patient_profile = {
        "condition": payload.condition,
        "stage": payload.stage or "",
        "biomarkers": payload.biomarkers or {},
        "age": payload.age or 50,
        "gender": payload.gender or "Unknown",
    }

    # If patient_id supplied, enrich profile from database
    if payload.patient_id is not None:
        p_res = await db.execute(select(Patient).where(Patient.id == payload.patient_id))
        patient = p_res.scalar_one_or_none()
        if patient:
            # Calculate rough age from DOB
            today = date.today()
            age_years = today.year - patient.date_of_birth.year - (
                (today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day)
            )
            patient_profile["age"] = age_years
            patient_profile["gender"] = patient.gender

            # Fetch patient genetic data if any
            g_res = await db.execute(
                select(GeneticData).where(GeneticData.patient_id == payload.patient_id)
            )
            g_records = g_res.scalars().all()
            if g_records:
                patient_profile["biomarkers"] = {g.gene_name: g.variant for g in g_records}

    raw_matches = research_engine.match_clinical_trials(patient_profile)
    trial_items = [ClinicalTrialMatchItem(**m) for m in raw_matches]

    return ClinicalTrialMatchResponse(
        patient_id=payload.patient_id,
        condition=payload.condition,
        total_matches=len(trial_items),
        matches=trial_items,
    )
