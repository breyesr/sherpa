# Sherpa – Tech Stack Final Decisions (One‑Pager)

## Backend
- Language: **Python 3.11**
- Framework: **FastAPI** (+ Uvicorn)
- ORM: **SQLAlchemy 2.x**
- Migrations: **Alembic**
- Background jobs: **Celery** (broker/store: Redis)
- Caching: **Redis 7** (also used for **Conversation Memory**)
- API style: **REST** with **OpenAPI 3.1**
- Auth: **JWT (access+refresh)**
- External Auth: **OAuth2** for Google Calendar
- Input validation: **Pydantic v2**

## Frontend
- Framework: **Next.js 14 (App Router)**
- Language: **TypeScript 5.x**
- UI: **TailwindCSS** + **shadcn/ui** (custom lucide icons)
- State: **Zustand**
- Forms/validation: **Native Fetch** + **Zod**

## Data & Storage
- Primary DB: **PostgreSQL 16** (UTF-8, timezone UTC)
- IDs: **UUIDv7** (time-sortable, secure)
- Encryption: **Fernet (AES)** for sensitive settings at rest

## Integrations
- Calendar: **Google Calendar API v3**
- Messaging: **WhatsApp Business (Meta Cloud API)**, **Telegram Bot API**
- AI Models: **OpenAI (GPT-4 Turbo)**, **Google Gemini**, **Anthropic Claude**
- Payments: **Stripe** (Test Mode)

## Infrastructure & DevOps
- Hosting: **Railway** (Universal deployment: API, Worker, Web, Postgres, Redis)
- CI/CD: **GitHub Actions** (CI pipeline)
- Environments: **Production** and **Staging** (Isolated resources)
- Secrets: **Railway Environment Variables** (Encrypted)
- Networking: **CORS** managed via regex for Railway subdomains

## Security
- TLS: enforced (Railway managed)
- Passwords: **bcrypt**
- Data at rest: Field-level encryption for API keys and tokens
- Multi-tenancy: Strict isolation by `business_id` and unique `webhook_id`

## Testing & Quality
- Branching strategy: `main` (production), `feature/*` branches
- QA: Dedicated **Staging** environment mirroring production config

## Conventions
- Timezone: **UTC** internal; local presentation
- API versioning: `/api/v1`
