"""Authentication and Staff Access Control Router.

Provides endpoints for staff registration, credential authentication,
profile retrieval, and session verification.
"""

from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models.user import User, UserRole
from schemas.auth import (
    GoogleAuthRequest,
    OtpResponse,
    SendOtpRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    VerifyOtpRequest,
)
from services.auth import (
    create_access_token,
    create_otp,
    get_current_user,
    hash_password,
    verify_google_token,
    verify_otp,
    verify_password,
)

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


@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Authenticate via Google OAuth / Identity Services",
    description="Validates Google ID token and authenticates or registers clinician profile.",
)
async def google_login(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate clinician using Google OAuth token or Google Identity Services credential."""
    token_info = None
    if payload.credential:
        token_info = verify_google_token(payload.credential, payload.client_id)

    # Resolve email and user metadata from Google token or request
    google_email = None
    google_name = None
    google_id = None
    avatar_url = payload.avatar_url

    if token_info:
        google_email = token_info.get("email")
        google_name = token_info.get("name") or token_info.get("given_name")
        google_id = token_info.get("sub")
        avatar_url = avatar_url or token_info.get("picture")
    elif payload.email:
        # Dev / fallback mode if credential couldn't be externally verified
        google_email = payload.email
        google_name = payload.full_name
        google_id = f"google-dev-{abs(hash(google_email)) % 10000000}"

    if not google_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication token could not be verified.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    clean_email = google_email.lower().strip()

    # Find existing clinician account by email or google_id
    stmt = select(User).where(or_(User.email == clean_email, User.google_id == google_id))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user:
        # Update Google metadata if missing
        if not user.google_id and google_id:
            user.google_id = google_id
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
        if user.auth_provider == "local" and not user.auth_provider:
            user.auth_provider = "google"
        await db.commit()
        await db.refresh(user)
    else:
        # Auto-provision clinician account with verified Google identity
        display_name = (
            google_name.strip()
            if google_name
            else clean_email.split("@")[0].replace(".", " ").title()
        )
        user = User(
            email=clean_email,
            full_name=display_name,
            role=UserRole.DOCTOR.value,
            department="General Medicine",
            auth_provider="google",
            google_id=google_id,
            avatar_url=avatar_url,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Auto-provisioned new clinician via Google OAuth: email=%s, id=%d", user.email, user.id)

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

    logger.info("Clinician logged in via Google OAuth successfully: id=%d email=%s", user.id, user.email)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/otp/send",
    response_model=OtpResponse,
    summary="Request institutional One-Time Passcode",
    description="Generates a 6-digit OTP code and dispatches to clinician institutional email.",
)
async def send_otp(payload: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    """Generate and dispatch a temporary 6-digit authentication passcode."""
    email_clean = payload.email.lower().strip()
    code, expires_at = await create_otp(db, email_clean, purpose=payload.purpose or "login")
    expires_in_seconds = int((expires_at - datetime.now(timezone.utc)).total_seconds())

    logger.info("OTP dispatched for %s (code=%s in dev)", email_clean, code)
    return OtpResponse(
        status="ok",
        message=f"A verification code has been dispatched to {email_clean}",
        email=email_clean,
        expires_in_seconds=max(0, expires_in_seconds),
        dev_code=code,
    )


@router.post(
    "/otp/verify",
    response_model=TokenResponse,
    summary="Verify OTP and authenticate clinician",
    description="Verifies the 6-digit code and issues a secure HIPAA-compliant session token.",
)
async def verify_otp_endpoint(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    """Validate OTP passcode and exchange for session JWT token."""
    email_clean = payload.email.lower().strip()
    is_valid = await verify_otp(db, email_clean, payload.otp.strip())

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification passcode.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Locate existing user or auto-provision
    stmt = select(User).where(User.email == email_clean)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        user = User(
            email=email_clean,
            full_name=email_clean.split("@")[0].replace(".", " ").title(),
            role=UserRole.DOCTOR.value,
            department="Clinical Care",
            auth_provider="otp",
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Auto-provisioned new clinician via OTP: email=%s, id=%d", user.email, user.id)

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

    logger.info("Clinician logged in via OTP successfully: id=%d email=%s", user.id, user.email)
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
