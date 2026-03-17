# Sherpa – MVP Scope Document

## 🎯 Objective
Deliver a **minimum viable product** that automates appointment scheduling and reminders via **WhatsApp and Telegram**, synchronizes with **Google Calendar**, and provides a simple **web dashboard** for businesses to manage clients and bookings.

Goal: Validate product-market fit and prove user value with minimal engineering overhead.

---

## ✅ Core Features (Included in MVP)

### 1. Authentication & Account
- User registration and login (JWT-based)
- Role-based access control (`super_admin`, `admin`, `member`)
- Business profile setup (name, category, contact info)

### 2. Guided Onboarding (Simplified Wizard)
- Step 1: Business information (Mandatory)
- Step 2: Assistant configuration (name, tone) - Skippable
- Step 3: Connect Google Calendar (OAuth) - Skippable
- Step 4: Connect Messaging (WhatsApp/Telegram) - Skippable
- Step 5: Activate 30-day trial subscription

### 3. Assistant Configuration
- Assistant name and greeting
- Business category field
- Working hours (basic schedule)
- Welcome message (predefined)
- Persistent conversation memory (Redis-based)

### 4. Calendar / Appointments
- Appointment CRUD (create, read, update, delete)
- One-way Google Calendar sync (read-only availability + write booking)
- Manual appointment creation via dashboard

### 5. Messaging Integration (Multi-tenant)
- **Telegram Bot API:** Secure token storage, unique webhooks, auto-registration.
- **WhatsApp (Meta Cloud API):** Webhook-driven, async message processing.
- Automated Lead Capture: ID-based client registration upon first message.

### 6. Reminders
- Automatic reminder 24h before appointment
- Confirmation prompt (Yes/No)

### 7. CRM (Basic)
- Client list (name, phone, messaging IDs, email)
- Search by name
- Auto-create/Update client record during AI conversation

### 8. Subscription / Billing (Trial Only)
- Free 30-day trial plan
- Stripe test mode integration
- Manual upgrade flow

### 9. Dashboard (Basic KPIs)
- Total clients
- Total appointments
- Reminders sent

### 10. Documentation & Security
- JWT authentication
- Fernet encryption for sensitive tokens at rest
- HTTPS enforced (managed by Railway)
- CORS origin restriction (wildcard for Railway subdomains)

---

## ⚙️ Infrastructure
- **Backend:** FastAPI (Python 3.11)
- **Frontend:** Next.js 14 (TypeScript)
- **Database:** PostgreSQL 16
- **Cache / Queue:** Redis 7 + Celery
- **Hosting:** Railway (API, Worker, Web, DB, Redis)
- **Integrations:** Google Calendar (OAuth2), WhatsApp (Meta), Telegram Bot API, OpenAI (GPT-4)

---

## 🚫 Excluded (Future Phases)
- Form builder
- Advanced conversational AI (Segmented context)
- Multi-branch setup
- Template customization
- Advanced dashboard filters/graphs
- Referral program
- Segmented CRM
- MercadoPago integration

---

## 🧩 Deliverables
1. Functional dashboard (login, onboarding, CRM, appointments, reminders)
2. End-to-end flow: Messaging ↔ Assistant ↔ Google Calendar
3. Tech documentation (setup, API basics)
4. Staging environment for continuous QA

---

## ✅ Success Criteria
- Business completes onboarding <10 minutes
- Client books appointment via WhatsApp/Telegram successfully
- Reminders sent automatically and confirmed
- AI remembers user context across sessions (Redis memory)
