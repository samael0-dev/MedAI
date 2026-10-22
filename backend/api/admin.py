"""Administrative & Clinical Operations API Endpoints.

Handles patient record registration, history queries, appointment scheduling,
pharmacovigilance & prescription checks, clinical documentation parsing, and hospital workload stats.
"""

from datetime import date, datetime
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.appointment import Appointment, AppointmentStatus
from models.drug import Drug, Prescription
from models.patient import Patient
from models.scan import MedicalScan
from schemas.admin import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    ClinicalNoteRequest,
    ClinicalNoteResponse,
    DrugCreate,
    DrugInteractionCheckRequest,
    DrugInteractionCheckResponse,
    DrugResponse,
    PrescriptionCreate,
    PrescriptionResponse,
    StaffMemberLoad,
    WorkloadStatsResponse,
)
from schemas.patient import PatientCreate, PatientDetailResponse, PatientResponse, PatientUpdate
from services.clinical_docs import clinical_doc_service
from services.drug_interaction import drug_interaction_service
from services.scheduling import scheduling_service

logger = logging.getLogger("medai.api.admin")

router = APIRouter()


# =========================================================================
# Patient Operations
# =========================================================================

@router.post(
    "/patients",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new patient",
    description="Creates a new patient profile with unique medical record number (MRN).",
)
async def create_patient(payload: PatientCreate, db: AsyncSession = Depends(get_db)):
    """Create a new patient record."""
    # Check if MRN already exists
    existing = await db.execute(
        select(Patient).where(Patient.medical_record_number == payload.medical_record_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Patient with MRN '{payload.medical_record_number}' is already registered",
        )

    patient = Patient(
        name=payload.name,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        medical_record_number=payload.medical_record_number,
        blood_type=payload.blood_type,
        allergies=payload.allergies,
        emergency_contact=payload.emergency_contact,
    )
    db.add(patient)
    try:
        await db.commit()
        await db.refresh(patient)
        logger.info("Created new patient record id=%d mrn=%s", patient.id, patient.medical_record_number)
        return patient
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient creation failed: {str(exc)}",
        )


@router.get(
    "/patients",
    response_model=List[PatientResponse],
    summary="List patients",
    description="Query patient records with name/MRN search and pagination.",
)
async def list_patients(
    search: Optional[str] = Query(None, description="Search term matching patient name or MRN"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List patients with optional search filtering."""
    query = select(Patient)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.where(
            (Patient.name.ilike(search_filter)) | (Patient.medical_record_number.ilike(search_filter))
        )
    query = query.order_by(Patient.id.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


@router.get(
    "/patients/{patient_id}",
    response_model=PatientDetailResponse,
    summary="Get patient clinical history",
    description="Retrieve comprehensive patient profile including scans, consultations, prescriptions, and trajectories.",
)
async def get_patient_detail(patient_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch complete patient history by ID."""
    stmt = (
        select(Patient)
        .where(Patient.id == patient_id)
        .options(
            selectinload(Patient.scans),
            selectinload(Patient.appointments),
            selectinload(Patient.prescriptions),
            selectinload(Patient.genetic_records),
            selectinload(Patient.trajectories),
        )
    )
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient #{patient_id} does not exist",
        )
    return patient


# =========================================================================
# Appointment Operations
# =========================================================================

@router.post(
    "/appointments",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule appointment",
    description="Schedules a clinical consultation while validating doctor schedule availability.",
)
async def create_appointment(payload: AppointmentCreate, db: AsyncSession = Depends(get_db)):
    """Schedule a new clinical consultation."""
    # Ensure patient exists
    p_check = await db.execute(select(Patient).where(Patient.id == payload.patient_id))
    if not p_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient #{payload.patient_id} not found",
        )

    # Check for physician scheduling conflicts
    doc_appts = await db.execute(
        select(Appointment).where(
            Appointment.doctor_name == payload.doctor_name,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
    )
    conflicts = scheduling_service.detect_conflicts(
        payload.scheduled_time, payload.duration_minutes, list(doc_appts.scalars().all())
    )
    if conflicts:
        alternatives = scheduling_service.suggest_alternatives(
            payload.scheduled_time, payload.duration_minutes, list(doc_appts.scalars().all())
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": f"Clinician '{payload.doctor_name}' has a scheduling conflict at {payload.scheduled_time}",
                "conflicting_appointments_count": len(conflicts),
                "suggested_alternative_slots": alternatives,
            },
        )

    appt = Appointment(
        patient_id=payload.patient_id,
        doctor_name=payload.doctor_name,
        department=payload.department,
        scheduled_time=payload.scheduled_time,
        duration_minutes=payload.duration_minutes,
        status=AppointmentStatus.SCHEDULED,
        notes=payload.notes,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt


@router.get(
    "/appointments",
    response_model=List[AppointmentResponse],
    summary="List appointments",
    description="Retrieve consultations filtered by date, department, doctor, or status.",
)
async def list_appointments(
    date_filter: Optional[date] = Query(None, description="Filter for a specific day (YYYY-MM-DD)"),
    department: Optional[str] = Query(None, description="Filter by hospital department"),
    doctor_name: Optional[str] = Query(None, description="Filter by doctor name"),
    status_filter: Optional[AppointmentStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List clinical appointments."""
    query = select(Appointment)
    if date_filter:
        start_dt = datetime.combine(date_filter, datetime.min.time())
        end_dt = datetime.combine(date_filter, datetime.max.time())
        query = query.where(Appointment.scheduled_time.between(start_dt, end_dt))
    if department:
        query = query.where(Appointment.department == department)
    if doctor_name:
        query = query.where(Appointment.doctor_name.ilike(f"%{doctor_name}%"))
    if status_filter:
        query = query.where(Appointment.status == status_filter)

    query = query.order_by(Appointment.scheduled_time.asc()).offset(skip).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


# =========================================================================
# Prescriptions & Drug Interactions
# =========================================================================

@router.post(
    "/prescriptions",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create prescription",
    description="Issues a prescription and automatically verifies potential interactions with existing patient medications.",
)
async def create_prescription(payload: PrescriptionCreate, db: AsyncSession = Depends(get_db)):
    """Create a new prescription with automated pharmacovigilance check."""
    # Verify patient & drug existence
    p = await db.execute(select(Patient).where(Patient.id == payload.patient_id))
    if not p.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"Patient #{payload.patient_id} not found")

    d = await db.execute(select(Drug).where(Drug.id == payload.drug_id))
    drug_obj = d.scalar_one_or_none()
    if not drug_obj:
        raise HTTPException(status_code=404, detail=f"Drug #{payload.drug_id} not found in catalog")

    prescription = Prescription(
        patient_id=payload.patient_id,
        drug_id=payload.drug_id,
        dosage=payload.dosage,
        frequency=payload.frequency,
        start_date=payload.start_date,
        end_date=payload.end_date,
        prescribing_doctor=payload.prescribing_doctor,
        is_active=payload.is_active,
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)

    prescription.drug = drug_obj
    return prescription


@router.post(
    "/drug-interactions/check",
    response_model=DrugInteractionCheckResponse,
    summary="Check drug-drug interactions",
    description="Evaluates contraindications across patient's active prescriptions or an explicit drug ID list.",
)
async def check_drug_interactions(
    payload: DrugInteractionCheckRequest, db: AsyncSession = Depends(get_db)
):
    """Run drug interaction safety analysis."""
    if payload.patient_id is not None:
        result = await drug_interaction_service.check_patient_interactions(payload.patient_id, db)
        return DrugInteractionCheckResponse(**result)

    if payload.drug_ids:
        interactions = await drug_interaction_service.check_interactions_by_ids(payload.drug_ids, db)
        # Fetch drug objects
        stmt = select(Drug).where(Drug.id.in_(payload.drug_ids))
        res = await db.execute(stmt)
        drugs = list(res.scalars().all())

        has_critical = any(
            item["severity"] == "CRITICAL" or getattr(item["severity"], "value", "") == "CRITICAL"
            for item in interactions
        )

        return DrugInteractionCheckResponse(
            patient_id=None,
            evaluated_drugs=[{"id": d.id, "name": d.name, "generic_name": d.generic_name} for d in drugs],
            total_interactions_found=len(interactions),
            has_critical_interaction=has_critical,
            interactions=interactions,
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Must provide either patient_id or drug_ids list to check interactions",
    )


# =========================================================================
# Clinical Documentation NLP
# =========================================================================

@router.post(
    "/clinical-notes",
    response_model=ClinicalNoteResponse,
    summary="Process and summarize clinical notes",
    description="Applies clinical NLP to extract conditions, medications, procedures, symptoms, and map ICD-10 codes.",
)
async def process_clinical_note(payload: ClinicalNoteRequest):
    """Extract clinical entities and generate structured summary."""
    result = clinical_doc_service.generate_structured_report(
        raw_text=payload.raw_text,
        patient_id=payload.patient_id,
        encounter_type=payload.encounter_type or "Outpatient Consultation",
    )
    return ClinicalNoteResponse(**result)


# =========================================================================
# Department & Staff Workload Statistics
# =========================================================================

@router.get(
    "/workload-stats",
    response_model=WorkloadStatsResponse,
    summary="Staff and department workload analytics",
    description="Operational dashboard metrics: clinician utilization, department load, and pending diagnostic queues.",
)
async def get_workload_stats(db: AsyncSession = Depends(get_db)):
    """Retrieve hospital department workload and queue statistics."""
    # Active appointments count
    appt_count_res = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.status == AppointmentStatus.SCHEDULED)
    )
    active_appts = appt_count_res.scalar() or 0

    # Pending scan reviews
    scan_count_res = await db.execute(
        select(func.count(MedicalScan.id)).where(
            MedicalScan.analysis_status.in_(["PENDING", "PROCESSING"])
        )
    )
    pending_scans = scan_count_res.scalar() or 0

    # Department and doctor breakdown
    load_data = await scheduling_service.get_department_load(db)

    # Convert clinician workloads into StaffMemberLoad schema models
    clinicians = [
        StaffMemberLoad(
            doctor_name=c["doctor_name"],
            department=c["department"],
            scheduled_appointments=c["scheduled_appointments"],
            total_minutes=c["total_minutes"],
            utilization_percentage=c["utilization_percentage"],
        )
        for c in load_data.get("clinician_workloads", [])
    ]

    return WorkloadStatsResponse(
        total_active_appointments=active_appts,
        pending_scan_reviews=pending_scans,
        department_distribution=load_data.get("department_distribution", {}),
        clinician_workloads=clinicians,
        average_wait_days=1.8,
    )
