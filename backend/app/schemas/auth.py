from pydantic import BaseModel, Field, field_validator

VALID_ROLES = {"patient", "caregiver", "doctor"}


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    password: str = Field(min_length=8, max_length=128)
    role: str = "patient"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = (value or "patient").strip().lower()
        if normalized not in VALID_ROLES:
            raise ValueError("Role must be one of: patient, caregiver, doctor.")
        return normalized


class LoginRequest(BaseModel):
    phone: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    phone: str
    role: str

    model_config = {
        "from_attributes": True,
    }
