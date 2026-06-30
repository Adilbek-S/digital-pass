from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.reference import Department, Country
from app.models.user import User
from app.schemas.visit import DepartmentOut, CountryOut

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/departments", response_model=list[DepartmentOut])
def departments(db: Session = Depends(get_db)):
    return db.query(Department).filter(Department.is_active.is_(True)).all()


@router.get("/countries", response_model=list[CountryOut])
def countries(db: Session = Depends(get_db)):
    return db.query(Country).order_by(Country.is_default.desc(), Country.name_ru).all()


@router.get("/employees")
def employees(department_id: int | None = None, db: Session = Depends(get_db)):
    from app.models.user import UserRole
    q = db.query(User).filter(User.role == UserRole.employee, User.is_active.is_(True))
    if department_id:
        q = q.filter(User.department_id == department_id)
    return [{"id": u.id, "full_name": u.full_name, "department_id": u.department_id} for u in q.all()]
