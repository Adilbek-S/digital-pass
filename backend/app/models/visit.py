from __future__ import annotations
import enum
from datetime import datetime, date, time
from sqlalchemy import (
    String, Text, Boolean, ForeignKey, Date, Time,
    Enum as SAEnum, DateTime, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class VisitStatus(str, enum.Enum):
    PENDING_MODERATION = "PENDING_MODERATION"
    PENDING_HOST = "PENDING_HOST"
    CHANGES_REQUESTED = "CHANGES_REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    NO_SHOW = "NO_SHOW"
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Visitor personal data
    visitor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    visitor_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    visitor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    visitor_org: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id"), nullable=False)

    # Visit details
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    visit_date: Mapped[date] = mapped_column(Date, nullable=False)
    visit_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
    host_employee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Status
    status: Mapped[VisitStatus] = mapped_column(
        SAEnum(VisitStatus), nullable=False, default=VisitStatus.PENDING_MODERATION
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changes_requested_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # QR / access tokens — never store raw token, only its SHA-256 hash
    qr_token_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    visitor_link_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    # File attachment
    document_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    document_original_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Consent
    data_consent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Audit
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships — forward refs to avoid circular imports; noqa: F821 intentional
    country: Mapped[Country] = relationship("Country")  # noqa: F821
    department: Mapped[Department] = relationship("Department", back_populates="visits")  # noqa: F821
    host_employee: Mapped[User | None] = relationship("User", foreign_keys=[host_employee_id], back_populates="hosted_visits")  # noqa: F821
    created_by: Mapped[User | None] = relationship("User", foreign_keys=[created_by_id], back_populates="created_visits")  # noqa: F821
    check_ins: Mapped[list[CheckIn]] = relationship("CheckIn", back_populates="visit", cascade="all, delete-orphan")
    audit_logs: Mapped[list[AuditLog]] = relationship("AuditLog", back_populates="visit", cascade="all, delete-orphan")


class CheckIn(Base):
    __tablename__ = "check_ins"

    id: Mapped[int] = mapped_column(primary_key=True)
    visit_id: Mapped[int] = mapped_column(ForeignKey("visits.id"), nullable=False)
    guard_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    entered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    exited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    visit: Mapped[Visit] = relationship("Visit", back_populates="check_ins")
    guard: Mapped[User | None] = relationship("User", back_populates="check_ins")  # noqa: F821


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    visit_id: Mapped[int | None] = mapped_column(ForeignKey("visits.id"), nullable=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    visit: Mapped[Visit | None] = relationship("Visit", back_populates="audit_logs")
    actor: Mapped[User | None] = relationship("User", back_populates="audit_logs")  # noqa: F821
