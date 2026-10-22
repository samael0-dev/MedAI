"""Authentication and Staff Access Control Router.

Provides endpoints for staff registration, credential authentication,
profile retrieval, and session verification.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models.user import User, UserRole
from schemas.auth import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from services.auth import create_access_token, get_current_user, hash_password, verify_password

logger = logging.getLogger("medai.api.auth")

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register clinician account",
    description="Registers a new healthcare provider or researcher profile.",
)
async def register(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new staff or clinician user."""
    # Check if user already exists
    stmt = select(User).where(User.email == payload.email.lower().strip())
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{payload.email}' is already registered.",
        )

    # Validate role
    role_val = payload.role.lower().strip()
    valid_roles = [r.value for r in UserRole]
    if role_val not in valid_roles:
        role_val = UserRole.DOCTOR.value

    user = User(
        email=payload.email.lower().strip(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=role_val,
        department=payload.department.strip() if payload.department else None,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("Registered new user account: id=%d, email=%s, role=%s", user.id, user.email, user.role)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive JWT token",
    description="Validates clinician credentials and issues a HIPAA-compliant JWT access token.",
)
async def login(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """Verify email and password, returning an access token and user profile."""
    email_clean = payload.email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        logger.warning("Failed login attempt for email: %s", email_clean)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact system administrator.",
        )

    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role,
            "full_name": user.full_name,
        }
    )

    logger.info("User logged in successfully: id=%d email=%s", user.id, user.email)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Returns the profile details of the currently authenticated clinician.",
)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return current logged-in clinician profile."""
    return current_user


@router.post(
    "/logout",
    summary="End authenticated session",
    description="Acknowledges client-side token discard for security audit logs.",
)
async def logout(current_user: User = Depends(get_current_user)):
    """Log out current clinician session."""
    logger.info("User logged out: id=%d email=%s", current_user.id, current_user.email)
    return {"message": "Successfully logged out", "status": "ok"}
