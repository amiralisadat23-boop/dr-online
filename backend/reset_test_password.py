import asyncio
from getpass import getpass
from sqlalchemy import select
from app.database import SessionLocal
from app.models.user import User
from app.security.password import hash_password

async def main():
    password = getpass("Enter NEW test password (8+ characters): ")
    confirm = getpass("Confirm new password: ")

    if len(password) < 8:
        print("ERROR: Password must contain at least 8 characters.")
        return

    if password != confirm:
        print("ERROR: Passwords do not match.")
        return

    async with SessionLocal() as db:
        result = await db.execute(
            select(User).where(User.phone == "09120000000")
        )
        user = result.scalar_one_or_none()

        if user is None:
            print("ACCOUNT_NOT_FOUND")
            return

        user.password_hash = hash_password(password)
        await db.commit()
        print("PASSWORD_UPDATED")

asyncio.run(main())
