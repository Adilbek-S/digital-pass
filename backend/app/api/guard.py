from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import require_guard
from app.core.security import hash_qr_token
from app.database import get_db
from app.models.user import User
from app.models.visit import AuditLog, CheckIn, Visit, VisitStatus
from app.schemas.visit import GuardScanResult

router = APIRouter(prefix="/guard", tags=["guard"])

_DENY_STATUSES = {
    VisitStatus.REJECTED,
    VisitStatus.CANCELLED,
    VisitStatus.EXPIRED,
    VisitStatus.NO_SHOW,
    VisitStatus.PENDING_MODERATION,
    VisitStatus.PENDING_HOST,
    VisitStatus.CHANGES_REQUESTED,
}


def _build_result(visit: Visit, colour: str, message: str) -> GuardScanResult:
    checkin = visit.check_ins[0] if visit.check_ins else None
    return GuardScanResult(
        visit_id=visit.id,
        visitor_name=visit.visitor_name,
        visitor_phone=visit.visitor_phone,
        visitor_org=visit.visitor_org,
        visit_date=visit.visit_date,
        visit_time=visit.visit_time,
        purpose=visit.purpose,
        status=visit.status,
        host_employee_name=visit.host_employee.full_name if visit.host_employee else None,
        host_phone=visit.host_employee.phone if visit.host_employee else None,
        department_name=visit.department.name if visit.department else None,
        colour=colour,
        message=message,
        already_entered=checkin is not None and checkin.entered_at is not None,
        entered_at=checkin.entered_at if checkin else None,
        exited_at=checkin.exited_at if checkin else None,
        visitor_link_token=visit.visitor_link_token,
    )


def _evaluate(visit: Visit) -> tuple[str, str]:
    """Return (colour, message) without modifying state."""
    today = date.today()
    if visit.status in _DENY_STATUSES:
        return "red", f"Доступ запрещён — статус: {visit.status.value}"
    if visit.visit_date != today:
        return "yellow", f"Дата визита: {visit.visit_date} (сегодня {today})"
    if visit.status == VisitStatus.CHECKED_OUT:
        return "red", "Посетитель уже покинул здание"
    if visit.status == VisitStatus.CHECKED_IN:
        return "yellow", "Посетитель уже внутри — нажмите «Отметить выход»"
    if visit.status == VisitStatus.APPROVED:
        return "green", "Доступ разрешён — нажмите «Отметить вход»"
    return "red", "Доступ запрещён"


@router.post("/scan", response_model=GuardScanResult)
def scan_qr(
    qr_token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_guard),
):
    token_hash = hash_qr_token(qr_token)
    visit = db.query(Visit).filter(Visit.qr_token_hash == token_hash).first()
    if not visit:
        visit = db.query(Visit).filter(Visit.visitor_link_token == qr_token).first()
    if not visit:
        raise HTTPException(status_code=404, detail="QR-код не распознан")
    colour, message = _evaluate(visit)
    return _build_result(visit, colour, message)


@router.post("/lookup/{visit_id}", response_model=GuardScanResult)
def manual_lookup(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_guard),
):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    colour, message = _evaluate(visit)
    return _build_result(visit, colour, message)


@router.post("/checkin/{visit_id}", response_model=GuardScanResult)
def checkin(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_guard),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).with_for_update().first()
    if not visit:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if visit.status != VisitStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Только одобренные заявки можно зарегистрировать на вход")
    existing = db.query(CheckIn).filter(CheckIn.visit_id == visit.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Вход уже зарегистрирован")
    new_checkin = CheckIn(visit_id=visit.id, guard_id=current_user.id, entered_at=datetime.now(timezone.utc))
    visit.status = VisitStatus.CHECKED_IN
    db.add(new_checkin)
    db.add(AuditLog(visit_id=visit.id, actor_id=current_user.id, action="CHECKED_IN"))
    db.commit()
    db.refresh(visit)
    return _build_result(visit, "green", "Вход зарегистрирован")


@router.post("/checkout/{visit_id}", response_model=GuardScanResult)
def checkout(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_guard),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).with_for_update().first()
    if not visit:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if visit.status != VisitStatus.CHECKED_IN:
        raise HTTPException(status_code=400, detail="Только заявки со статусом «внутри» можно зарегистрировать на выход")
    row = db.query(CheckIn).filter(CheckIn.visit_id == visit.id).with_for_update().first()
    if not row:
        raise HTTPException(status_code=400, detail="Запись о входе не найдена")
    row.exited_at = datetime.now(timezone.utc)
    visit.status = VisitStatus.CHECKED_OUT
    db.add(AuditLog(visit_id=visit.id, actor_id=current_user.id, action="CHECKED_OUT"))
    db.commit()
    db.refresh(visit)
    return _build_result(visit, "green", "Выход зарегистрирован")
