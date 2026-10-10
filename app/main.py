from fastapi import FastAPI

app = FastAPI(
    title="Dr Online API",
    version="1.0.0",
)

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "dr-online-api"
    }
