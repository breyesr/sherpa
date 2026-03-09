# Sherpa – Tech Stack Final Decisions (One‑Pager)

## Backend
- Language: **Python 3.11**
- Framework: **FastAPI** (+ Uvicorn)
- ORM: **SQLAlchemy 2.x**
- Migrations: **Alembic**
- Background jobs: **Celery** (broker/store: Redis)
- Caching: **Redis 7**
- API style: **REST** with **OpenAPI 3.1** (Swagger/Redoc)
- Auth: **JWT (access+refresh)**; **OAuth2** for Google (Calendar) and Meta (WhatsApp)
- Input validation: **Pydantic v2**
- Rate limiting: **SlowAPI** (Redis backend)

## Frontend
- Framework: **Next.js 14 (App Router)**
- Language: **TypeScript 5.x**
- UI: **TailwindCSS** + **shadcn/ui**
- State: **Zustand**
- Forms/validation: **react-hook-form** + **zod**
- Charts: **recharts**
- i18n: **next-intl** (ES default)

## Data & Storage
- Primary DB: **PostgreSQL 15/16** (UTF-8, timezone UTC)
- Object storage: **AWS S3** (private buckets, presigned URLs)
- File CDN: **CloudFront** (phase 2, optional)

## Integrations
- Calendar: **Google Calendar API v3**
- Messaging: **WhatsApp Business (Meta Cloud API)**
- Payments: **Stripe** (Phase 2: **MercadoPago** optional)
- Email: **Postmark** (transactional)
- Error tracking: **Sentry**

## Infrastructure & DevOps
- Containers: **Docker**
- CI/CD: **GitHub Actions** (build, test, lint, scan, deploy)
- Hosting: **Vercel** (frontend), **Railway** (backend, Redis, Postgres) → migration path to AWS (ECS/RDS/ElastiCache) if needed
- Secrets: **GitHub Encrypted Secrets** (env-var driven)
- Observability: **Sentry** + health endpoints; logs to provider (Railway) initially
- Feature flags/config: **env-based** (simple) → phase 2 service if needed

## Security
- TLS: enforced (Vercel/Railway managed)
- Passwords: **bcrypt**
- Data at rest: DB-level encryption where available; S3 bucket encryption (SSE-S3)
- PII handling: field-level encryption for sensitive fields (via Fernet/AES) when stored
- Audit logs: DB table with append-only pattern

## Testing & Quality
- Unit tests: **pytest** (backend), **vitest/jest** (frontend)
- E2E: **Playwright** (web), **pytest + httpx** (API)
- Static analysis: **ruff** (Python), **eslint**/**typescript** (TS), **prettier**
- Commit hooks: **pre-commit** (lint/format/tests subset)

## AI/Assistant Layer
- Provider: **OpenAI API (Responses)**
- Models: **gpt-4.1 / gpt-4o-mini** (cost/perf tradeoff)
- Safety/guardrails: prompt + rules; manual escalation path

## Conventions
- Timezone: **UTC** in backend; user-facing via locale
- IDs: **ULIDs** (DB: text) or UUIDv7
- Pagination: **cursor-based**
- API versioning: path-based (`/v1`)

