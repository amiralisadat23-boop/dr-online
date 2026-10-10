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
    "medical_data.db",
)


async def main():
    print()
    print("========================================")
    print(" DR-ONLINE MEDICAL DATA MIGRATION")
    print("========================================")

    from app.database import Base
    from app.models.medical import PatientProfile, Vital
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

    if not os.path.exists(SQLITE_DB):
        print("[ERROR] medical_data.db not found")
        await engine.dispose()
        return

    sqlite_db = sqlite3.connect(SQLITE_DB)
    sqlite_db.row_factory = sqlite3.Row

    try:
        profiles = sqlite_db.execute(
            """
            SELECT
                id,
                user_id,
                national_id,
                age,
                height_cm,
                weight_kg,
                gender,
                blood_type,
                caregiver_phone,
                conditions,
                allergies,
                smoker
            FROM patient_profiles
            ORDER BY id
            """
        ).fetchall()

        vitals = sqlite_db.execute(
            """
            SELECT
                id,
                patient_user_id,
                type,
                value,
                value2,
                context,
                recorded_at
            FROM vitals
            ORDER BY id
            """
        ).fetchall()

    finally:
        sqlite_db.close()

    print(f"[OK] SQLite profiles: {len(profiles)}")
    print(f"[OK] SQLite vitals: {len(vitals)}")

    print()
    print("[2] Migrating patient profiles...")

    profiles_added = 0
    profiles_skipped = 0

    async with SessionLocal() as session:

        for row in profiles:

            result = await session.execute(
                select(User).where(
                    User.id == row["user_id"]
                )
            )

            user = result.scalar_one_or_none()

            if not user:
                print(
                    "[SKIP PROFILE] SQLite user was not found "
                    "in PostgreSQL."
                )
                profiles_skipped += 1
                continue

            result = await session.execute(
                select(PatientProfile).where(
                    PatientProfile.user_id == user.id
                )
            )

            existing = result.scalar_one_or_none()

            if existing:
                profiles_skipped += 1
                continue

            profile = PatientProfile(
                user_id=user.id,
                national_id=row["national_id"],
                age=row["age"],
                height_cm=row["height_cm"],
                weight_kg=row["weight_kg"],
                gender=row["gender"],
                blood_type=row["blood_type"],
                caregiver_phone=row["caregiver_phone"],
                conditions=row["conditions"],
                allergies=row["allergies"],
                smoker=bool(row["smoker"]),
            )

            session.add(profile)
            profiles_added += 1

        await session.commit()

    print(f"[OK] Profiles added: {profiles_added}")

    print()
    print("[3] Migrating vitals...")

    vitals_added = 0
    vitals_skipped = 0

    async with SessionLocal() as session:

        for row in vitals:

            result = await session.execute(
                select(User).where(
                    User.id == row["patient_user_id"]
                )
            )

            user = result.scalar_one_or_none()

            if not user:
                print(
                    "[SKIP VITAL] PostgreSQL user was not found."
                )
                vitals_skipped += 1
                continue

            result = await session.execute(
                select(Vital).where(
                    Vital.id == row["id"]
                )
            )

            existing = result.scalar_one_or_none()

            if existing:
                vitals_skipped += 1
                continue

            vital = Vital(
                id=row["id"],
                patient_user_id=user.id,
                type=row["type"],
                value=row["value"],
                value2=row["value2"],
                context=row["context"],
                recorded_at=row["recorded_at"],
            )

            session.add(vital)
            vitals_added += 1

        await session.commit()

    print(f"[OK] Vitals added: {vitals_added}")

    print()
    print("[4] Verifying PostgreSQL...")

    async with engine.connect() as conn:

        result = await conn.execute(
            text("SELECT COUNT(*) FROM patient_profiles")
        )
        profile_count = result.scalar_one()

        result = await conn.execute(
            text("SELECT COUNT(*) FROM vitals")
        )
        vital_count = result.scalar_one()

    await engine.dispose()

    print()
    print("========================================")
    print(" MEDICAL MIGRATION DONE")
    print("========================================")
    print(f"PostgreSQL profiles: {profile_count}")
    print(f"PostgreSQL vitals: {vital_count}")
    print(f"Profiles added: {profiles_added}")
    print(f"Profiles skipped: {profiles_skipped}")
    print(f"Vitals added: {vitals_added}")
    print(f"Vitals skipped: {vitals_skipped}")
    print()
    print("SQLite medical_data.db was NOT deleted.")
    print("========================================")


asyncio.run(main())