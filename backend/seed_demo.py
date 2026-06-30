"""Generate demo visit data for reports showcase. Idempotent — skips if 5+ visits exist."""
import sys, os, uuid, hashlib
from datetime import date, time, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal, Base
import app.models  # noqa: F401
from app.models.visit import Visit, VisitStatus, CheckIn
from app.models.reference import Department, Country
from app.models.user import User

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(Visit).count() >= 5:
    print("[SKIP] Demo data already present")
    db.close()
    sys.exit(0)

# ── Resolve reference data ──────────────────────────────────────────────────
kaz = db.query(Country).filter_by(code="KAZ").first()
rus = db.query(Country).filter_by(code="RUS").first()
uzb = db.query(Country).filter_by(code="UZB").first()
kgz = db.query(Country).filter_by(code="KGZ").first()
countries = [kaz, kaz, kaz, kaz, kaz, kaz, kaz, rus, uzb, kgz]  # mostly KAZ

depts = {d.code: d for d in db.query(Department).all()}
emp1 = db.query(User).filter_by(email="employee1@npck.kz").first()  # IT
emp2 = db.query(User).filter_by(email="employee2@npck.kz").first()  # FIN
guard = db.query(User).filter_by(email="guard1@npck.kz").first()

dept_emp = {
    "IT":    emp1,
    "OPS":   emp1,
    "FIN":   emp2,
    "LEGAL": emp2,
    "HR":    emp2,
    "SEC":   emp1,
}

today = date.today()
now = datetime.now(timezone.utc)


def d(offset_days: int) -> date:
    return today + timedelta(days=offset_days)


def dt(offset_days: int, hour: int = 10, minute: int = 0) -> datetime:
    return datetime(today.year, today.month, today.day, hour, minute,
                    tzinfo=timezone.utc) + timedelta(days=offset_days)


def tok() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex[:32]


def htok(t: str) -> str:
    return hashlib.sha256(t.encode()).hexdigest()


# (visitor_name, phone, email, org, country_idx)
VISITORS = [
    ("Айгерим Сейтқали",     "+7 701 234 5678", "aigerim.s@mail.kz",   "ТОО «Алматы-Сервис»",     0),
    ("Данияр Беков",         "+7 702 345 6789", "daniyar.b@gmail.com",  "АО «КазМунайГаз»",        0),
    ("Лаура Нурланова",      "+7 705 456 7890", "laura.n@npck.kz",      None,                       0),
    ("Руслан Иванов",        "+7 777 567 8901", "ruslan.i@corp.ru",     "ООО «ТехноГрупп»",        7),
    ("Асель Жаксыбекова",    "+7 708 678 9012", "asel.j@kazpost.kz",   "Казпочта",                 0),
    ("Тимур Алиев",          "+7 701 789 0123", "timur.a@mail.kz",      "ТОО «Астана-IT»",         0),
    ("Мадина Серікова",      "+7 702 890 1234", "madina.s@gmail.com",   None,                       0),
    ("Азамат Қасымов",       "+7 705 901 2345", "azamat.k@eov.kz",     "ДГП «ЦОН»",               0),
    ("Гульнара Бекова",      "+7 707 012 3456", "gulnara.b@kaztele.kz","КазТелеком",               0),
    ("Нурлан Есенов",        "+7 700 123 4567", "nurlan.e@mail.kz",     "ТОО «Нефтехим»",          0),
    ("Жанна Оразова",        "+7 701 234 5670", "zhanna.o@finreg.kz",  "НБ РК",                    0),
    ("Алмас Дюсенов",        "+7 702 345 6780", "almas.d@gmail.com",    None,                       0),
    ("Фарида Хасанова",      "+7 771 456 7891", "farida.h@uzb.uz",     "Uzcard",                   8),
    ("Бекзод Рашидов",       "+7 775 567 8902", "bekzod.r@humo.uz",    "HUMO",                     8),
    ("Канат Сейтжанов",      "+7 707 678 9013", "kanat.s@samruk.kz",   "Самрук-Қазына",            0),
    ("Эльмира Тлеубаева",    "+7 708 789 0124", "elmira.t@gmail.com",   "ТОО «Медиа-Групп»",       0),
    ("Жандос Мусаев",        "+7 701 890 1235", "zhandos.m@kz.kz",     None,                       0),
    ("Динара Кенжебаева",    "+7 702 901 2346", "dinara.k@ektu.kz",    "ВКТУ",                     0),
    ("Ерлан Сагынтаев",      "+7 776 012 3457", "erlan.s@mail.kz",     "МФО «Береке»",             0),
    ("Наталья Петрова",      "+7 705 123 4568", "natasha.p@corp.ru",   "ПАО «Сбербанк»",           7),
    ("Улан Темиров",         "+996 700 234 567","ulan.t@mail.kg",      "ОАО «Банк Азии»",          9),
    ("Меруерт Садвакас",     "+7 701 345 6789", "meruert.s@gmail.com",  None,                       0),
    ("Дархан Оспанов",       "+7 702 456 7890", "darkhan.o@halyk.kz",  "Халык Банк",               0),
    ("Айнур Мағауова",       "+7 705 567 8901", "ainur.m@kz.kz",       "ТОО «Digital KZ»",        0),
    ("Ринат Хайдаров",       "+7 707 678 9012", "rinat.kh@mail.kz",    "ТОО «АйТи Лэб»",          0),
    ("Сауле Бержанова",      "+7 708 789 0123", "saule.b@nbk.kz",      "НБ РК",                    0),
    ("Михаил Соколов",       "+7 771 890 1234", "mikhail.s@corp.ru",   "ВТБ Казахстан",            7),
    ("Айбек Нурмаганбетов",  "+7 702 901 2345", "aibek.n@minfin.kz",  "Минфин РК",                0),
    ("Зарина Аскарова",      "+7 705 012 3456", "zarina.a@gmail.com",   None,                       0),
    ("Болат Жаксыбеков",     "+7 700 123 4560", "bolat.zh@kaztrans.kz","КазТрансОйл",              0),
    ("Ксения Ли",            "+7 701 234 5671", "ksenia.li@gmail.com",  "ТОО «Транзит-А»",         0),
    ("Серік Оразалин",       "+7 702 345 6781", "serik.o@samruk.kz",   "Самрук-Энерго",            0),
    ("Акерке Дуйсенова",     "+7 705 456 7892", "akerke.d@halyk.kz",   "Halyk Finance",            0),
    ("Тлеген Қалиев",        "+7 707 567 8903", "tlegen.k@mail.kz",    None,                       0),
    ("Виктор Пак",           "+7 708 678 9014", "viktor.p@corp.kz",    "ТОО «СистемаТех»",        0),
]

PURPOSES = [
    "Деловые переговоры по вопросам партнёрства",
    "Подписание договора о сотрудничестве",
    "Техническая консультация по интеграции СМЭП",
    "Аудит информационной безопасности",
    "Встреча по проекту цифрового теңге",
    "Обсуждение условий договора",
    "Демонстрация программного обеспечения",
    "Согласование технического задания",
    "Плановая проверка документации",
    "Консультация по правовым вопросам",
    "Встреча с руководством по стратегическому развитию",
    "Подача документов на аккредитацию",
    "Согласование регламента обмена данными",
    "Обучение сотрудников работе с МСПД",
    "Проверка соответствия требованиям НБ РК",
]

DEPT_CODES = ["IT", "FIN", "LEGAL", "SEC", "HR", "OPS"]

REJECTION_REASONS = [
    "Цель визита не соответствует деятельности подразделения",
    "Принимающий сотрудник в отпуске на указанную дату",
    "Недостаточно информации для согласования",
]

CHANGES_NOTES = [
    "Уточните цель визита",
    "Укажите организацию",
]

# ── Visit definitions ──────────────────────────────────────────────────────
# (visitor_idx, dept_code, visit_date_offset, visit_time, status, created_offset, extra)
VISITS = [
    # CHECKED_OUT — прошлые, полностью завершённые
    (0,  "IT",    -45, time(10, 0),  VisitStatus.CHECKED_OUT, -46, {"entered": dt(-45,10,5),  "exited": dt(-45,11,30)}),
    (1,  "FIN",   -40, time(14, 0),  VisitStatus.CHECKED_OUT, -41, {"entered": dt(-40,14,10), "exited": dt(-40,15,45)}),
    (4,  "LEGAL", -35, time(9, 30),  VisitStatus.CHECKED_OUT, -36, {"entered": dt(-35,9,35),  "exited": dt(-35,10,50)}),
    (6,  "IT",    -30, time(11, 0),  VisitStatus.CHECKED_OUT, -31, {"entered": dt(-30,11,5),  "exited": dt(-30,12,20)}),
    (9,  "OPS",   -25, time(10, 30), VisitStatus.CHECKED_OUT, -26, {"entered": dt(-25,10,35), "exited": dt(-25,12,0)}),
    (11, "SEC",   -20, time(15, 0),  VisitStatus.CHECKED_OUT, -21, {"entered": dt(-20,15,8),  "exited": dt(-20,16,30)}),
    (14, "HR",    -15, time(9, 0),   VisitStatus.CHECKED_OUT, -16, {"entered": dt(-15,9,10),  "exited": dt(-15,10,40)}),
    (17, "FIN",   -10, time(13, 0),  VisitStatus.CHECKED_OUT, -11, {"entered": dt(-10,13,5),  "exited": dt(-10,14,15)}),
    (22, "IT",    -7,  time(10, 0),  VisitStatus.CHECKED_OUT, -8,  {"entered": dt(-7,10,8),   "exited": dt(-7,11,45)}),

    # CHECKED_IN — сегодня зашли, ещё не вышли
    (2,  "IT",    0,   time(9, 0),   VisitStatus.CHECKED_IN,  -1,  {"entered": dt(0,9,5)}),
    (7,  "LEGAL", 0,   time(11, 0),  VisitStatus.CHECKED_IN,  -1,  {"entered": dt(0,11,3)}),
    (24, "OPS",   0,   time(14, 0),  VisitStatus.CHECKED_IN,  -1,  {"entered": dt(0,14,8)}),

    # APPROVED — будущие и несколько прошлых
    (3,  "FIN",   3,   time(10, 0),  VisitStatus.APPROVED,    -3,  {}),
    (5,  "IT",    5,   time(15, 0),  VisitStatus.APPROVED,    -2,  {}),
    (8,  "HR",    7,   time(9, 30),  VisitStatus.APPROVED,    -4,  {}),
    (10, "SEC",   10,  time(11, 0),  VisitStatus.APPROVED,    -5,  {}),
    (20, "LEGAL", 14,  time(14, 0),  VisitStatus.APPROVED,    -3,  {}),

    # NO_SHOW — пришло время, не явились
    (12, "IT",    -22, time(10, 0),  VisitStatus.NO_SHOW,     -23, {}),
    (15, "FIN",   -18, time(14, 0),  VisitStatus.NO_SHOW,     -19, {}),
    (18, "OPS",   -12, time(9, 0),   VisitStatus.NO_SHOW,     -13, {}),
    (27, "HR",    -8,  time(11, 0),  VisitStatus.NO_SHOW,     -9,  {}),

    # EXPIRED — заявка просрочена
    (13, "LEGAL", -55, time(10, 0),  VisitStatus.EXPIRED,     -57, {}),
    (19, "SEC",   -50, time(14, 0),  VisitStatus.EXPIRED,     -52, {}),
    (30, "FIN",   -38, time(9, 0),   VisitStatus.EXPIRED,     -40, {}),

    # REJECTED — отклонены
    (16, "IT",    -28, time(10, 0),  VisitStatus.REJECTED,    -30, {"reason": 0}),
    (21, "SEC",   -24, time(14, 0),  VisitStatus.REJECTED,    -26, {"reason": 1}),
    (28, "LEGAL", -17, time(9, 30),  VisitStatus.REJECTED,    -19, {"reason": 2}),
    (33, "HR",    -13, time(11, 0),  VisitStatus.REJECTED,    -15, {"reason": 0}),

    # CANCELLED — отменены посетителем
    (23, "FIN",   -9,  time(10, 0),  VisitStatus.CANCELLED,   -11, {}),
    (26, "IT",    -6,  time(14, 0),  VisitStatus.CANCELLED,   -8,  {}),
    (31, "OPS",   -4,  time(9, 0),   VisitStatus.CANCELLED,   -6,  {}),

    # PENDING_MODERATION — новые заявки
    (25, "IT",    4,   time(10, 0),  VisitStatus.PENDING_MODERATION, -1, {}),
    (29, "FIN",   6,   time(14, 0),  VisitStatus.PENDING_MODERATION, -1, {}),
    (34, "LEGAL", 8,   time(9, 0),   VisitStatus.PENDING_MODERATION, 0,  {}),

    # PENDING_HOST — на рассмотрении у принимающего
    (32, "SEC",   5,   time(11, 0),  VisitStatus.PENDING_HOST, -2, {}),
    (35 % len(VISITORS), "HR", 9, time(14, 0), VisitStatus.PENDING_HOST, -1, {}),
]

purpose_idx = 0
for i, row in enumerate(VISITS):
    v_idx, dept_code, date_offset, vtime, status, created_offset, extra = row

    visitor = VISITORS[v_idx]
    dept = depts.get(dept_code)
    if not dept:
        continue
    emp = dept_emp.get(dept_code)
    country = countries[visitor[4]]
    if not country:
        country = kaz

    purpose = PURPOSES[purpose_idx % len(PURPOSES)]
    purpose_idx += 1

    link_token = tok()
    qr_tok = tok() if status in (VisitStatus.APPROVED, VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT) else None

    visit = Visit(
        visitor_name=visitor[0],
        visitor_phone=visitor[1],
        visitor_email=visitor[2],
        visitor_org=visitor[3],
        country_id=country.id,
        purpose=purpose,
        visit_date=d(date_offset),
        visit_time=vtime,
        department_id=dept.id,
        host_employee_id=emp.id if emp else None,
        status=status,
        data_consent=True,
        visitor_link_token=link_token,
        qr_token_hash=htok(qr_tok) if qr_tok else None,
        rejection_reason=REJECTION_REASONS[extra["reason"]] if "reason" in extra else None,
    )

    # Override created_at via explicit attribute after flush
    db.add(visit)
    db.flush()

    # Set timestamps via SQL update for realistic history
    created_ts = dt(created_offset, 8 + (i % 4) * 2, (i * 13) % 60)
    db.execute(
        __import__("sqlalchemy").text(
            "UPDATE visits SET created_at = :ts, updated_at = :ts WHERE id = :id"
        ),
        {"ts": created_ts.isoformat(), "id": visit.id},
    )

    # CheckIn records for CHECKED_IN / CHECKED_OUT
    if "entered" in extra:
        ci = CheckIn(
            visit_id=visit.id,
            guard_id=guard.id if guard else None,
            entered_at=extra["entered"],
            exited_at=extra.get("exited"),
        )
        db.add(ci)

db.commit()
db.close()
print(f"[OK] Demo data seeded: {len(VISITS)} visits")
