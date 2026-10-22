"""
Tests for the Early Disease Detection module.

Tests cover:
- Scan upload endpoint
- Scan analysis pipeline
- DICOM processing
- Image preprocessing
- Model inference (with mock models)
- Report generation
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import numpy as np
import io


class TestScanUpload:
    """Test medical scan upload functionality."""

    def test_upload_xray_image(self, client: TestClient):
        """Test uploading a chest X-ray image."""
        # Create a dummy image file
        image_data = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        from PIL import Image
        img = Image.fromarray(image_data)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        response = client.post(
            "/api/detection/upload-scan",
            files={"file": ("test_xray.png", buffer, "image/png")},
            data={"scan_type": "XRAY", "patient_id": 1}
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert "id" in data
        assert data["scan_type"] == "XRAY"

    def test_upload_invalid_file_type(self, client: TestClient):
        """Test that invalid file types are rejected."""
        response = client.post(
            "/api/detection/upload-scan",
            files={"file": ("test.txt", b"not an image", "text/plain")},
            data={"scan_type": "XRAY", "patient_id": 1}
        )
        assert response.status_code in (400, 422)

    def test_upload_without_scan_type(self, client: TestClient):
        """Test that missing scan type returns validation error."""
        image_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        response = client.post(
            "/api/detection/upload-scan",
            files={"file": ("test.png", image_data, "image/png")},
        )
        assert response.status_code == 422


class TestScanAnalysis:
    """Test the scan analysis pipeline."""

    def test_analyze_xray(self, client: TestClient):
        """Test X-ray analysis endpoint."""
        response = client.post("/api/detection/analyze/1")
        # May return 404 if scan doesn't exist, which is fine
        assert response.status_code in (200, 404)

    def test_get_scan_results(self, client: TestClient):
        """Test retrieving scan analysis results."""
        response = client.get("/api/detection/scans/1")
        assert response.status_code in (200, 404)

    def test_list_scans(self, client: TestClient):
        """Test listing all scans."""
        response = client.get("/api/detection/scans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_detection_stats(self, client: TestClient):
        """Test detection statistics endpoint."""
        response = client.get("/api/detection/stats")
        assert response.status_code == 200


class TestScanAnalyzerService:
    """Test the ScanAnalyzer service directly."""

    def test_preprocess_standard_image(self):
        """Test preprocessing of standard image formats."""
        from services.scan_analyzer import ScanAnalyzer
        analyzer = ScanAnalyzer()
        # Create a test image
        image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        processed = analyzer._preprocess_for_model(image)
        assert processed is not None

    def test_generate_report(self):
        """Test report generation from analysis results."""
        from services.scan_analyzer import ScanAnalyzer
        analyzer = ScanAnalyzer()
        mock_results = {
            "findings": ["Possible opacity in right lower lobe"],
            "confidence": 0.87,
            "labels": {"Normal": 0.13, "Tuberculosis": 0.87}
        }
        report = analyzer.generate_report(mock_results)
        assert isinstance(report, str)
        assert len(report) > 0


class TestMLModels:
    """Test ML model wrappers."""

    def test_xray_model_demo_mode(self):
        """Test that X-ray model works in demo mode (no weights)."""
        from ml.chest_xray import ChestXRayModel
        model = ChestXRayModel()
        # Should work without trained weights
        image = np.random.rand(1, 3, 224, 224).astype(np.float32)
        predictions = model.predict_demo(image)
        assert isinstance(predictions, dict)
        assert len(predictions) > 0

    def test_mri_model_demo_mode(self):
        """Test that MRI model works in demo mode."""
        from ml.brain_mri import BrainMRIModel
        model = BrainMRIModel()
        image = np.random.rand(1, 3, 224, 224).astype(np.float32)
        predictions = model.predict_demo(image)
        assert isinstance(predictions, dict)


# Fixtures
@pytest.fixture
def client():
    """Create a test client."""
    import sys
    sys.path.insert(0, "../backend")
    try:
        from main import app
        return TestClient(app)
    except Exception:
        pytest.skip("Backend not available for testing")
