# Sherpa – Technical Development Document

## 1. System Overview

Sherpa is a SaaS platform designed for service-based businesses to automate client communication, appointment scheduling, and reminders through an AI assistant integrated with WhatsApp, Telegram, and Google Calendar.

The system is multi-tenant, ensuring strict data isolation between businesses.

---

## 2. Architecture

- **Backend:** FastAPI (Python 3.11)
- **Frontend:** Next.js 14 (React)
- **Database:** PostgreSQL 16
- **Cache / Queue:** Redis 7 + Celery
- **Infrastructure:** Docker, GitHub Actions CI/CD
- **Hosting:** Railway (Production + Staging)
- **Security:** HTTPS, JWT, Fernet Encryption (AES)

---

## 3. Core Modules

### 3.1 Onboarding Wizard
- Step-by-step configuration (Business info, Assistant, Calendar, Messaging)
- Optional flow: Step 1 mandatory, others skippable via "Skip for now"
- Banner notification for incomplete setup

### 3.2 AI Conversations
- Multi-turn persistent memory (Redis-based)
- Automated lead capture (registering anonymous users)
- Tone and greeting customization

### 3.3 CRM
- Client list with auto-registration from messaging platforms
- Unique identifiers for Telegram and WhatsApp
- Linking appointments to client records

### 3.4 Calendar & Appointments
- Google Calendar OAuth2 integration
- Free/Busy availability check via one-way sync
- Appointment CRUD (Manual + AI-automated)

### 3.5 Assistant Configuration
- AI setup (name, tone, rules)
- Working hours (JSON-based)
- Knowledge base integration (FAQS)

### 3.6 Integrations
- **Google Calendar:** OAuth2, availability check, event creation
- **Telegram:** Bot API, unique webhook IDs, token encryption
- **WhatsApp:** Meta Cloud API (in progress)

---

## 4. API Design

- RESTful API with OpenAPI 3.1
- Core Routes:
  - `/auth` – login, register
  - `/admin` – system settings, user management
  - `/business` – profile, assistant setup
  - `/clients` – CRM CRUD
  - `/appointments` – booking logic
  - `/integrations` – OAuth callbacks and status
  - `/telegram` – Webhook and linking
  - `/whatsapp` – Webhook and setup

---

## 5. Authentication & Roles

- **JWT:** Access + Refresh pattern
- **Roles:**
  - `super_admin`: Full system access + system settings
  - `admin`: Business owner with full profile access
  - `member`: Staff with restricted CRM/Calendar access

---

## 6. Database Schema (Highlights)

- **User:** Auth data + role
- **BusinessProfile:** Core tenant entity
- **AssistantConfig:** AI behavior
- **Client:** CRM record with `telegram_id` and `whatsapp_id`
- **Appointment:** Linked to client and business
- **SystemConfiguration:** Encrypted global secrets

---

## 7. Security & Stability

- **CORS:** Controlled via regex for Railway subdomains
- **Database:** `expire_on_commit=False` for async compatibility
- **Encryption:** All external API keys encrypted at rest
- **Logging:** Detailed Tracebacks for OAuth and Webhooks

---

## 8. Deployment Strategy

- **Staging:** Isolated environment for feature branch testing
- **Production:** `main` branch auto-deploy
- **Config-as-Code:** `railway.json` defines infrastructure logic
