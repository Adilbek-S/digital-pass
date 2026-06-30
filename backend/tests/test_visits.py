"""Visit creation and status tests."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.database import Base, get_db
from app.main import app as fastapi_app
from app.models.user import User, UserRole
from app.models.reference import Department, Country
from app.core.security import hash_password

TEST_DB_URL = "sqlite:///./test_visits.db"


@pytest.fixture(scope="module")
def db_engine():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client(db_engine):
    Session = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = override_db

    db = Session()
    if not db.query(Country).filter(Country.code == "KAZ").first():
        db.add(Country(name_ru="Казахстан", name_kk="Қазақстан", name_en="Kazakhstan", code="KAZ", is_default=True))
        db.commit()
    if not db.query(Department).filter(Department.code == "IT").first():
        db.add(Department(name="IT Dept", code="IT"))
        db.commit()
    if not db.query(User).filter(User.email == "emp@example.com").first():
        dept = db.query(Department).filter(Department.code == "IT").first()
        db.add(User(email="emp@example.com", full_name="Employee", password_hash=hash_password("P@ssw0rd1"), role=UserRole.employee, department_id=dept.id))
        db.commit()
    db.close()

    with TestClient(fastapi_app) as c:
        yield c

    del fastapi_app.dependency_overrides[get_db]


def test_reference_departments(client):
    r = client.get("/api/reference/departments")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_reference_countries(client):
    r = client.get("/api/reference/countries")
    assert r.status_code == 200
    kz = next((c for c in r.json() if c["code"] == "KAZ"), None)
    assert kz is not None
    assert kz["is_default"] is True


def test_create_public_visit(client, db_engine):
    Session = sessionmaker(bind=db_engine)
    db = Session()
    country = db.query(Country).first()
    dept = db.query(Department).first()
    db.close()

    payload = {
        "visitor_name": "Тест Посетитель",
        "visitor_phone": "+7 777 000 0000",
        "visitor_email": "visitor@example.com",
        "country_id": country.id,
        "purpose": "Деловая встреча",
        "visit_date": "2026-12-01",
        "department_id": dept.id,
        "data_consent": True,
    }
    r = client.post("/api/visits/public", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["visitor_name"] == "Тест Посетитель"
    assert data["status"] == "PENDING_MODERATION"


def test_visitor_status(client, db_engine):
    Session = sessionmaker(bind=db_engine)
    db = Session()
    country = db.query(Country).first()
    dept = db.query(Department).first()
    db.close()

    payload = {
        "visitor_name": "Status Test",
        "visitor_phone": "+7 777 111 1111",
        "visitor_email": "status@example.com",
        "country_id": country.id,
        "purpose": "Test",
        "visit_date": "2026-12-02",
        "department_id": dept.id,
        "data_consent": True,
    }
    create_r = client.post("/api/visits/public", json=payload)
    assert create_r.status_code == 201

    from app.models.visit import Visit
    db2 = Session()
    v = db2.query(Visit).filter(Visit.visitor_email == "status@example.com").first()
    token = v.visitor_link_token
    db2.close()

    r = client.get(f"/api/visits/status/{token}")
    assert r.status_code == 200
    assert r.json()["status"] == "PENDING_MODERATION"


def test_qr_token_entropy():
    from app.core.security import generate_qr_token
    raw, digest = generate_qr_token()
    assert len(raw) == 64  # 32 bytes hex = 64 chars = 256 bits
    assert len(digest) == 64  # sha256 hex
    assert raw != digest
