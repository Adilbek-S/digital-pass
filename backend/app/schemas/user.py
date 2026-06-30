from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole
    department_id: int | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    role: UserRole | None = None
    department_id: int | None = None
    is_active: bool | None = None
    password: str | None = None


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: str
    full_name: str
    role: UserRole
    department_id: int | None
    is_active: bool
    department_name: str | None = None

    @classmethod
    def from_orm_with_dept(cls, user):
        obj = cls.model_validate(user)
        if user.department:
            obj.department_name = user.department.name
        return obj
