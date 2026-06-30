"""Seed the database with reference data and test accounts."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal, Base
import app.models  # noqa: F401 — register ORM models
from app.models.reference import Department, Country
from app.models.user import User, UserRole
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ── Departments ────────────────────────────────────────────────────────────
depts_data = [
    ("Управление развития цифровых сервисов", "IT"),
    ("Финансовый департамент", "FIN"),
    ("Отдел правового обеспечения", "LEGAL"),
    ("Управление информационной безопасности", "SEC"),
    ("HR-департамент", "HR"),
    ("Департамент информационных технологий", "OPS"),
]
depts = {}
for name, code in depts_data:
    existing = db.query(Department).filter(Department.code == code).first()
    if not existing:
        d = Department(name=name, code=code)
        db.add(d)
        db.flush()
        depts[code] = d
    else:
        depts[code] = existing

# ── Countries ──────────────────────────────────────────────────────────────
countries_data = [
    ("Казахстан", "Қазақстан", "Kazakhstan", "KAZ", True),
    ("Россия", "Ресей", "Russia", "RUS", False),
    ("США", "АҚШ", "United States", "USA", False),
    ("Германия", "Германия", "Germany", "DEU", False),
    ("Китай", "Қытай", "China", "CHN", False),
    ("Великобритания", "Ұлыбритания", "United Kingdom", "GBR", False),
    ("Франция", "Франция", "France", "FRA", False),
    ("Турция", "Түркия", "Turkey", "TUR", False),
    ("ОАЭ", "БАЭ", "UAE", "ARE", False),
    ("Узбекистан", "Өзбекстан", "Uzbekistan", "UZB", False),
    ("Кыргызстан", "Қырғызстан", "Kyrgyzstan", "KGZ", False),
]
for name_ru, name_kk, name_en, code, is_default in countries_data:
    if not db.query(Country).filter(Country.code == code).first():
        db.add(Country(name_ru=name_ru, name_kk=name_kk, name_en=name_en, code=code, is_default=is_default))

db.flush()

# ── Test users ─────────────────────────────────────────────────────────────
users_data = [
    # (email, full_name, password, role, dept_code)
    ("admin@npck.kz", "Администратор Системы", "Admin@123!", UserRole.admin, None),
    ("employee1@npck.kz", "Айгерим Нурланова", "Employee@123!", UserRole.employee, "IT"),
    ("employee2@npck.kz", "Данияр Сейткали", "Employee@123!", UserRole.employee, "FIN"),
    ("guard1@npck.kz", "Ерлан Байжанов", "Guard@123!", UserRole.guard, "SEC"),
    ("guard2@npck.kz", "Марат Дюсенов", "Guard@123!", UserRole.guard, "SEC"),
]

for email, full_name, password, role, dept_code in users_data:
    if not db.query(User).filter(User.email == email).first():
        dept = depts.get(dept_code) if dept_code else None
        db.add(User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            role=role,
            department_id=dept.id if dept else None,
        ))

db.commit()
db.close()
print("[OK] Database seeded successfully")
print()
print("Test accounts (FOR DEVELOPMENT ONLY — do not use in production):")
print("  admin@npck.kz        / Admin@123!     [admin]")
print("  employee1@npck.kz    / Employee@123!  [employee — IT dept]")
print("  employee2@npck.kz    / Employee@123!  [employee — Finance]")
print("  guard1@npck.kz       / Guard@123!     [guard]")
print("  guard2@npck.kz       / Guard@123!     [guard]")
