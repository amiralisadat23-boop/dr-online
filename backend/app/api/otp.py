import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.otp import OTPCode
from app.models.pending_registration import PendingRegistration
from app.models.user import User
from app.security.jwt import create_access_token
from app.security.password import hash_password, verify_password


router = APIRouter(
    prefix="/auth",
    tags=["Authentication OTP"],
)


class OTPRequest(BaseModel):
    phone: str


class OTPVerifyRequest(BaseModel):
    phone: str
    code: str


def hash_registration_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


@router.post("/request-otp")
async def request_otp(
    data: OTPRequest,
    db: AsyncSession = Depends(get_db),
):
    phone = data.phone.strip()

    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required",
        )

    result = await db.execute(
        select(User).where(User.phone == phone)
    )

    user = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    recent_result = await db.execute(
        select(OTPCode)
        .where(
            OTPCode.phone == phone,
            OTPCode.created_at >= now - timedelta(seconds=60),
            OTPCode.consumed.is_(False),
        )
        .order_by(OTPCode.created_at.desc())
    )

    recent = recent_result.scalars().first()

    if recent:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another code.",
        )

    await db.execute(
        delete(OTPCode).where(
            OTPCode.phone == phone,
            OTPCode.consumed.is_(False),
        )
    )

    code = f"{secrets.randbelow(1_000_000):06d}"

    otp = OTPCode(
        phone=phone,
        code_hash=hash_password(code),
        expires_at=now + timedelta(minutes=3),
        attempts=0,
        consumed=False,
    )

    db.add(otp)
    await db.commit()

    response = {
        "status": "ok",
        "message": "Verification code generated.",
        "expires_in": 180,
        "is_new_user": user is None,
    }

    # Development only.
    # Never expose OTP in production.
    import os

    if os.getenv(
        "DR_ONLINE_ENV",
        "development",
    ) == "development":
        response["dev_code"] = code

    return response


@router.post("/verify-otp")
async def verify_otp(
    data: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    phone = data.phone.strip()
    code = data.code.strip()

    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required.",
        )

    if not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP must be exactly 6 digits.",
        )

    result = await db.execute(
        select(OTPCode)
        .where(
            OTPCode.phone == phone,
            OTPCode.consumed.is_(False),
        )
        .order_by(OTPCode.created_at.desc())
    )

    otp = result.scalars().first()

    if otp is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code not found.",
        )

    now = datetime.now(timezone.utc)

    if otp.expires_at <= now:
        otp.consumed = True
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired.",
        )

    if otp.attempts >= 5:
        otp.consumed = True
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts.",
        )

    if not verify_password(
        code,
        otp.code_hash,
    ):
        otp.attempts += 1
        await db.commit()

        remaining = max(
            0,
            5 - otp.attempts,
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid verification code. "
                f"Attempts remaining: {remaining}"
            ),
        )

    result = await db.execute(
        select(User).where(User.phone == phone)
    )

    user = result.scalar_one_or_none()

    # OTP has now been successfully verified.
    otp.consumed = True

    # Existing user → normal login.
    if user is not None:
        await db.commit()

        token = create_access_token(user)

        return {
            "status": "ok",
            "account_status": "existing_user",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "phone": user.phone,
                "role": user.role,
            },
        }

    # New user → create short-lived registration token.
    registration_token = secrets.token_urlsafe(32)

    registration_token_hash = hash_registration_token(
        registration_token
    )

    # Remove old pending registration for this phone.
    await db.execute(
        delete(PendingRegistration).where(
            PendingRegistration.phone == phone
        )
    )

    pending = PendingRegistration(
        phone=phone,
        registration_token_hash=registration_token_hash,
        expires_at=now + timedelta(minutes=10),
        consumed=False,
    )

    db.add(pending)

    await db.commit()

    return {
        "status": "ok",
        "account_status": "new_user",
        "registration_token": registration_token,
        "expires_in": 600,
        "phone": phone,
    }