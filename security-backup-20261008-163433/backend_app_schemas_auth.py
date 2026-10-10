from pydantic import BaseModel, Field

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    password: str = Field(min_length=8, max_length=128)
    role: str = "patient"

class LoginRequest(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    phone: str
    role: str

    model_config = {
        "from_attributes": True
    }
