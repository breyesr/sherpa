# Production Status

## 🚀 Deployed Services (Railway Staging)
The application is deployed on Railway as a Multi-service Project targeting the `staging` branch:

### 1. Backend API (`sherpa` service)
*   **Role**: FastAPI Backend Application
*   **Build Engine**: Nixpacks
*   **Health Check Endpoint**: `/health` (or `/` which redirects to `/health`)
*   **Start Command**: `./pre_deploy.sh && PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port $PORT`
*   **Status**: Active & Healthy

### 2. Asynchronous Processor (`worker` service)
*   **Role**: Celery Worker for background tasks (reminders, calendar synching, and B2B WhatsApp lead intake)
*   **Build Engine**: Nixpacks
*   **Start Command**: `celery -A app.core.celery_app worker --loglevel=warning`
*   **Status**: Active & Listening (requires `OPENAI_API_KEY` for GraphRAG operations)

### 3. Frontend Dashboard (`web` service)
*   **Role**: Next.js 14 App Router dashboard
*   **Build Engine**: Nixpacks
*   **Start Command**: `npm run start`
*   **Primary Domains**: 
    *   `https://web-staging-794a.up.railway.app`
    *   `https://web-staging-ee436.up.railway.app`
*   **Status**: Active (dependent on Backend API health)

---

## 📋 Recent Deployments

### [2026-08-13] Epic 213: Self-Registration Deprecation & Demo Request Flow
*   **Registration Endpoint**: `POST /auth/register` now returns `400 Bad Request` ("Registration disabled"). Public self-registration is temporarily gated.
*   **Demo Request Form**: New page at `/auth/request-demo` captures prospective client details (name, business, email, phone, use case).
*   **Database Migration**: `c77414e45eca` — Created `demo_requests` table with `status` column (pending/contacted/converted/rejected).
*   **Admin Dashboard**: New "Demo Requests" tab in `/admin` with color-coded status badges and inline status update dropdown via `PATCH /admin/demo-requests/{id}/status`.
*   **Branch**: `feature/epic-213-demo-flow` merged to `staging` → `main`.

---

## 🔒 Security & Verification Configs
*   **Twilio Webhook Verification**: Active via Twilio `X-Twilio-Signature` headers.
*   **CORS Configuration**: Allowed origins include local dev targets and Railway subdomains under `*.up.railway.app`.
