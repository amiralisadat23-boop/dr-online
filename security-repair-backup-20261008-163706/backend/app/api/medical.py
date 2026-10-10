from fastapi import Depends, HTTPException

from app.models.user import User
from app.security.jwt import (
    get_current_user,
    ensure_self_access,
)
from datetime import datetime
from typing import Optional

from app.security.jwt import get_current_user
from app.models.user import User

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.medical_db import (
    add_vital,
    get_profile,
    get_vitals,
    save_profile,
)

router = APIRouter(
    prefix="/medical",
    tags=["medical"],
)


class PatientProfileRequest(BaseModel):
    user_id: int
    national_id: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=150)
    height_cm: Optional[float] = Field(default=None, ge=0, le=300)
    weight_kg: Optional[float] = Field(default=None, ge=0, le=500)
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    caregiver_phone: Optional[str] = None
    conditions: Optional[str] = None
    allergies: Optional[str] = None
    smoker: bool = False


class VitalRequest(BaseModel):
    patient_user_id: int
    type: str = Field(min_length=2, max_length=30)
    value: float
    value2: Optional[float] = None
    context: Optional[str] = None


@router.get("/patients/{user_id}/profile")
async def patient_profile(user_id: int):
    profile = get_profile(user_id)

    if profile is None:
        return {
            "status": "ok",
            "profile": None,
        }

    return {
        "status": "ok",
        "profile": profile,
    }


@router.put("/patients/{user_id}/profile")
async def update_patient_profile(
    user_id: int,
    payload: PatientProfileRequest,
):
    if payload.user_id != user_id:
        raise HTTPException(
            status_code=400,
            detail="user_id mismatch",
        )

    profile = save_profile(
        user_id=user_id,
        national_id=payload.national_id,
        age=payload.age,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        gender=payload.gender,
        blood_type=payload.blood_type,
        caregiver_phone=payload.caregiver_phone,
        conditions=payload.conditions,
        allergies=payload.allergies,
        smoker=payload.smoker,
    )

    return {
        "status": "ok",
        "profile": profile,
    }


@router.post("/vitals")
async def create_vital(payload: VitalRequest):
    vital = add_vital(
        patient_user_id=payload.patient_user_id,
        vital_type=payload.type,
        value=payload.value,
        value2=payload.value2,
        context=payload.context,
        recorded_at=datetime.utcnow().isoformat(),
    )

    return {
        "status": "ok",
        "vital": vital,
    }


@router.get("/patients/{user_id}/vitals")
async def patient_vitals(user_id: int):
    vitals = get_vitals(user_id)

    return {
        "status": "ok",
        "vitals": vitals,
    }


