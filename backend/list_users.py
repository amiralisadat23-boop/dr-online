import asyncio

from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User


async def main():
    async with SessionLocal() as session:
        result = await session.execute(
            select(User.id, User.name, User.phone, User.role)
            .order_by(User.id)
        )

        users = result.all()

        print("=== USERS IN POSTGRESQL ===")

        if not users:
            print("[EMPTY] No users found")
            return

        for user in users:
            print(
                f"ID: {user.id} | "
                f"Name: {user.name} | "
                f"Phone: {user.phone} | "
                f"Role: {user.role}"
            )


asyncio.run(main())