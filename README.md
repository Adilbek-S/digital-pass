# Digital Pass — Visit Management System

Electronic visitor pass system for the National Payment Corporation of Kazakhstan (НПК).

## Features

- **Public visitor form** — self-service application with file upload and consent
- **Employee dashboard** — approve / reject / request-changes / revoke visits
- **Guard interface** — camera QR scanner and manual ID lookup with color-coded access result
- **Admin panel** — user and department management
- **Reports** — 6 report types (daily visitors, currently inside, history, approval time, rejected, no-shows)
- **i18n** — Russian (default), Kazakh, English
- **Security** — JWT HttpOnly cookies, CSRF-safe SameSite=Strict, rate limiting, signed file links, 256-bit QR entropy

## Architecture

```
digital-pass/
├── backend/     FastAPI 0.115.5 + SQLAlchemy 2.0 + SQLite (WAL)
└── frontend/    Next.js 15.3.3 + TypeScript + Tailwind v4 + next-intl v4
```

## Quick Start

### Backend

```bash
cd backend

# Create virtual environment (requires Python 3.13)
py -3.13 -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Linux/macOS

pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and set a strong SECRET_KEY

# Seed database with test data
python seed.py

# Start server
uvicorn app.main:app --reload
```

API available at **http://localhost:8000** — interactive docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at **http://localhost:3000**.

## Test Accounts

> **These accounts are for development only. Change all passwords before any deployment.**

| Role     | Email                    | Password      | Access                          |
|----------|--------------------------|---------------|---------------------------------|
| Admin    | admin@npck.test          | Admin@123!    | Full system access              |
| Employee | employee1@npck.test      | Employee@123! | IT department (host/moderator)  |
| Employee | employee2@npck.test      | Employee@123! | Finance department              |
| Guard    | guard1@npck.test         | Guard@123!    | QR scanner, manual lookup       |
| Guard    | guard2@npck.test         | Guard@123!    | QR scanner, manual lookup       |

Login at **http://localhost:3000/ru/auth/login**.

## Development Commands

### Backend

```bash
# Run tests
pytest tests/ -v

# Lint
ruff check app/ --select E,F,W --ignore E501
ruff format app/

# Start with auto-reload
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build

# Start production build
npm start
```

## Visit Status Flow

```
Visitor self-service → PENDING_MODERATION → (moderator) → PENDING_HOST
Employee invite      → PENDING_HOST

PENDING_HOST → APPROVED (QR generated) → CHECKED_IN → CHECKED_OUT
             → REJECTED
             → CHANGES_REQUESTED → (visitor edits) → PENDING_HOST

Background jobs (00:05/00:10/01:00 Asia/Almaty):
  PENDING/APPROVED past date → EXPIRED
  APPROVED yesterday         → NO_SHOW
  Documents past retention   → deleted from disk
```

## Security Notes

- QR tokens use `secrets.token_hex(32)` (256-bit entropy); only the SHA-256 hash is stored in the database
- Raw QR token is returned to visitor once at creation/approval — never stored in plaintext
- Document files are served via signed JWT links with short expiry, never directly
- File uploads are validated for MIME type, size (10 MB max), and path traversal
- All authenticated endpoints use `HttpOnly; SameSite=Strict` JWT cookies

## Environment Variables

| Variable                  | Default                                   | Description                          |
|---------------------------|-------------------------------------------|--------------------------------------|
| `SECRET_KEY`              | *(required)*                              | JWT signing key (min 32 chars)       |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480`                                 | Token lifetime (8 hours)             |
| `DATABASE_URL`            | `sqlite:///./digital_pass.db`             | SQLAlchemy database URL              |
| `UPLOAD_DIR`              | `uploads`                                 | Directory for uploaded documents     |
| `FILE_RETENTION_DAYS`     | `1`                                       | Days to keep uploaded files          |
| `ALLOWED_MIME_TYPES`      | `application/pdf,image/jpeg,image/png`    | Allowed upload MIME types            |
| `MAX_FILE_SIZE_MB`        | `10`                                      | Upload size limit in megabytes       |
