from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.core.security import hash_password
from app.database import get_db
from app.models.user import User
from app.models.reference import Department
from app.schemas.user import UserCreate, UserUpdate, UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Users ──────────────────────────────────────────────────────────────────
@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    users = db.query(User).all()
    return [UserOut.from_orm_with_dept(u) for u in users]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=body.email,
        full_name=body.full_name,
        password_hash=hash_password(body.password),
        role=body.role,
        department_id=body.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.from_orm_with_dept(user)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if field == "password":
            user.password_hash = hash_password(value)
        else:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserOut.from_orm_with_dept(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()


# ── Departments ────────────────────────────────────────────────────────────
@router.get("/departments")
def list_departments(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(Department).all()


@router.post("/departments", status_code=status.HTTP_201_CREATED)
def create_department(name: str, code: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    dept = Department(name=name, code=code)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.patch("/departments/{dept_id}")
def update_department(dept_id: int, name: str | None = None, code: str | None = None,
                      is_active: bool | None = None, db: Session = Depends(get_db), _=Depends(require_admin)):
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if name is not None:
        dept.name = name
    if code is not None:
        dept.code = code
    if is_active is not None:
        dept.is_active = is_active
    db.commit()
    db.refresh(dept)
    return dept
