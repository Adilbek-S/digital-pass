import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import require_employee, require_staff
from app.core.security import generate_qr_token, generate_visitor_link_token, generate_signed_file_token
from app.database import get_db
from app.models.user import User
from app.models.visit import AuditLog, Visit, VisitStatus
from app.schemas.visit import (
    VisitEmployeeCreate,
    VisitOut,
    VisitPublicCreate,
    VisitPublicOut,
    VisitUpdate,
)

router = APIRouter(prefix="/visits", tags=["visits"])


def _enrich(visit: Visit) -> VisitOut:
    out = VisitOut.model_validate(visit)
    if visit.department:
        out.department_name = visit.department.name
    if visit.host_employee:
        out.host_employee_name = visit.host_employee.full_name
    if visit.country:
        out.country_name = visit.country.name_ru
    return out


def _log(db: Session, visit_id: int, actor_id: int | None, action: str, details: str | None = None):
    db.add(AuditLog(visit_id=visit_id, actor_id=actor_id, action=action, details=details))


# ── Public: create visit (visitor self-service) ────────────────────────────
@router.post("/public", response_model=VisitPublicOut, status_code=status.HTTP_201_CREATED)
async def create_public_visit(body: VisitPublicCreate, db: Session = Depends(get_db)):
    visitor_token = generate_visitor_link_token()
    visit = Visit(
        **body.model_dump(exclude={"data_consent"}),
        data_consent=body.data_consent,
        status=VisitStatus.PENDING_MODERATION,
        visitor_link_token=visitor_token,
    )
    db.add(visit)
    db.flush()
    _log(db, visit.id, None, "CREATED_PUBLIC")
    db.commit()
    db.refresh(visit)
    out = VisitPublicOut.model_validate(visit)
    out.visitor_link_token = visitor_token
    if visit.department:
        out.department_name = visit.department.name
    if visit.host_employee:
        out.host_employee_name = visit.host_employee.full_name
    return out


# ── Employee: create invite ────────────────────────────────────────────────
@router.post("/invite", response_model=VisitOut, status_code=status.HTTP_201_CREATED)
def create_invite(
    body: VisitEmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employee),
):
    visitor_token = generate_visitor_link_token()
    visit = Visit(
        **body.model_dump(),
        data_consent=False,  # visitor must confirm when opening link
        status=VisitStatus.PENDING_HOST,
        visitor_link_token=visitor_token,
        created_by_id=current_user.id,
    )
    db.add(visit)
    db.flush()
    _log(db, visit.id, current_user.id, "CREATED_INVITE")
    db.commit()
    db.refresh(visit)
    return _enrich(visit)


# ── Visitor: view status by link token ────────────────────────────────────
@router.get("/status/{link_token}", response_model=VisitPublicOut)
def visitor_status(link_token: str, db: Session = Depends(get_db)):
    visit = db.query(Visit).filter(Visit.visitor_link_token == link_token).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    out = VisitPublicOut.model_validate(visit)
    out.visitor_link_token = visit.visitor_link_token
    if visit.department:
        out.department_name = visit.department.name
    if visit.host_employee:
        out.host_employee_name = visit.host_employee.full_name
    return out


# ── Visitor: cancel own visit ──────────────────────────────────────────────
@router.post("/status/{link_token}/cancel")
def visitor_cancel(link_token: str, db: Session = Depends(get_db)):
    visit = db.query(Visit).filter(Visit.visitor_link_token == link_token).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.status not in (VisitStatus.PENDING_MODERATION, VisitStatus.PENDING_HOST, VisitStatus.APPROVED):
        raise HTTPException(status_code=400, detail="Cannot cancel visit in current status")
    visit.status = VisitStatus.CANCELLED
    _log(db, visit.id, None, "CANCELLED_BY_VISITOR")
    db.commit()
    return {"ok": True}


# ── Employee: list own pending visits ──────────────────────────────────────
@router.get("/my-pending", response_model=list[VisitOut])
def my_pending(db: Session = Depends(get_db), current_user: User = Depends(require_employee)):
    from app.models.user import UserRole
    q = db.query(Visit).filter(
        Visit.status.in_([VisitStatus.PENDING_HOST, VisitStatus.PENDING_MODERATION])
    )
    if current_user.role != UserRole.admin:
        q = q.filter(Visit.host_employee_id == current_user.id)
    return [_enrich(v) for v in q.order_by(Visit.created_at.desc()).all()]


@router.get("/my-today", response_model=list[VisitOut])
def my_today(db: Session = Depends(get_db), current_user: User = Depends(require_employee)):
    from datetime import date
    today = date.today()
    visits = (
        db.query(Visit)
        .filter(
            Visit.host_employee_id == current_user.id,
            Visit.visit_date == today,
            Visit.status.in_([VisitStatus.APPROVED, VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT]),
        )
        .all()
    )
    return [_enrich(v) for v in visits]


# ── Employee/Moderator: list all visits ───────────────────────────────────
@router.get("", response_model=list[VisitOut])
def list_visits(
    status_filter: str | None = None,
    date_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    from app.models.user import UserRole
    q = db.query(Visit)
    if current_user.role == UserRole.employee:
        q = q.filter(Visit.host_employee_id == current_user.id)
    if status_filter:
        q = q.filter(Visit.status == status_filter)
    if date_filter:
        from datetime import date
        q = q.filter(Visit.visit_date == date.fromisoformat(date_filter))
    return [_enrich(v) for v in q.order_by(Visit.created_at.desc()).all()]


@router.get("/{visit_id}", response_model=VisitOut)
def get_visit(visit_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_staff)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return _enrich(visit)


# ── Employee: approve ──────────────────────────────────────────────────────
@router.post("/{visit_id}/approve")
def approve(visit_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_employee)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Not found")
    if visit.status not in (VisitStatus.PENDING_HOST, VisitStatus.PENDING_MODERATION):
        raise HTTPException(status_code=400, detail="Visit cannot be approved in current status")

    # Generate QR token when approving
    raw_token, token_hash = generate_qr_token()
    visit.status = VisitStatus.APPROVED
    visit.qr_token_hash = token_hash
    _log(db, visit.id, current_user.id, "APPROVED")
    db.commit()
    return {"ok": True, "qr_token": raw_token}


# ── Employee: reject ───────────────────────────────────────────────────────
@router.post("/{visit_id}/reject")
def reject(visit_id: int, reason: str, db: Session = Depends(get_db), current_user: User = Depends(require_employee)):
    if not reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Not found")
    visit.status = VisitStatus.REJECTED
    visit.rejection_reason = reason
    visit.qr_token_hash = None
    _log(db, visit.id, current_user.id, "REJECTED", reason)
    db.commit()
    return {"ok": True}


# ── Employee: revoke approved visit ───────────────────────────────────────
@router.post("/{visit_id}/revoke")
def revoke(visit_id: int, reason: str, db: Session = Depends(get_db), current_user: User = Depends(require_employee)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Not found")
    if visit.status != VisitStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved visits can be revoked")
    visit.status = VisitStatus.REJECTED
    visit.rejection_reason = reason
    visit.qr_token_hash = None
    _log(db, visit.id, current_user.id, "REVOKED", reason)
    db.commit()
    return {"ok": True}


# ── Employee: request changes ──────────────────────────────────────────────
@router.post("/{visit_id}/request-changes")
def request_changes(visit_id: int, note: str, db: Session = Depends(get_db), current_user: User = Depends(require_employee)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Not found")
    visit.status = VisitStatus.CHANGES_REQUESTED
    visit.changes_requested_note = note
    _log(db, visit.id, current_user.id, "CHANGES_REQUESTED", note)
    db.commit()
    return {"ok": True}


# ── Visitor: update after invite or changes requested ────────────────────────
@router.patch("/status/{link_token}/update", response_model=VisitPublicOut)
def visitor_update(link_token: str, body: VisitUpdate, db: Session = Depends(get_db)):
    visit = db.query(Visit).filter(Visit.visitor_link_token == link_token).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Not found")
    is_invite_confirm = visit.status == VisitStatus.PENDING_HOST and not visit.data_consent
    is_changes = visit.status == VisitStatus.CHANGES_REQUESTED
    if not is_invite_confirm and not is_changes:
        raise HTTPException(status_code=400, detail="Edits not allowed in current status")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(visit, field, value)
    if is_changes:
        visit.status = VisitStatus.PENDING_HOST
        visit.changes_requested_note = None
    _log(db, visit.id, None, "UPDATED_BY_VISITOR")
    db.commit()
    db.refresh(visit)
    out = VisitPublicOut.model_validate(visit)
    out.visitor_link_token = visit.visitor_link_token
    if visit.department:
        out.department_name = visit.department.name
    if visit.host_employee:
        out.host_employee_name = visit.host_employee.full_name
    return out


# ── File upload ────────────────────────────────────────────────────────────
@router.post("/public/{link_token}/upload")
async def upload_document(link_token: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    visit = db.query(Visit).filter(Visit.visitor_link_token == link_token).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    # MIME check
    if file.content_type not in settings.allowed_mime_list:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")

    # Size check
    contents = await file.read()
    if len(contents) > settings.max_file_bytes:
        raise HTTPException(status_code=400, detail="File too large")

    # Path-traversal safe filename
    ext = Path(file.filename or "doc").suffix.lstrip(".")[:10]
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    dest = Path(settings.UPLOAD_DIR) / safe_name
    dest.parent.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(dest, "wb") as f:
        await f.write(contents)

    # Remove old file if replacing
    if visit.document_path:
        old = Path(visit.document_path)
        if old.exists():
            old.unlink(missing_ok=True)

    visit.document_path = str(dest)
    visit.document_original_name = file.filename
    visit.document_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.FILE_RETENTION_DAYS)
    db.commit()
    return {"ok": True}


# ── Temp file link ─────────────────────────────────────────────────────────
@router.get("/{visit_id}/document-link")
def document_link(visit_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    visit = db.get(Visit, visit_id)
    if not visit or not visit.document_path:
        raise HTTPException(status_code=404, detail="No document attached")
    token = generate_signed_file_token(visit.document_path)
    return {"url": f"/api/files/download?token={token}"}
