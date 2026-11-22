import uuid
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    BigInteger,
    Integer,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Gate(Base):
    __tablename__ = "gates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gate_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), default="IN", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AccessLog(Base):
    __tablename__ = "access_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    entry_year: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)     # เช่น "2568"
    study_year: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True) # เช่น "ปี 2"
    degree_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # เช่น "ปริญญาตรี (ภาคปกติ)"
    faculty: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True) # เช่น "คณะศิลปศาสตร์และวิทยาศาสตร์"
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)    # เช่น "สาขาวิชาวิทยาการคอมพิวเตอร์"
    access_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="RECORDED", nullable=False)
    card_uid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    gate_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)


class DailySummary(Base):
    __tablename__ = "daily_summaries"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    total_visits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_students: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    peak_hour: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    top_year_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)          # เช่น "ปี 2 (45 ครั้ง)"
    top_faculty: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)            # เช่น "คณะศิลปศาสตร์และวิทยาศาสตร์"
    year_level_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)   # {"ปี 1": 15, "ปี 2": 42, ...}
    faculty_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)      # {"คณะ...": 20, ...}
    hourly_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)       # {"09:00": 10, ...}
    synced_to_sheets: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

