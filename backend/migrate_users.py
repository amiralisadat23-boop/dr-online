import asyncio
import os
import sqlite3

from dotenv import load_dotenv
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing.")

SQLITE_DB = os.path.join(
    os.path.dirname(__file__),
    "dr_online.db",
)

async def main():

    print()
    print("========================================")
    print(" DR-ONLINE USER MIGRATION")
    print("========================================")

    from app.database import Base
    from app.models.user import User

    engine = create_async_engine(
        DATABASE_URL,
        pool_pre_ping=True,
    )

    SessionLocal = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    print("[1] Creating PostgreSQL tables...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("[OK] Tables ready")

    print("[2] Reading SQLite...")

    if not os.path.exists(SQLITE_DB):
        print("[ERROR] dr_online.db not found")
        await engine.dispose()
        return

    db = sqlite3.connect(SQLITE_DB)
    db.row_factory = sqlite3.Row

    try:
        rows = db.execute(
            """
            SELECT
                id,
                name,
                phone,
                password_hash,
                role
            FROM users
            ORDER BY id
            """
        ).fetchall()
    finally:
        db.close()

    print(f"[OK] SQLite users: {len(rows)}")

    print("[3] Migrating...")

    added = 0
    skipped = 0

    async with SessionLocal() as session:

        for row in rows:

            result = await session.execute(
                select(User).where(
                    User.phone == row["phone"]
                )
            )

            existing = result.scalar_one_or_none()

            if existing:
                skipped += 1
                print(f"[SKIP] {row['phone']}")
                continue

            user = User(
                name=row["name"],
                phone=row["phone"],
                password_hash=row["password_hash"],
                role=row["role"],
            )

            session.add(user)
            added += 1

            print(f"[ADD] {row['phone']}")

        await session.commit()

    print("[4] Verifying...")

    async with engine.connect() as conn:

        result = await conn.execute(
            text("SELECT COUNT(*) FROM users")
        )

        count = result.scalar_one()

    await engine.dispose()

    print()
    print("========================================")
    print(" MIGRATION DONE")
    print("========================================")
    print(f"PostgreSQL users: {count}")
    print(f"Added: {added}")
    print(f"Skipped: {skipped}")
    print("SQLite was NOT deleted.")
    print("========================================")
    print()

asyncio.run(main())
