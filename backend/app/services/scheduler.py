import logging
from datetime import date, datetime, timezone, timedelta
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.visit import Visit, VisitStatus

log = logging.getLogger(__name__)


def _get_db() -> Session:
    return SessionLocal()


def expire_visits():
    """Move past-date PENDING/APPROVED visits to EXPIRED."""
    db = _get_db()
    try:
        today = date.today()
        rows = db.query(Visit).filter(
            Visit.visit_date < today,
            Visit.status.in_([
                VisitStatus.PENDING_MODERATION,
                VisitStatus.PENDING_HOST,
                VisitStatus.CHANGES_REQUESTED,
                VisitStatus.APPROVED,
            ]),
        ).all()
        for v in rows:
            v.status = VisitStatus.EXPIRED
        if rows:
            db.commit()
            log.info("Expired %d visits", len(rows))
    finally:
        db.close()


def mark_no_shows():
    """Move approved-but-unused same-day visits to NO_SHOW (after 23:59)."""
    db = _get_db()
    try:
        yesterday = date.today() - timedelta(days=1)
        rows = db.query(Visit).filter(
            Visit.visit_date == yesterday,
            Visit.status == VisitStatus.APPROVED,
        ).all()
        for v in rows:
            v.status = VisitStatus.NO_SHOW
        if rows:
            db.commit()
            log.info("Marked %d no-shows", len(rows))
    finally:
        db.close()


def cleanup_documents():
    """Delete document files whose retention period has expired."""
    db = _get_db()
    try:
        now = datetime.now(timezone.utc)
        rows = db.query(Visit).filter(
            Visit.document_path.isnot(None),
            Visit.document_expires_at < now,
        ).all()
        for v in rows:
            path = Path(v.document_path)
            if path.exists():
                path.unlink(missing_ok=True)
                log.info("Deleted document %s", path)
            v.document_path = None
            v.document_original_name = None
            v.document_expires_at = None
        if rows:
            db.commit()
    finally:
        db.close()


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="Asia/Almaty")
    scheduler.add_job(expire_visits, "cron", hour=0, minute=5, id="expire_visits")
    scheduler.add_job(mark_no_shows, "cron", hour=0, minute=10, id="no_shows")
    scheduler.add_job(cleanup_documents, "cron", hour=1, minute=0, id="cleanup_docs")
    return scheduler
