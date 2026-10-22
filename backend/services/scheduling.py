"""Clinical Scheduling and Resource Optimization Service.

Detects doctor/room double-bookings, computes alternative open slots,
and calculates department staff workload distribution.
"""

from datetime import date, datetime, timedelta
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from models.appointment import Appointment, AppointmentStatus

logger = logging.getLogger("medai.services.scheduling")


class SchedulingService:
    """Clinical appointment coordination and constraint optimization."""

    def detect_conflicts(
        self,
        new_start_or_appt: Any,
        duration_or_existing: Any = 30,
        existing_appointments: Optional[List[Any]] = None,
        exclude_appointment_id: Optional[int] = None,
    ) -> List[Any]:
        """Detect any temporal overlaps with existing appointments for the same clinician.

        Supports both:
            detect_conflicts(new_start, duration_minutes, existing_appointments)
            detect_conflicts(new_appt_dict_or_obj, existing_list)
        """
        if isinstance(new_start_or_appt, dict):
            new_start = new_start_or_appt.get("scheduled_time")
            duration_minutes = new_start_or_appt.get("duration_minutes", 30)
            existing_list = duration_or_existing if isinstance(duration_or_existing, list) else []
        elif not isinstance(new_start_or_appt, datetime) and hasattr(new_start_or_appt, "scheduled_time"):
            new_start = getattr(new_start_or_appt, "scheduled_time")
            duration_minutes = getattr(new_start_or_appt, "duration_minutes", 30)
            existing_list = duration_or_existing if isinstance(duration_or_existing, list) else []
        else:
            new_start = new_start_or_appt
            duration_minutes = duration_or_existing if isinstance(duration_or_existing, int) else 30
            existing_list = existing_appointments or []

        if isinstance(new_start, str):
            new_start = datetime.fromisoformat(new_start)

        conflicts: List[Any] = []
        new_end = new_start + timedelta(minutes=duration_minutes)

        for appt in existing_list:
            if isinstance(appt, dict):
                appt_id = appt.get("id")
                appt_status = appt.get("status")
                appt_start = appt.get("scheduled_time")
                appt_dur = appt.get("duration_minutes", 30)
            else:
                appt_id = getattr(appt, "id", None)
                appt_status = getattr(appt, "status", None)
                appt_start = getattr(appt, "scheduled_time", None)
                appt_dur = getattr(appt, "duration_minutes", 30)

            if exclude_appointment_id and appt_id == exclude_appointment_id:
                continue
            if appt_status == AppointmentStatus.CANCELLED or appt_status == "CANCELLED":
                continue

            if isinstance(appt_start, str):
                appt_start = datetime.fromisoformat(appt_start)

            if not appt_start:
                continue

            existing_end = appt_start + timedelta(minutes=appt_dur)

            # Check overlap
            if new_start < existing_end and new_end > appt_start:
                conflicts.append(appt)

        return conflicts

    def suggest_alternatives(
        self,
        requested_start: datetime,
        duration_minutes: int,
        existing_appointments: List[Appointment],
        search_window_hours: int = 8,
        count: int = 3,
    ) -> List[Dict[str, Any]]:
        """Propose alternative non-conflicting time slots on the same or next day."""
        alternatives: List[Dict[str, Any]] = []
        step_minutes = 30
        current_time = requested_start.replace(minute=0, second=0, microsecond=0) + timedelta(minutes=30)

        # Look forward in 30-minute intervals during clinical hours (08:00 to 18:00)
        checked_intervals = 0
        max_intervals = search_window_hours * 2

        while len(alternatives) < count and checked_intervals < max_intervals:
            checked_intervals += 1
            current_time += timedelta(minutes=step_minutes)

            # Skip non-clinical hours (before 08:00 or after 17:30)
            if current_time.hour < 8 or current_time.hour >= 18:
                continue

            conflicts = self.detect_conflicts(current_time, duration_minutes, existing_appointments)
            if not conflicts:
                alternatives.append({
                    "start_time": current_time.isoformat(),
                    "duration_minutes": duration_minutes,
                    "end_time": (current_time + timedelta(minutes=duration_minutes)).isoformat(),
                })

        return alternatives

    def optimize_schedule(
        self,
        appointments: List[Dict[str, Any]],
        constraints: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Group and sequence scheduled consultations to minimize idle gaps between visits."""
        constraints = constraints or {}
        max_daily_minutes = constraints.get("max_daily_minutes", 480)

        sorted_appts = sorted(appointments, key=lambda x: x.get("scheduled_time"))
        grouped_by_doctor: Dict[str, List[Dict[str, Any]]] = {}

        for appt in sorted_appts:
            doc = appt.get("doctor_name", "General")
            grouped_by_doctor.setdefault(doc, []).append(appt)

        doctor_metrics: Dict[str, Any] = {}
        for doc, appts in grouped_by_doctor.items():
            total_duration = sum(a.get("duration_minutes", 30) for a in appts)
            doctor_metrics[doc] = {
                "total_appointments": len(appts),
                "total_scheduled_minutes": total_duration,
                "utilization_pct": round(min(1.0, total_duration / max_daily_minutes) * 100, 1),
            }

        return {
            "total_appointments_evaluated": len(appointments),
            "doctor_metrics": doctor_metrics,
            "optimized_order": sorted_appts,
        }

    async def get_department_load(
        self,
        session: AsyncSession,
        department: Optional[str] = None,
        target_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Aggregate department appointment counts and clinician utilization metrics."""
        query = select(Appointment)
        if department:
            query = query.where(Appointment.department == department)

        if target_date:
            start_dt = datetime.combine(target_date, datetime.min.time())
            end_dt = datetime.combine(target_date, datetime.max.time())
            query = query.where(Appointment.scheduled_time.between(start_dt, end_dt))

        res = await session.execute(query)
        all_appts = list(res.scalars().all())

        dept_dist: Dict[str, int] = {}
        doctor_load: Dict[str, Dict[str, Any]] = {}

        for a in all_appts:
            dept_dist[a.department] = dept_dist.get(a.department, 0) + 1

            if a.doctor_name not in doctor_load:
                doctor_load[a.doctor_name] = {
                    "doctor_name": a.doctor_name,
                    "department": a.department,
                    "scheduled_appointments": 0,
                    "total_minutes": 0,
                    "utilization_percentage": 0.0,
                }
            doctor_load[a.doctor_name]["scheduled_appointments"] += 1
            doctor_load[a.doctor_name]["total_minutes"] += a.duration_minutes
            doctor_load[a.doctor_name]["utilization_percentage"] = round(
                min(100.0, (doctor_load[a.doctor_name]["total_minutes"] / 480.0) * 100), 1
            )

        return {
            "total_appointments": len(all_appts),
            "department_distribution": dept_dist,
            "clinician_workloads": list(doctor_load.values()),
        }


# Singleton scheduling service
scheduling_service = SchedulingService()
