# Sherpa – MVP Scope Document

## 🎯 Objective
Deliver a **minimum viable product** that automates appointment scheduling and reminders via **WhatsApp**, synchronizes with **Google Calendar**, and provides a simple **web dashboard** for businesses to manage clients and bookings.

Goal: Validate product-market fit and prove user value with minimal engineering overhead.

---

## ✅ Core Features (Included in MVP)

### 1. Authentication & Account
- User registration and login (JWT-based)
- Business profile setup (name, category, contact info)

### 2. Guided Onboarding (Simplified Wizard)
- Step 1: Business information
- Step 2: Assistant configuration (name, tone)
- Step 3: Connect Google Calendar (OAuth)
- Step 4: Connect WhatsApp (manual setup guide)
- Step 5: Activate 30-day trial subscription

### 3. Assistant Configuration
- Assistant name and greeting
- Business category field
- Working hours (basic schedule)
- Welcome message (predefined)

### 4. Calendar / Appointments
- Appointment CRUD (create, read, update, delete)
- One-way Google Calendar sync (read-only availability)
- Manual appointment creation via dashboard

### 5. WhatsApp Integration (v1)
- Meta Cloud API integration
- Send/receive messages via webhook
- Auto-responses: welcome + menu (book, reschedule, cancel)
- Appointment confirmation message

### 6. Reminders
- Automatic reminder 24h before appointment
- Confirmation prompt (Yes/No)

### 7. CRM (Basic)
- Client list (name, phone, next appointment)
- Search by name
- Auto-create client record when booking appointment

### 8. Subscription / Billing (Trial Only)
- Free 30-day trial plan
- Stripe test mode integration
- Manual upgrade flow (no full billing page yet)

### 9. Dashboard (Basic KPIs)
- Total clients
- Total appointments
- Reminders sent

### 10. Documentation & Security
- `.env.example` for local setup
- JWT authentication
- HTTPS enforced
- Error logging (Sentry)

---

## ⚙️ Infrastructure
- **Backend:** FastAPI (Python, Railway)
- **Frontend:** Next.js (TypeScript, Vercel)
- **Database:** PostgreSQL (Railway)
- **Cache / Queue:** Redis (Railway)
- **Storage:** Optional (S3 phase 2)
- **CI/CD:** GitHub Actions
- **Integrations:** Google Calendar (OAuth), WhatsApp Business API (Meta), Stripe (test)

---

## 🚫 Excluded (Future Phases)
- Form builder
- Advanced conversational AI
- Multi-branch setup
- Template customization
- Advanced dashboard filters/graphs
- Referral program
- Segmented CRM
- MercadoPago integration

---

## 🧩 Deliverables
1. Functional dashboard (login, onboarding, CRM, appointments, reminders)
2. End-to-end flow: WhatsApp ↔ Assistant ↔ Google Calendar
3. Tech documentation (setup, API basics)
4. Pilot test with 1–2 real businesses

---

## 📅 Timeline (Suggested)
- **Week 1–2:** Auth, Onboarding, Google Calendar integration
- **Week 3–4:** WhatsApp integration + Appointment CRUD
- **Week 5:** Reminders + CRM
- **Week 6:** Dashboard KPIs + Polish + QA
- **Week 7:** Pilot deployment

---

## ✅ Success Criteria
- Business completes onboarding <10 minutes
- Client books appointment via WhatsApp successfully
- Reminders sent automatically and confirmed
- At least 2 pilot users complete 10+ appointments each

