"""Tests for the MedAI Authentication and Access Control module.

Tests cover:
- User registration and validation
- Duplicate email prevention
- Password hashing and verification
- JWT token issuance and decoding
- Credential login
- Current user profile retrieval
- Protected route authentication checks
"""

import pytest
from fastapi.testclient import TestClient
from services.auth import create_access_token, decode_access_token, hash_password, verify_password


class TestPasswordAndTokenSecurity:
    """Test cryptographic functions for passwords and JWT tokens."""

    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = "SecureClinicalPassword2026!"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("WrongPassword!", hashed) is False

    def test_token_creation_and_decoding(self):
        """Test JWT token generation and validation."""
        payload = {"sub": "dr.smith@hospital.org", "role": "radiologist"}
        token = create_access_token(payload)
        assert isinstance(token, str)

        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "dr.smith@hospital.org"
        assert decoded["role"] == "radiologist"

    def test_invalid_token_decoding(self):
        """Test decoding an invalid or tampered token."""
        assert decode_access_token("not-a-valid-jwt-token") is None


class TestAuthenticationAPI:
    """Test auth API endpoints."""

    def test_register_user(self, client: TestClient):
        """Test registering a new clinician account."""
        user_payload = {
            "email": "nurse.clara@hospital.org",
            "password": "ClinicalPassword123!",
            "full_name": "Clara Oswald",
            "role": "nurse",
            "department": "Emergency Care",
        }
        response = client.post("/api/auth/register", json=user_payload)
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["email"] == "nurse.clara@hospital.org"
        assert data["full_name"] == "Clara Oswald"
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client: TestClient):
        """Test that registering an existing email returns 409 conflict."""
        user_payload = {
            "email": "nurse.clara@hospital.org",
            "password": "AnotherPassword123!",
            "full_name": "Clara Clone",
            "role": "nurse",
        }
        response = client.post("/api/auth/register", json=user_payload)
        assert response.status_code == 409

    def test_login_success(self, client: TestClient):
        """Test logging in with valid credentials."""
        # First ensure a user exists
        user_payload = {
            "email": "dr.house@hospital.org",
            "password": "DiagnosticsPassword1!",
            "full_name": "Dr. Gregory House",
            "role": "doctor",
            "department": "Diagnostics",
        }
        client.post("/api/auth/register", json=user_payload)

        # Login
        login_payload = {
            "email": "dr.house@hospital.org",
            "password": "DiagnosticsPassword1!",
        }
        response = client.post("/api/auth/login", json=login_payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "dr.house@hospital.org"

    def test_login_invalid_password(self, client: TestClient):
        """Test logging in with incorrect password returns 401."""
        login_payload = {
            "email": "dr.house@hospital.org",
            "password": "WrongPassword999!",
        }
        response = client.post("/api/auth/login", json=login_payload)
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        """Test logging in with unregistered email returns 401."""
        login_payload = {
            "email": "nonexistent.clinician@hospital.org",
            "password": "SomePassword123!",
        }
        response = client.post("/api/auth/login", json=login_payload)
        assert response.status_code == 401

    def test_get_me_authenticated(self, client: TestClient):
        """Test retrieving current user profile with valid Bearer token."""
        # Login to get token
        login_res = client.post(
            "/api/auth/login",
            json={"email": "dr.house@hospital.org", "password": "DiagnosticsPassword1!"},
        )
        token = login_res.json()["access_token"]

        # Call /me
        response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "dr.house@hospital.org"
        assert data["full_name"] == "Dr. Gregory House"

    def test_get_me_unauthenticated(self, client: TestClient):
        """Test calling /me without authorization header returns 401."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_logout(self, client: TestClient):
        """Test logging out an authenticated session."""
        login_res = client.post(
            "/api/auth/login",
            json={"email": "dr.house@hospital.org", "password": "DiagnosticsPassword1!"},
        )
        token = login_res.json()["access_token"]

        response = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


# Fixtures
@pytest.fixture
def client():
    """Create a test client."""
    import sys
    sys.path.insert(0, "../backend")
    from main import app
    return TestClient(app)
