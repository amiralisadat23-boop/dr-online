import asyncio

from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User


async def main():
    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(
                User.phone == "09356220758"
            )
        )

        user = result.scalar_one_or_none()

        if user is None:
            print("[NOT FOUND] User does not exist")
        else:
            print("[FOUND]")
            print("ID:", user.id)
            print("Name:", user.name)
            print("Role:", user.role)
            print("Password hash exists:", bool(user.password_hash))


asyncio.run(main())