from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=list[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).order_by(User.id)
    )

    return list(result.scalars().all())
