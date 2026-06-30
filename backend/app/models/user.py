from __future__ import annotations
import enum
from sqlalchemy import String, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    employee = "employee"
    guard = "guard"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    department: Mapped[Department | None] = relationship("Department", back_populates="employees")  # noqa: F821
    hosted_visits: Mapped[list[Visit]] = relationship("Visit", foreign_keys="Visit.host_employee_id", back_populates="host_employee")  # noqa: F821
    created_visits: Mapped[list[Visit]] = relationship("Visit", foreign_keys="Visit.created_by_id", back_populates="created_by")  # noqa: F821
    check_ins: Mapped[list[CheckIn]] = relationship("CheckIn", back_populates="guard")  # noqa: F821
    audit_logs: Mapped[list[AuditLog]] = relationship("AuditLog", back_populates="actor")  # noqa: F821
