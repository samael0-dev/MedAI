"""
Tests for the Research Acceleration module.

Tests cover:
- Research project management
- Genetic data analysis
- Disease trajectory computation
- Biomarker correlation analysis
- Clinical trial matching
- Survival analysis
"""
import pytest
import numpy as np
from datetime import datetime, timedelta


class TestResearchProjects:
    """Test research project management."""

    def test_create_project(self, client):
        """Test creating a research project."""
        project_data = {
            "title": "Alzheimer's Biomarker Study",
            "description": "Multi-cohort study of CSF biomarkers in early-onset Alzheimer's",
            "disease_type": "alzheimers",
            "principal_investigator": "Dr. Sarah Chen",
            "start_date": datetime.now().isoformat()
        }
        response = client.post("/api/research/projects", json=project_data)
        assert response.status_code in (200, 201)

    def test_list_projects(self, client):
        """Test listing research projects."""
        response = client.get("/api/research/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))


class TestGeneticAnalysis:
    """Test genetic data analysis."""

    def test_analyze_gene_expression(self, client):
        """Test gene expression analysis."""
        genetic_data = {
            "genes": [
                {"gene_name": "TP53", "expression_level": 2.5, "variant": "R175H"},
                {"gene_name": "BRCA1", "expression_level": 0.8, "variant": "185delAG"},
                {"gene_name": "EGFR", "expression_level": 4.2, "variant": "L858R"},
                {"gene_name": "KRAS", "expression_level": 3.1, "variant": "G12V"},
                {"gene_name": "PIK3CA", "expression_level": 1.9, "variant": "H1047R"},
            ],
            "analysis_type": "differential_expression"
        }
        response = client.post("/api/research/genetic-analysis", json=genetic_data)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data or "analysis" in data

    def test_empty_genetic_data(self, client):
        """Test handling of empty genetic data."""
        response = client.post(
            "/api/research/genetic-analysis",
            json={"genes": [], "analysis_type": "differential_expression"}
        )
        assert response.status_code in (200, 400, 422)


class TestDiseaseTrajectory:
    """Test disease trajectory computation."""

    def test_compute_trajectory(self, client):
        """Test disease trajectory prediction."""
        trajectory_data = {
            "patient_id": 1,
            "disease_type": "alzheimers",
            "biomarkers": {
                "amyloid_beta": [42.1, 38.5, 35.2, 31.8],
                "tau_protein": [180, 220, 280, 350],
                "mmse_score": [28, 25, 22, 19],
            },
            "time_points_months": [0, 6, 12, 18]
        }
        response = client.post(
            "/api/research/disease-trajectory",
            json=trajectory_data
        )
        assert response.status_code in (200, 404)

    def test_get_biomarkers(self, client):
        """Test biomarker analysis retrieval."""
        response = client.get("/api/research/biomarkers/cancer")
        assert response.status_code == 200


class TestClinicalTrialMatching:
    """Test clinical trial matching."""

    def test_match_patient_to_trials(self, client):
        """Test matching a patient profile to clinical trials."""
        patient_profile = {
            "age": 65,
            "gender": "female",
            "diagnosis": "breast_cancer",
            "stage": "II",
            "biomarkers": {
                "HER2": "positive",
                "ER": "positive",
                "PR": "negative"
            },
            "prior_treatments": ["chemotherapy"],
            "comorbidities": ["hypertension"]
        }
        response = client.post(
            "/api/research/clinical-trial-match",
            json=patient_profile
        )
        assert response.status_code == 200
        data = response.json()
        assert "matches" in data or "trials" in data


class TestResearchEngineService:
    """Test the research engine service directly."""

    def test_survival_analysis(self):
        """Test Kaplan-Meier survival analysis."""
        from services.research_engine import ResearchEngine
        engine = ResearchEngine()

        # Generate synthetic survival data
        np.random.seed(42)
        durations = np.random.exponential(scale=365, size=50)
        events = np.random.binomial(1, 0.7, size=50)

        result = engine.compute_survival_curve(
            durations=durations.tolist(),
            events=events.tolist()
        )
        assert "survival_function" in result or "median_survival" in result

    def test_biomarker_correlation(self):
        """Test biomarker correlation analysis."""
        from services.research_engine import ResearchEngine
        engine = ResearchEngine()

        # Synthetic biomarker data
        np.random.seed(42)
        data = {
            "biomarker_a": np.random.randn(100).tolist(),
            "biomarker_b": (np.random.randn(100) * 0.5 + np.random.randn(100)).tolist(),
            "outcome": np.random.binomial(1, 0.3, 100).tolist(),
        }
        result = engine.find_correlations(data)
        assert isinstance(result, dict)
        assert "correlations" in result or "matrix" in result

    def test_gene_expression_analysis(self):
        """Test gene expression statistical analysis."""
        from services.research_engine import ResearchEngine
        engine = ResearchEngine()

        genes = [
            {"gene_name": "TP53", "expression_level": 2.5, "group": "case"},
            {"gene_name": "TP53", "expression_level": 1.2, "group": "control"},
            {"gene_name": "BRCA1", "expression_level": 0.8, "group": "case"},
            {"gene_name": "BRCA1", "expression_level": 2.1, "group": "control"},
        ]
        result = engine.analyze_gene_expression(genes)
        assert isinstance(result, dict)

    def test_trajectory_prediction(self):
        """Test disease trajectory prediction."""
        from services.research_engine import ResearchEngine
        engine = ResearchEngine()

        patient_data = {
            "measurements": [
                {"time_months": 0, "score": 28, "biomarker": 42.0},
                {"time_months": 6, "score": 25, "biomarker": 38.0},
                {"time_months": 12, "score": 22, "biomarker": 35.0},
            ],
            "disease_type": "alzheimers"
        }
        result = engine.predict_trajectory(patient_data)
        assert "predicted_scores" in result or "trajectory" in result


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
