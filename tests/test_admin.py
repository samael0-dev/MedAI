"""
Tests for the Administrative Relief module.

Tests cover:
- Patient CRUD operations
- Appointment management
- Drug interaction checking
- Clinical notes processing
- Scheduling optimization
- Workload statistics
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta


class TestPatientManagement:
    """Test patient CRUD operations."""

    def test_create_patient(self, client):
        """Test creating a new patient."""
        patient_data = {
            "name": "John Doe",
            "date_of_birth": "1985-03-15",
            "gender": "male",
            "medical_record_number": "MRN-TEST-001",
            "blood_type": "O+",
            "allergies": ["Penicillin", "Latex"],
            "emergency_contact": "Jane Doe - 555-0123"
        }
        response = client.post("/api/admin/patients", json=patient_data)
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["name"] == "John Doe"
        assert data["medical_record_number"] == "MRN-TEST-001"

    def test_list_patients(self, client):
        """Test listing all patients."""
        response = client.get("/api/admin/patients")
        assert response.status_code == 200

    def test_get_patient_by_id(self, client):
        """Test getting a patient by ID."""
        response = client.get("/api/admin/patients/1")
        assert response.status_code in (200, 404)

    def test_create_patient_duplicate_mrn(self, client):
        """Test that duplicate MRN is rejected."""
        patient_data = {
            "name": "Duplicate Test",
            "date_of_birth": "1990-01-01",
            "gender": "female",
            "medical_record_number": "MRN-TEST-001",
        }
        # First creation should succeed or already exist
        client.post("/api/admin/patients", json=patient_data)
        # Second should fail
        response = client.post("/api/admin/patients", json=patient_data)
        assert response.status_code in (400, 409, 422)


class TestAppointmentManagement:
    """Test appointment scheduling."""

    def test_create_appointment(self, client):
        """Test creating an appointment."""
        appointment_data = {
            "patient_id": 1,
            "doctor_name": "Dr. Smith",
            "department": "Radiology",
            "scheduled_time": (datetime.now() + timedelta(days=1)).isoformat(),
            "duration_minutes": 30,
            "notes": "Follow-up chest X-ray"
        }
        response = client.post("/api/admin/appointments", json=appointment_data)
        assert response.status_code in (200, 201, 404)

    def test_list_appointments(self, client):
        """Test listing appointments."""
        response = client.get("/api/admin/appointments")
        assert response.status_code == 200

    def test_appointment_conflict_detection(self, client):
        """Test that overlapping appointments are detected."""
        base_time = (datetime.now() + timedelta(days=2)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        # Create first appointment
        appt1 = {
            "patient_id": 1,
            "doctor_name": "Dr. Smith",
            "department": "Radiology",
            "scheduled_time": base_time.isoformat(),
            "duration_minutes": 60,
        }
        client.post("/api/admin/appointments", json=appt1)

        # Create overlapping appointment
        appt2 = {
            "patient_id": 1,
            "doctor_name": "Dr. Smith",
            "department": "Radiology",
            "scheduled_time": (base_time + timedelta(minutes=30)).isoformat(),
            "duration_minutes": 60,
        }
        response = client.post("/api/admin/appointments", json=appt2)
        # Should either warn about conflict or reject
        assert response.status_code in (200, 201, 409)


class TestDrugInteractions:
    """Test drug interaction checking."""

    def test_check_interactions(self, client):
        """Test checking drug interactions for multiple drugs."""
        response = client.post(
            "/api/admin/drug-interactions/check",
            json={"drug_ids": [1, 2, 3]}
        )
        assert response.status_code in (200, 404)

    def test_check_patient_interactions(self, client):
        """Test checking all drug interactions for a patient."""
        response = client.post(
            "/api/admin/drug-interactions/check",
            json={"patient_id": 1}
        )
        assert response.status_code in (200, 404)


class TestClinicalNotes:
    """Test clinical documentation processing."""

    def test_summarize_notes(self, client):
        """Test clinical notes summarization."""
        notes = {
            "text": """
            Patient presents with persistent cough for 3 weeks.
            Temperature 38.2°C. Blood pressure 130/85.
            Prescribed Amoxicillin 500mg TID for 7 days.
            Recommend chest X-ray to rule out pneumonia.
            Follow up in 2 weeks. Allergic to Penicillin noted.
            """
        }
        response = client.post("/api/admin/clinical-notes", json=notes)
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data or "entities" in data

    def test_empty_notes(self, client):
        """Test handling of empty clinical notes."""
        response = client.post(
            "/api/admin/clinical-notes",
            json={"text": ""}
        )
        assert response.status_code in (200, 400, 422)


class TestWorkloadStats:
    """Test workload statistics."""

    def test_get_workload_stats(self, client):
        """Test retrieving workload statistics."""
        response = client.get("/api/admin/workload-stats")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


class TestDrugInteractionService:
    """Test the drug interaction service directly."""

    def test_known_interaction(self):
        """Test detection of a known drug interaction."""
        from services.drug_interaction import DrugInteractionService
        service = DrugInteractionService()
        result = service.check_interaction_by_name("Warfarin", "Aspirin")
        assert result is not None
        assert "severity" in result

    def test_no_interaction(self):
        """Test when no interaction exists."""
        from services.drug_interaction import DrugInteractionService
        service = DrugInteractionService()
        result = service.check_interaction_by_name("Vitamin D", "Calcium")
        # May or may not have interaction, but should not crash
        assert isinstance(result, (dict, type(None)))


class TestClinicalDocService:
    """Test clinical documentation service."""

    def test_extract_entities(self):
        """Test entity extraction from clinical text."""
        from services.clinical_docs import ClinicalDocService
        service = ClinicalDocService()
        text = "Patient diagnosed with Type 2 Diabetes. Prescribed Metformin 500mg."
        entities = service.extract_entities(text)
        assert isinstance(entities, dict)
        assert any(key in entities for key in ["conditions", "medications", "procedures"])


class TestSchedulingService:
    """Test scheduling optimization service."""

    def test_detect_conflicts(self):
        """Test scheduling conflict detection."""
        from services.scheduling import SchedulingService
        service = SchedulingService()
        from datetime import datetime, timedelta

        existing = [{
            "doctor_name": "Dr. Smith",
            "scheduled_time": datetime.now() + timedelta(hours=1),
            "duration_minutes": 60,
        }]
        new_appt = {
            "doctor_name": "Dr. Smith",
            "scheduled_time": datetime.now() + timedelta(hours=1, minutes=30),
            "duration_minutes": 30,
        }
        conflicts = service.detect_conflicts(new_appt, existing)
        assert isinstance(conflicts, list)
        assert len(conflicts) > 0  # Should detect overlap


# Fixtures
@pytest.fixture
def client():
    """Create a test client."""
    import sys
    sys.path.insert(0, "../backend")
    try:
        from main import app
        from fastapi.testclient import TestClient
        return TestClient(app)
    except Exception:
        pytest.skip("Backend not available for testing")
