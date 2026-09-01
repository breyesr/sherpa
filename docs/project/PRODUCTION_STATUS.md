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

### [2026-08-31] Epics 219, 220, 221: Extensible Product Catalog & Catalog Intelligence Engine
*   **Extensible Product Attributes (Epic 219)**: Added `custom_fields` (`JSON`) on `Product` and `catalog_config` (`JSON`) on `BusinessProfile`. Realigned the product drawer UX to match the B2C Service "Additional Information" pattern (`+ Add Attribute` inline creation for `text`, `number`, `boolean`, `date`, `dropdown`, `textarea`, `multiselect`), with a dedicated `ManageCatalogAttributesDrawer` modal and product detail specs card.
*   **AI Pricing Disclosure Control & Hard Non-Negotiation (Epic 220)**: Added `allow_price_disclosure` (`Boolean`) to `Agent` and exposed a universal toggle in **Settings → AI Assistant**. Enforced an unbreakable non-negotiation guardrail in system prompts (factual prices only, zero haggling or discount debates).
*   **Intelligent Catalog Context (Epic 221)**: Created `CatalogContextBuilder` with token-efficient Markdown formatting, relevance pruning for large catalogs (>15 SKUs), and explicit directives for product Q&A, side-by-side comparison, and needs-based recommendations integrated into `ProspectQualifier` and `AIService`.
*   **Technical Data Sheets Design**: Documented future PDF/DOCX ingestion and pgvector chunking architecture in `docs/architecture/product_data_sheets_design.md`.
*   **Branch**: Merged to `staging` → `main` (`438182a`).

### [2026-08-29] Epic 220: Zero-Friction Embedded Signup Auto-Fill
*   **Backend Auto-Prefill**: `GET /whatsapp/config` now extracts `business_name` and `category` from the authenticated user's `BusinessProfile` and returns a `prefill` dictionary.
*   **Frontend SDK Integration**: `WhatsAppModal.tsx` passes `setup.business` (`name`, `website: "https://xerpaa.com"`) and `setup.phone` (`displayName`, `category`) directly into `FB.login()` extras, eliminating manual data entry in Meta's popup.
*   **Meta App Review Status**: `public_profile` granted Advanced Access; Meta Developer App in Live Mode.
*   **Branch**: `feature/epic-220-embedded-signup-prefill` merged to `staging` → `main`.

### [2026-08-24] WhatsApp Coexistence & Meta Tech Provider Onboarding
*   **Coexistence Mode**: Passed `extras: { featureType: 'coexistence' }` to `FB.login` in `WhatsAppModal.tsx` so personal WhatsApp Business mobile app users do not lose their chats.
*   **Webhook Echo Filtering**: Added sender vs. registered business number verification in `whatsapp.py` to suppress infinite AI loops when merchants reply manually from their phones.
*   **Meta Deregistration on Disconnect**: `provisioner.py` & `integrations.py` trigger `POST /{phone_number_id}/deregister` to safely detach numbers upon disconnection.
*   **Branch**: `feature/integrations/whatsapp-coexistence` merged to `staging` → `main`.

### [2026-08-13] Epic 213: Self-Registration Deprecation & Demo Request Flow
*   **Registration Gating**: `POST /auth/register` returns `400 Bad Request` ("Registration disabled"). Self-registration gated for B2B control.
*   **Demo Request Intake**: Page at `/auth/request-demo` captures inbound leads (name, business, email, phone, use case).
*   **Database Model**: Created `demo_requests` table with status workflow (`pending`, `contacted`, `converted`, `rejected`).
*   **Admin Dashboard**: Dedicated Demo Requests tab in `/admin` with status management via `PATCH /admin/demo-requests/{id}/status`.
*   **Branch**: `feature/epic-213-demo-flow` merged to `staging` → `main`.

### [2026-08-05 - 2026-08-08] Meta WhatsApp Cloud API Core Migration (Epics 206, 207, 208)
*   **Core Engine**: Fully asynchronous `MetaCloudEngine` in `meta_cloud_engine.py` targeting Meta Graph API `v22.0`.
*   **Webhook Security**: HMAC-SHA256 request signature verification (`X-Hub-Signature-256`) middleware using `META_APP_SECRET`.
*   **24-Hour Compliance Gating**: Outbound messages validate the 24h compliance window via `Conversation.extra_data["whatsapp_24h_window_start"]`, with automated template message fallback.
*   **Async Dispatch**: Webhooks validate signatures and delegate processing immediately to Celery queues via `apply_async()`.
*   **Root Domain Redirection**: 301 redirect configured from `xerpaa.com` to `app.xerpaa.com`.

---

## 🔒 Security & Verification Configs
*   **Meta Webhook Security**: HMAC-SHA256 signature verification active via `X-Hub-Signature-256` header on `POST /webhook`.
*   **Twilio Webhook Verification**: Active via Twilio `X-Twilio-Signature` headers (legacy fallback).
*   **CORS Configuration**: Explicit allowed origins configured in `BACKEND_CORS_ORIGINS` (no wildcards).
*   **Database Isolation & RAM Guardrails**: Celery uses `NullPool`; API server pool capped at `pool_size=5, max_overflow=10`.

