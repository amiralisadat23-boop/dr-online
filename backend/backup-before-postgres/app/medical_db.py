import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).resolve().parent.parent / "medical_data.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_medical_db():
    connection = get_connection()

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS patient_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            national_id TEXT,
            age INTEGER,
            height_cm REAL,
            weight_kg REAL,
            gender TEXT,
            blood_type TEXT,
            caregiver_phone TEXT,
            conditions TEXT,
            allergies TEXT,
            smoker INTEGER DEFAULT 0
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            value REAL NOT NULL,
            value2 REAL,
            context TEXT,
            recorded_at TEXT NOT NULL
        )
        """
    )

    connection.commit()
    connection.close()


def get_profile(user_id: int):
    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM patient_profiles
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()

    connection.close()

    return dict(row) if row else None


def save_profile(
    user_id: int,
    national_id: Optional[str] = None,
    age: Optional[int] = None,
    height_cm: Optional[float] = None,
    weight_kg: Optional[float] = None,
    gender: Optional[str] = None,
    blood_type: Optional[str] = None,
    caregiver_phone: Optional[str] = None,
    conditions: Optional[str] = None,
    allergies: Optional[str] = None,
    smoker: bool = False,
):
    connection = get_connection()

    connection.execute(
        """
        INSERT INTO patient_profiles (
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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET
            national_id = excluded.national_id,
            age = excluded.age,
            height_cm = excluded.height_cm,
            weight_kg = excluded.weight_kg,
            gender = excluded.gender,
            blood_type = excluded.blood_type,
            caregiver_phone = excluded.caregiver_phone,
            conditions = excluded.conditions,
            allergies = excluded.allergies,
            smoker = excluded.smoker
        """,
        (
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
            int(smoker),
        ),
    )

    connection.commit()

    row = connection.execute(
        """
        SELECT *
        FROM patient_profiles
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()

    connection.close()

    return dict(row)


def add_vital(
    patient_user_id: int,
    vital_type: str,
    value: float,
    value2: Optional[float],
    context: Optional[str],
    recorded_at: str,
):
    connection = get_connection()

    cursor = connection.execute(
        """
        INSERT INTO vitals (
            patient_user_id,
            type,
            value,
            value2,
            context,
            recorded_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            patient_user_id,
            vital_type,
            value,
            value2,
            context,
            recorded_at,
        ),
    )

    connection.commit()

    row = connection.execute(
        """
        SELECT *
        FROM vitals
        WHERE id = ?
        """,
        (cursor.lastrowid,),
    ).fetchone()

    connection.close()

    return dict(row)


def get_vitals(patient_user_id: int):
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM vitals
        WHERE patient_user_id = ?
        ORDER BY recorded_at DESC
        """,
        (patient_user_id,),
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]
