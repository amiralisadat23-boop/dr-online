from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.medical import PatientProfile, Vital
from app.models.user import User
from app.security.jwt import get_current_user, ensure_self_access


router = APIRouter(
    prefix="/medical",
    tags=["Medical"],
)


class PatientProfileRequest(BaseModel):
    user_id: int
    national_id: str
    age: int
    height_cm: float
    weight_kg: float
    gender: str
    blood_type: str
    caregiver_phone: str
    conditions: list[str] = []
    allergies: str = ""
    smoker: bool = False


class VitalRequest(BaseModel):
    patient_user_id: int
    type: str
    value: float
    value2: Optional[float] = None
    context: Optional[str] = None


@router.get("/patients/{user_id}/profile")
async def read_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_self_access(current_user, user_id)

    result = await db.execute(
        select(PatientProfile).where(
            PatientProfile.user_id == user_id
        )
    )

    profile = result.scalar_one_or_none()

    if profile is None:
        return {
            "status": "ok",
            "profile": None,
        }

    return {
        "status": "ok",
        "profile": {
            "id": profile.id,
            "user_id": profile.user_id,
            "national_id": profile.national_id,
            "age": profile.age,
            "height_cm": profile.height_cm,
            "weight_kg": profile.weight_kg,
            "gender": profile.gender,
            "blood_type": profile.blood_type,
            "caregiver_phone": profile.caregiver_phone,
            "conditions": (
                profile.conditions.split(",")
                if profile.conditions
                else []
            ),
            "allergies": profile.allergies or "",
            "smoker": profile.smoker,
        },
    }


@router.put("/patients/{user_id}/profile")
async def update_profile(
    user_id: int,
    data: PatientProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_self_access(current_user, user_id)

    if data.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID mismatch",
        )

    result = await db.execute(
        select(PatientProfile).where(
            PatientProfile.user_id == user_id
        )
    )

    profile = result.scalar_one_or_none()

    conditions_text = ",".join(data.conditions)

    if profile is None:
        profile = PatientProfile(
            user_id=user_id,
            national_id=data.national_id,
            age=data.age,
            height_cm=data.height_cm,
            weight_kg=data.weight_kg,
            gender=data.gender,
            blood_type=data.blood_type,
            caregiver_phone=data.caregiver_phone,
            conditions=conditions_text,
            allergies=data.allergies,
            smoker=data.smoker,
        )

        db.add(profile)

    else:
        profile.national_id = data.national_id
        profile.age = data.age
        profile.height_cm = data.height_cm
        profile.weight_kg = data.weight_kg
        profile.gender = data.gender
        profile.blood_type = data.blood_type
        profile.caregiver_phone = data.caregiver_phone
        profile.conditions = conditions_text
        profile.allergies = data.allergies
        profile.smoker = data.smoker

    await db.commit()
    await db.refresh(profile)

    return {
        "status": "ok",
        "profile": {
            "id": profile.id,
            "user_id": profile.user_id,
            "national_id": profile.national_id,
            "age": profile.age,
            "height_cm": profile.height_cm,
            "weight_kg": profile.weight_kg,
            "gender": profile.gender,
            "blood_type": profile.blood_type,
            "caregiver_phone": profile.caregiver_phone,
            "conditions": data.conditions,
            "allergies": profile.allergies or "",
            "smoker": profile.smoker,
        },
    }


@router.post("/vitals")
async def create_vital(
    data: VitalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_self_access(current_user, data.patient_user_id)

    vital = Vital(
        patient_user_id=data.patient_user_id,
        type=data.type,
        value=data.value,
        value2=data.value2,
        context=data.context,
        recorded_at=datetime.now(timezone.utc).isoformat(),
    )

    db.add(vital)

    await db.commit()
    await db.refresh(vital)

    return {
        "status": "ok",
        "vital": {
            "id": vital.id,
            "patient_user_id": vital.patient_user_id,
            "type": vital.type,
            "value": vital.value,
            "value2": vital.value2,
            "context": vital.context,
            "recorded_at": vital.recorded_at,
        },
    }


@router.get("/patients/{user_id}/vitals")
async def read_vitals(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_self_access(current_user, user_id)

    result = await db.execute(
        select(Vital)
        .where(Vital.patient_user_id == user_id)
        .order_by(Vital.recorded_at.desc())
    )

    vitals = result.scalars().all()

    return {
        "status": "ok",
        "vitals": [
            {
                "id": vital.id,
                "patient_user_id": vital.patient_user_id,
                "type": vital.type,
                "value": vital.value,
                "value2": vital.value2,
                "context": vital.context,
                "recorded_at": vital.recorded_at,
            }
            for vital in vitals
        ],
    }