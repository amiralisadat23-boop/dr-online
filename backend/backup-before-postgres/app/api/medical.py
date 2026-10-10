from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from pydantic import BaseModel

from app.models.user import User

from app.security.jwt import (
    get_current_user,
    ensure_self_access,
)

from app.medical_db import (
    get_profile,
    save_profile,
    add_vital,
    get_vitals,
)


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


@router.get(
    "/patients/{user_id}/profile"
)
async def read_profile(
    user_id: int,
    current_user: User = Depends(
        get_current_user
    ),
):

    ensure_self_access(
        current_user,
        user_id,
    )

    profile = get_profile(user_id)

    return {
        "status": "ok",
        "profile": profile,
    }


@router.put(
    "/patients/{user_id}/profile"
)
async def update_profile(
    user_id: int,
    data: PatientProfileRequest,
    current_user: User = Depends(
        get_current_user
    ),
):

    ensure_self_access(
        current_user,
        user_id,
    )

    if data.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID mismatch",
        )

    profile = save_profile(
        user_id=user_id,
        national_id=data.national_id,
        age=data.age,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        gender=data.gender,
        blood_type=data.blood_type,
        caregiver_phone=data.caregiver_phone,
        conditions=data.conditions,
        allergies=data.allergies,
        smoker=data.smoker,
    )

    return {
        "status": "ok",
        "profile": profile,
    }


@router.post(
    "/vitals"
)
async def create_vital(
    data: VitalRequest,
    current_user: User = Depends(
        get_current_user
    ),
):

    ensure_self_access(
        current_user,
        data.patient_user_id,
    )

    vital = add_vital(
        patient_user_id=data.patient_user_id,
        type=data.type,
        value=data.value,
        value2=data.value2,
        context=data.context,
    )

    return {
        "status": "ok",
        "vital": vital,
    }


@router.get(
    "/patients/{user_id}/vitals"
)
async def read_vitals(
    user_id: int,
    current_user: User = Depends(
        get_current_user
    ),
):

    ensure_self_access(
        current_user,
        user_id,
    )

    vitals = get_vitals(user_id)

    return {
        "status": "ok",
        "vitals": vitals,
    }
