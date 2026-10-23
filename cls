warning: in the working copy of 'backend/app/schemas/auth.py', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/backend/app/schemas/auth.py b/backend/app/schemas/auth.py[m
[1mindex e80e938..6c4e174 100644[m
[1m--- a/backend/app/schemas/auth.py[m
[1m+++ b/backend/app/schemas/auth.py[m
[36m@@ -1,4 +1,7 @@[m
[31m-﻿from pydantic import BaseModel, Field[m
[32m+[m[32m﻿from pydantic import BaseModel, Field, field_validator[m
[32m+[m
[32m+[m[32mVALID_ROLES = {"patient", "caregiver", "doctor"}[m
[32m+[m
 [m
 class RegisterRequest(BaseModel):[m
     name: str = Field(min_length=2, max_length=100)[m
[36m@@ -6,10 +9,20 @@[m [mclass RegisterRequest(BaseModel):[m
     password: str = Field(min_length=8, max_length=128)[m
     role: str = "patient"[m
 [m
[32m+[m[32m    @field_validator("role")[m
[32m+[m[32m    @classmethod[m
[32m+[m[32m    def validate_role(cls, value: str) -> str:[m
[32m+[m[32m        normalized = (value or "patient").strip().lower()[m
[32m+[m[32m        if normalized not in VALID_ROLES:[m
[32m+[m[32m            raise ValueError("Role must be one of: patient, caregiver, doctor.")[m
[32m+[m[32m        return normalized[m
[32m+[m
[32m+[m
 class LoginRequest(BaseModel):[m
     phone: str[m
     password: str[m
 [m
[32m+[m
 class UserResponse(BaseModel):[m
     id: int[m
     name: str[m
[36m@@ -17,5 +30,5 @@[m [mclass UserResponse(BaseModel):[m
     role: str[m
 [m
     model_config = {[m
[31m-        "from_attributes": True[m
[32m+[m[32m        "from_attributes": True,[m
     }[m
