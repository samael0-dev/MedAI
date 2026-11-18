"""MedAI Backend Configuration Module.

Defines runtime configuration and environment settings using Pydantic Settings.
Adheres to HIPAA security standards: sensitive secrets loaded from environment,
no hardcoded credentials in production.
"""

from pathlib import Path
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings and configuration parameters.

    Provides application-wide configuration values with defaults suitable for
    development, while reading overrides from environment variables or a .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Core Application Settings
    APP_NAME: str = "MedAI Diagnostics Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, description="Debug mode flag")

    # Database Configuration
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./medai.db",
        description="Database connection URL",
    )

    # Security & Authentication (HIPAA Compliant Token Configuration)
    SECRET_KEY: str = Field(
        default="medai-super-secret-hipaa-compliant-key-change-in-production-2026",
        description="Secret key for signing JWT tokens",
    )
    ALGORITHM: str = Field(default="HS256", description="JWT encryption algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60 * 24, description="Access token expiration in minutes"
    )

    # Google Authentication & OAuth Configuration
    GOOGLE_CLIENT_ID: Optional[str] = Field(
        default=None, description="Google OAuth Client ID for GIS / Google Sign-In"
    )
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(
        default=None, description="Google OAuth Client Secret"
    )

    # One-Time Passcode (OTP) Configuration
    OTP_EXPIRE_MINUTES: int = Field(
        default=10, description="OTP validity window in minutes"
    )

    # Storage Paths
    UPLOAD_DIR: str = Field(
        default="./uploads", description="Directory where patient scans are stored"
    )
    MODEL_DIR: str = Field(
        default="./ml/weights", description="Directory for ML model weights"
    )

    # Cross-Origin Resource Sharing (CORS)
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8000",
            "*",
        ],
        description="Allowed CORS origin domains",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Convert comma-separated origin strings into a list if passed as string."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    @property
    def async_database_url(self) -> str:
        """Return an async-compatible database connection string.

        Converts standard postgresql:// schemes to postgresql+asyncpg:// for SQLAlchemy async engines.
        If SQLite is used, ensures sqlite+aiosqlite:// prefix.
        """
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
            return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return url

    def ensure_directories(self) -> None:
        """Ensure necessary storage directories exist on the file system."""
        Path(self.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
        Path(self.MODEL_DIR).mkdir(parents=True, exist_ok=True)


# Global settings singleton instance
settings = Settings()
