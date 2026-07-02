from datetime import date, time, datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.models.visit import VisitStatus


class VisitPublicCreate(BaseModel):
    visitor_name: str
    visitor_phone: str
    visitor_email: EmailStr
    visitor_org: str | None = None
    country_id: int
    purpose: str
    visit_date: date
    visit_time: time | None = None
    department_id: int
    host_employee_id: int | None = None
    data_consent: bool

    @field_validator("data_consent")
    @classmethod
    def must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Data processing consent is required")
        return v


class VisitEmployeeCreate(BaseModel):
    visitor_name: str
    visitor_phone: str = ""
    visitor_email: str = ""
    visitor_org: str | None = None
    country_id: int
    purpose: str
    visit_date: date
    visit_time: time | None = None
    department_id: int
    host_employee_id: int | None = None


class VisitUpdate(BaseModel):
    visitor_name: str | None = None
    visitor_phone: str | None = None
    visitor_email: str | None = None
    visitor_org: str | None = None
    country_id: int | None = None
    purpose: str | None = None
    visit_date: date | None = None
    visit_time: time | None = None
    department_id: int | None = None
    host_employee_id: int | None = None
    data_consent: bool | None = None


class VisitStatusUpdate(BaseModel):
    status: VisitStatus
    reason: str | None = None


class VisitOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    visitor_name: str
    visitor_phone: str
    visitor_email: str
    visitor_org: str | None
    country_id: int
    purpose: str
    visit_date: date
    visit_time: time | None
    department_id: int
    host_employee_id: int | None
    status: VisitStatus
    rejection_reason: str | None
    changes_requested_note: str | None
    visitor_link_token: str
    document_original_name: str | None
    document_expires_at: datetime | None
    data_consent: bool
    created_at: datetime
    updated_at: datetime

    # Joined fields populated manually
    department_name: str | None = None
    host_employee_name: str | None = None
    country_name: str | None = None


class VisitPublicOut(BaseModel):
    """Info exposed to the visitor via their link token."""
    model_config = {"from_attributes": True}

    id: int
    visitor_name: str
    visitor_phone: str
    visitor_email: str
    visitor_org: str | None
    purpose: str
    country_id: int
    visit_date: date
    visit_time: time | None
    status: VisitStatus
    rejection_reason: str | None
    changes_requested_note: str | None
    data_consent: bool
    visitor_link_token: str | None = None
    department_name: str | None = None
    host_employee_name: str | None = None


class GuardScanResult(BaseModel):
    visit_id: int
    visitor_name: str
    visitor_phone: str | None
    visitor_org: str | None
    visit_date: date
    visit_time: time | None
    purpose: str | None
    status: VisitStatus
    host_employee_name: str | None
    host_phone: str | None
    department_name: str | None
    colour: str  # green / yellow / red
    message: str
    already_entered: bool
    entered_at: datetime | None
    exited_at: datetime | None
    visitor_link_token: str | None = None


class DepartmentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    code: str
    is_active: bool


class CountryOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name_ru: str
    name_kk: str
    name_en: str
    code: str
    is_default: bool
