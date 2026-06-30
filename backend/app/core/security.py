import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt
import bcrypt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(subject: str | int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(subject), "role": role, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def generate_qr_token() -> tuple[str, str]:
    """Return (raw_token, sha256_hash). Store only the hash."""
    raw = secrets.token_hex(32)  # 256 bits
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return raw, digest


def hash_qr_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_visitor_link_token() -> str:
    """Opaque token for the visitor's personal status link."""
    return secrets.token_urlsafe(32)


def generate_signed_file_token(file_path: str, expires_in: int = 300) -> str:
    """Short-lived token for temporary file download links."""
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    return jwt.encode(
        {"file": file_path, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_signed_file_token(token: str) -> str:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload["file"]
