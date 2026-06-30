from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import require_staff
from app.database import get_db
from app.models.visit import Visit, VisitStatus

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/visitors-by-date")
def visitors_by_date(target_date: date, db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = db.query(Visit).filter(Visit.visit_date == target_date).all()
    return [
        {
            "id": v.id,
            "visitor_name": v.visitor_name,
            "visitor_org": v.visitor_org,
            "department_name": v.department.name if v.department else None,
            "host_employee_name": v.host_employee.full_name if v.host_employee else None,
            "status": v.status.value,
            "visit_time": v.visit_time,
        }
        for v in rows
    ]


@router.get("/inside-now")
def inside_now(db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = db.query(Visit).filter(Visit.status == VisitStatus.CHECKED_IN).all()
    return [
        {
            "id": v.id,
            "visitor_name": v.visitor_name,
            "visitor_org": v.visitor_org,
            "department_name": v.department.name if v.department else None,
            "host_employee_name": v.host_employee.full_name if v.host_employee else None,
            "entered_at": v.check_ins[0].entered_at if v.check_ins else None,
        }
        for v in rows
    ]


@router.get("/history")
def history(
    from_date: date | None = None,
    to_date: date | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    q = db.query(Visit)
    if from_date:
        q = q.filter(Visit.visit_date >= from_date)
    if to_date:
        q = q.filter(Visit.visit_date <= to_date)
    rows = q.order_by(Visit.visit_date.desc()).all()
    return [
        {
            "id": v.id,
            "visitor_name": v.visitor_name,
            "visit_date": v.visit_date,
            "status": v.status.value,
            "department_name": v.department.name if v.department else None,
            "entered_at": v.check_ins[0].entered_at if v.check_ins else None,
            "exited_at": v.check_ins[0].exited_at if v.check_ins else None,
        }
        for v in rows
    ]


@router.get("/approval-time")
def avg_approval_time(db: Session = Depends(get_db), _=Depends(require_staff)):
    approved = db.query(Visit).filter(Visit.status.in_([
        VisitStatus.APPROVED, VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT
    ])).all()
    if not approved:
        return {"avg_minutes": None, "count": 0}
    deltas = [(v.updated_at - v.created_at).total_seconds() / 60 for v in approved if v.updated_at and v.created_at]
    avg = sum(deltas) / len(deltas) if deltas else 0
    return {"avg_minutes": round(avg, 1), "count": len(deltas)}


@router.get("/rejected")
def rejected_visits(db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = db.query(Visit).filter(Visit.status == VisitStatus.REJECTED).order_by(Visit.updated_at.desc()).all()
    return [
        {
            "id": v.id,
            "visitor_name": v.visitor_name,
            "visit_date": v.visit_date,
            "rejection_reason": v.rejection_reason,
            "department_name": v.department.name if v.department else None,
        }
        for v in rows
    ]


@router.get("/no-shows")
def no_shows(db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = db.query(Visit).filter(Visit.status == VisitStatus.NO_SHOW).order_by(Visit.visit_date.desc()).all()
    return [
        {
            "id": v.id,
            "visitor_name": v.visitor_name,
            "visit_date": v.visit_date,
            "department_name": v.department.name if v.department else None,
        }
        for v in rows
    ]
