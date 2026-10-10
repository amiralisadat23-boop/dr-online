from pydantic import BaseModel
from datetime import datetime, timezone
import hashlib
import secrets
from app.models.medical import PatientProfile
from app.models.pending_registration import PendingRegistration
from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
)

from app.security.password import (
    hash_password,
    verify_password,
)

from app.security.jwt import (
    create_access_token,
    get_current_user,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(User).where(
            User.phone == data.phone
        )
    )

    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
        )

    user = User(
        name=data.name,
        phone=data.phone,
        password_hash=hash_password(
            data.password
        ),
        role=data.role,
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    return user


@router.post("/login")
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(User).where(
            User.phone == data.phone
        )
    )

    user = result.scalar_one_or_none()

    if (
        not user
        or not verify_password(
            data.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(user)

    return {
        "status": "ok",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "role": user.role,
        },
    }


@router.get("/me")
async def me(
    current_user: User = Depends(
        get_current_user
    ),
):

    return {
        "id": current_user.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "role": current_user.role,
    }

class CompleteRegistrationRequest(BaseModel):
    registration_token: str
    name: str
    role: str = "patient"
    national_id: str | None = None
    age: int | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    gender: str | None = None
    blood_type: str | None = None
    caregiver_phone: str | None = None
    conditions: list[str] = []
    allergies: str | None = None
    smoker: bool = False


@router.post("/complete-registration")
async def complete_registration(
    data: CompleteRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    token = data.registration_token.strip()
    name = data.name.strip()
    role = data.role.strip().lower()

    if not token or not name:
        raise HTTPException(
            status_code=400,
            detail="Token and name are required.",
        )

    if role not in {"patient", "caregiver", "doctor"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid role.",
        )

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    result = await db.execute(
        select(PendingRegistration).where(
            PendingRegistration.registration_token_hash == token_hash,
            PendingRegistration.consumed.is_(False),
        )
    )

    pending = result.scalar_one_or_none()

    if pending is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired registration token.",
        )

    now = datetime.now(timezone.utc)

    if pending.expires_at <= now:
        pending.consumed = True
        await db.commit()

        raise HTTPException(
            status_code=400,
            detail="Registration token expired.",
        )

    phone = pending.phone

    result = await db.execute(
        select(User).where(User.phone == phone)
    )

    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="Phone number already registered.",
        )

    user = User(
        name=name,
        phone=phone,
        password_hash=hash_password(
            secrets.token_urlsafe(48)
        ),
        role=role,
    )

    db.add(user)
    await db.flush()

    if role == "patient":
        db.add(
            PatientProfile(
                user_id=user.id,
                national_id=data.national_id,
                age=data.age,
                height_cm=data.height_cm,
                weight_kg=data.weight_kg,
                gender=data.gender,
                blood_type=data.blood_type,
                caregiver_phone=data.caregiver_phone,
                conditions=",".join(data.conditions),
                allergies=data.allergies or "",
                smoker=data.smoker,
            )
        )

    pending.consumed = True

    await db.commit()
    await db.refresh(user)

    return {
        "status": "ok",
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "role": user.role,
        },
    }
