# Sherpa – Technical Development Document

## 1. System Overview

Sherpa is a SaaS platform designed for service-based businesses to automate client communication, appointment scheduling, and reminders through an AI assistant integrated with WhatsApp, Telegram, and Google Calendar.

The system is multi-tenant, ensuring strict data isolation between businesses.

---

## 2. Architecture

- **Backend:** FastAPI (Python 3.11)
- **Frontend:** Next.js 14 (App Router, Full React Server Components migration)
- **AI Core:** LiteLLM (Universal provider support: OpenAI, Gemini, Claude)
- **Prompt Engine:** Jinja2 (Dynamic, multi-layered template construction)
- **Database:** PostgreSQL 16 (Alembic migrations, optimized B-Tree indexing)
- **Cache / Queue:** Redis 7 + Celery (Separate processes for API, Worker, and Beat)
- **Infrastructure:** Railway (Production + Staging), Docker, GitHub Actions CI/CD
- **Security:** JWT (Cookie-based for RSC), Server-Side Auth Gating (Middleware), Fernet AES Encryption, SlowAPI Rate Limiting

---

## 3. Core Modules

### 3.1 Onboarding Wizard
- Step-by-step configuration (Business info, Timezone, Assistant, Calendar, Messaging)
- Optional flow: Step 1 mandatory, others skippable via "Skip for now"

### 3.2 AI Core (Universal Assistant)
- **Multi-Provider:** Powered by LiteLLM to support GPT-4o, Claude 3, and Gemini 1.5.
- **Dynamic Prompting:** Jinja2 templates assemble instructions based on business config, timezone, and current state.
- **Identity Gating:** Explicit flow ensuring Name, Email, and Phone are collected from user messages before allowing bookings.
- **Memory:** Redis-based persistent session memory (20-message window).

### 3.3 CRM & Lead Capture
- **Explicit Registration:** Clients are created as "Unknown" until identity data is explicitly provided in chat.
- **Hashed Identifiers:** Privacy-preserving blind indexes (SHA-256) for Telegram and WhatsApp IDs.
- **Verification:** AI confirms existing data for returning users before proceeding.

### 3.4 Calendar & Appointments
- **Timezone Support:** Full support for business-specific timezones. AI and Dashboard respect local time.
- **Google Calendar:** Fully asynchronous `httpx` integration for non-blocking I/O.
- **True Rescheduling:** Intelligent logic to `UPDATE` existing appointments instead of creating duplicates.
- **Deduplication:** Aggressive dashboard filtering using Event IDs and Time overlaps.

### 3.5 Assistant Configuration
- **Behavioral Toggles:** Modular controls for "Require Reason", "Confirm Details", and "Strict Guardrails".
- **Live Test Sandbox:** Real-time chat preview in the dashboard to test AI behavior with unsaved settings.

---

## 4. API Design

- RESTful API with OpenAPI 3.1
- **Rate Limiting:** IP-based protection on all public and sensitive endpoints.
- Core Routes:
  - `/auth` – login, register, me (session)
  - `/admin` – system settings, user management
  - `/business` – profile, assistant, test-chat
  - `/crm` – clients, appointments
  - `/integrations` – Google OAuth, availability sync
  - `/telegram` / `/whatsapp` – Webhooks with instant status signals (Typing/Read)

---

## 5. Security & Stability

- **CI/CD Hardening:** Automated Ruff linting, Pytest unit tests, and TypeScript type-checking on every push.
- **Server-Side Auth:** Middleware-based gating ensures zero-flicker protected routes and improved security.
- **Process Separation:** Independent services for Web API, Celery Worker, and Celery Beat to prevent cascading failures.
- **Safe Migrations:** Standalone `pre_deploy.sh` script to handle DB updates without race conditions.
- **Encryption:** All third-party credentials (LLM Keys, OAuth Tokens) are encrypted at rest.

---

## 6. Deployment Strategy

- **Staging:** Isolated environment for feature branch testing.
- **Production:** `main` branch auto-deploy via Railway.
- **Self-Healing:** Automatic execution of `production_client_repair.py` on every deployment to fix data inconsistencies.
