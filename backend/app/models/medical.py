from sqlalchemy import String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True,
    )

    national_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    age: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    height_cm: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    weight_kg: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    gender: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    blood_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    caregiver_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    conditions: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )

    allergies: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )

    smoker: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )


class Vital(Base):
    __tablename__ = "vitals"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    patient_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    value2: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    context: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    recorded_at: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
