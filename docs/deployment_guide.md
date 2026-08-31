# Sherpa Deployment Guide (Railway)

## Architecture Overview
Sherpa operates as a **Multi-service Project** on Railway. All services point to the same monorepo repository but target different directories, buildpacks, and execution commands.

```mermaid
graph TD
    User([Browser / Mobile Rep]) --> Web[Frontend Dashboard: web]
    WhatsApp([WhatsApp Cloud API / Webhook]) --> API[Backend API: sherpa]
    Web --> API
    API --> PG[(PostgreSQL + pgvector)]
    API --> Redis[(Redis Broker & Cache)]
    API -.->|apply_async| Worker[Async Processor: worker]
    Worker --> PG
    Worker --> Redis
    Worker --> OpenAI[LLM / OpenAI / Gemini]
    Worker --> Meta[Meta Graph API v22.0]
```

---

## 🛠 Railway Services Mapping

### 1. Service: `Backend API` (`sherpa`)
- **Role**: FastAPI Application & Inbound Webhooks
- **Root Directory**: `/backend`
- **Builder**: `Nixpacks` (configured via `backend/nixpacks.toml`)
- **Start Command**: `./pre_deploy.sh && PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/health` (or `/` which redirects)
- **RAM Allocation**: 512MB

### 2. Service: `Asynchronous Processor` (`worker`)
- **Role**: Celery Worker for background tasks (B2B chat ingestion, Store Actions extraction, GraphRAG embeddings, reminders)
- **Root Directory**: `/backend`
- **Builder**: `Nixpacks` (configured via `backend/nixpacks.toml`)
- **Start Command**: `celery -A app.core.celery_app worker --loglevel=warning --concurrency=1 --max-tasks-per-child=50 --prefetch-multiplier=1`
- **RAM Allocation**: 512MB
- **Critical Guardrail**: Must use `NullPool` in SQLAlchemy database engine to prevent idle memory bloat.

### 3. Service: `Frontend Dashboard` (`web`)
- **Role**: Next.js 14 App Router (Tailwind + React Query + Zustand)
- **Root Directory**: `/frontend`
- **Builder**: `Nixpacks`
- **Start Command**: `npm run start`
- **RAM Allocation**: 1024MB
- **Domains**: Primary custom domain `app.xerpaa.com` (redirects `xerpaa.com` $\rightarrow$ `app.xerpaa.com`).

---

## 🔑 Key Environment Variables

### Backend & Worker
| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://user:pass@host:port/db` |
| `REDIS_URL` | Redis instance URL for Celery & caching | `redis://default:pass@host:port` |
| `SECRET_KEY` | JWT signing secret | **CRITICAL**: No fallback. Must crash if missing. |
| `ENCRYPTION_KEY` | Fernet key for encrypting provider tokens in DB | 32-byte url-safe base64 key |
| `BACKEND_CORS_ORIGINS`| JSON array of allowed frontend origins | `["https://app.xerpaa.com", "http://localhost:3000"]` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings & B2B ingestion | `sk-...` |
| `GOOGLE_API_KEY` | Gemini Flash API key for extraction & entity linking | `AIzaSy...` |
| `META_APP_ID` | Meta Developer App ID | Required for WhatsApp Cloud API |
| `META_APP_SECRET` | Meta Developer App Secret | Required for HMAC webhook verification |
| `META_CONFIG_ID` | Meta Embedded Signup Configuration ID | From Meta WhatsApp Onboarding setup |
| `META_SYSTEM_USER_TOKEN` | Meta Permanent System User Access Token | Used for tech provider calls |
| `META_WEBHOOK_VERIFY_TOKEN`| Verification token for Meta Webhook setup | Matching token entered in Meta portal |
| `META_GRAPH_API_VERSION` | Version of Meta Graph API | Default: `v22.0` |

### Frontend
| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public URL of Backend API | `https://sherpa-production-xxxx.up.railway.app` |
| `NEXT_PUBLIC_META_APP_ID` | Meta App ID for Facebook JavaScript SDK | Same as `META_APP_ID` |
| `NEXT_PUBLIC_META_CONFIG_ID`| Meta Embedded Signup Config ID | Same as `META_CONFIG_ID` |

---

## ⚠️ Critical Deployment & RAM Guardrails
1. **Nixpacks Only**: DO NOT change the builder to Docker on Railway. `Dockerfile` and `docker-compose.yml` are strictly for **Local Development**.
2. **Worker Memory Recycling**: Procfile and start commands must enforce `--max-tasks-per-child=50` (or 100) and `--concurrency=1` to prevent Celery memory leaks.
3. **Database Migration Safety**: Migrations must be run via `./pre_deploy.sh` or approved explicitly. Never run manual ad-hoc SQL modifications on production without backup.
4. **Staging Merge Gate**: Always verify staging health before fast-forward merging into `main`.

