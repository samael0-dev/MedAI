"""Authentication and User Pydantic Schemas.

Defines payloads for user registration, credential authentication, JWT token exchange,
and current user profile responses.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserRegisterRequest(BaseModel):
    """Schema for registering a new clinician or researcher account."""

    email: str = Field(..., min_length=3, max_length=255, description="Institutional email address")
    password: str = Field(..., min_length=6, max_length=128, description="Account password")
    full_name: str = Field(..., min_length=2, max_length=255, description="Clinician legal full name")
    role: str = Field(default="doctor", description="Role: admin, doctor, radiologist, researcher, nurse")
    department: Optional[str] = Field(None, max_length=100, description="Hospital department")


class UserLoginRequest(BaseModel):
    """Credentials payload for JWT token generation."""

    email: str = Field(..., min_length=3, max_length=255, description="Clinician email address")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    """User profile response without sensitive credential hashes."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT bearer token and authenticated user payload."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse
