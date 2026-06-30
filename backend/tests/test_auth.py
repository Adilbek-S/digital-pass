"""Basic auth API tests."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401 — register ORM models with Base
from app.database import Base, get_db
from app.main import app as fastapi_app
from app.models.user import User, UserRole
from app.core.security import hash_password

TEST_DB_URL = "sqlite:///./test_auth.db"


@pytest.fixture(scope="module")
def db_engine():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client(db_engine):
    Session = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db

    # Seed
    db = Session()
    if not db.query(User).filter(User.email == "testuser@example.com").first():
        db.add(User(
            email="testuser@example.com",
            full_name="Test User",
            password_hash=hash_password("TestPass@123"),
            role=UserRole.admin,
        ))
        db.commit()
    db.close()

    with TestClient(fastapi_app) as c:
        yield c

    del fastapi_app.dependency_overrides[get_db]


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_me_unauthenticated(client):
    # No cookie set yet — must be first auth test
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"email": "testuser@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_success(client):
    r = client.post("/api/auth/login", json={"email": "testuser@example.com", "password": "TestPass@123"})
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "testuser@example.com"
    assert data["role"] == "admin"


def test_me_authenticated(client):
    # Cookie was set by test_login_success above (module-scoped client)
    r2 = client.get("/api/auth/me")
    assert r2.status_code == 200
    assert r2.json()["email"] == "testuser@example.com"
