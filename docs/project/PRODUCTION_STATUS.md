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

## 🔒 Security & Verification Configs
*   **Twilio Webhook Verification**: Active via Twilio `X-Twilio-Signature` headers.
*   **CORS Configuration**: Allowed origins include local dev targets and Railway subdomains under `*.up.railway.app`.
