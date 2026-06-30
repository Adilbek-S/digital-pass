from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: str
    department_id: int | None = None
