from fastapi import FastAPI
from app.database import init_db
from app.medical_db import init_medical_db

from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.medical import router as medical_router


app = FastAPI(
    title="Dr Online API",
    version="1.0.0",
    description="Backend API for Dr Online",
)
# ============================================================
# SECURITY MIDDLEWARE
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
    ],
)


@app.middleware("http")
async def security_headers(request, call_next):

    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"

    response.headers[
        "Permissions-Policy"
    ] = "camera=(), microphone=(), geolocation=()"

    response.headers[
        "Cache-Control"
    ] = "no-store"

    return response



@app.on_event("startup")
async def startup():
    await init_db()
    init_medical_db()


app.include_router(
    health_router,
    prefix="/api",
)

app.include_router(
    auth_router,
    prefix="/api",
)

app.include_router(
    users_router,
    prefix="/api",
)

app.include_router(
    medical_router,
    prefix="/api",
)


@app.get("/")
async def root():
    return {
        "service": "dr-online-api",
        "status": "running",
        "version": "1.0.0",
    }


