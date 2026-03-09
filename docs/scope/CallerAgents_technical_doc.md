# Sherpa – Technical Development Document

## 1. System Overview

Sherpa is a SaaS platform designed for service-based businesses to automate client communication, appointment scheduling, reminders, and form collection through an AI assistant integrated with WhatsApp and Google Calendar.

The system must be modular, scalable, and well-documented for continuous improvement.

---

## 2. Architecture

- **Backend:** FastAPI (Python) or NestJS (Node.js)
- **Frontend:** Next.js (React)
- **Database:** PostgreSQL
- **Cache / Queue:** Redis + Celery / BullMQ
- **Storage:** AWS S3 or Cloudinary
- **Infrastructure:** Docker, GitHub Actions CI/CD
- **Hosting:** Railway / Vercel / AWS
- **Security:** HTTPS, JWT, OAuth2

---

## 3. Core Modules

### 3.1 Onboarding Wizard

- Step-by-step configuration (0–7)
- State persistence per user
- Validation per step

### 3.2 Conversations

- Inbox UI with filters (AI/manual/unread)
- Full conversation history
- Manual override for business owners or staff

### 3.3 CRM

- Client list with search and filters
- Tag system
- Custom fields
- Link to forms and appointments

### 3.4 Forms

- Drag & drop form builder
- Field types: text, email, date, number, select
- Rules: per appointment type, frequency
- Responses stored and exportable

### 3.5 Assistant Configuration

- Basic info (business name, category, address)
- AI setup (name, tone, rules)
- Contact rules (who, how, when)
- Knowledge base (FAQs, prices, services)

### 3.6 Calendar & Appointments

- Manual or automatic scheduling
- Google Calendar sync
- Timezone configuration
- Appointment CRUD

### 3.7 Reminders

- Activation toggle
- Count (1 or 2)
- Templates with dynamic variables
- Schedule (24h before / same day)
- States: scheduled / sent / failed

### 3.8 Templates

- Create text templates
- Dynamic placeholders (e.g., {{name}}, {{date}})
- Preview and validation

### 3.9 Media Library

- Upload and manage files (images/docs)
- Enable/disable for WhatsApp sending

### 3.10 Testing Sandbox

- Simulate assistant conversations
- Configuration validation before deployment

### 3.11 Integrations

- **Google Calendar:** OAuth2, read/write, webhooks
- **WhatsApp Business:** Meta Cloud API, templates, delivery receipts
- **Payments:** Stripe / MercadoPago

### 3.12 Subscription System

- Plans: Essential, Professional, Business Plus
- Billing (monthly, annual)
- Limits per plan (clients, assistants)
- Trial periods (15 or 30 days)

### 3.13 Referral Program

- Unique referral codes
- Tracking and rewards (+30 days)
- Metrics dashboard

### 3.14 Notifications

- Channels: email, WhatsApp, push
- Event-based triggers
- Template-driven

### 3.15 Metrics Dashboard

- Appointments (scheduled/completed)
- Active clients
- AI vs. manual chats
- Referral performance

---

## 4. API Design

- RESTful API with Swagger documentation
- Routes:
  - `/auth` – login, register, refresh
  - `/users` – profile, subscription
  - `/assistants` – AI setup
  - `/clients` – CRUD, filters
  - `/appointments` – CRUD, sync
  - `/forms` – builder, responses
  - `/templates` – CRUD
  - `/reminders` – setup, send
  - `/messages` – chat history
  - `/media` – upload, list
  - `/integrations` – Google, WhatsApp
  - `/subscriptions` – billing, status
  - `/referrals` – register, stats

**Response format:**

```json
{
  "status": "success",
  "data": {},
  "message": "..."
}
```

---

## 5. Authentication & Authorization

- JWT (access + refresh)
- OAuth2 (Google, Meta)
- Roles: `admin`, `business_owner`, `assistant`
- Role-based middleware and permissions table

---

## 6. Database Schema

- Entities:
  - `User`
  - `BusinessProfile`
  - `AssistantConfig`
  - `Client`
  - `Appointment`
  - `Reminder`
  - `Message`
  - `Form`
  - `FormResponse`
  - `Template`
  - `Media`
  - `Integration`
  - `Subscription`
  - `Referral`
  - `Tag`
  - `CustomField`
- Include timestamps (`created_at`, `updated_at`), soft deletes, tenant ID

---

## 7. Frontend Requirements

- Built with Next.js + TailwindCSS
- State management: Zustand / Redux
- Responsive design (mobile/tablet/desktop)
- Dark mode
- i18n (Spanish default)

---

## 8. Infrastructure & Deployment

- Docker containers per service
- CI/CD pipeline (GitHub Actions)
- Environments: dev, staging, prod
- Auto-deploy on push to main
- Logging: Sentry
- Monitoring: UptimeRobot / AWS CloudWatch

---

## 9. Testing

- Unit tests (pytest / jest)
- Integration tests (Postman / Cypress)
- CI enforcement (tests must pass)

---

## 10. Security & Compliance

- HTTPS only
- Password encryption (bcrypt)
- Sensitive data encryption at rest
- Data privacy compliance (regional and international standards)
- Access logs and audit trail

---

## 11. Documentation Deliverables

- `README.md`: setup & dependencies
- `API_DOCS.md` / Swagger
- `CONTRIBUTING.md`: coding standards & PR guide
- `DEPLOY.md`: environment variables & steps
- `STYLEGUIDE.md`: naming & structure rules
- `ROADMAP.md`: feature timeline & milestones

---

## 12. Deliverables Checklist

### A. Architecture & Infrastructure

- Tech stack finalization (FastAPI, Next.js, PostgreSQL, Redis)
- Backend and frontend Dockerfiles
- docker-compose.yml for local development
- CI/CD pipeline in GitHub Actions (build, test, deploy)
- Environment configuration (dev, staging, prod)
- Monitoring setup (Sentry, uptime checks)
- Architecture and deployment documentation

### B. Data Layer

- ERD diagram with all entities and relationships
- ORM models (SQLAlchemy) with Alembic migrations
- Data validation schemas (Pydantic)
- Seed scripts for initial data
- Indexing strategy and relationships
- Test fixtures for unit and integration tests

### C. API & Backend

- OpenAPI specification v1 (Swagger/Redoc)
- Authentication: JWT (access/refresh) + OAuth2 (Google, Meta)
- Role-based access control implementation
- Core endpoints: auth, clients, appointments, reminders, messages
- Background jobs (Celery + Redis)
- Webhooks for WhatsApp and Google Calendar
- Validation and error handling middleware
- Rate limiting (SlowAPI)

### D. Frontend (Dashboard)

- Next.js app structure and routing
- Authentication flow (login, signup)
- Onboarding wizard (multi-step setup)
- Conversations inbox UI
- CRM module (client list, detail view)
- Appointment calendar (read-only Google sync)
- Reminder configuration interface
- Settings for assistant configuration and integrations
- Basic KPI dashboard (clients, appointments, reminders)

### E. Integrations

- Google Calendar integration (OAuth2, read/write)
- WhatsApp Business API integration (Meta Cloud)
- Stripe integration (test mode for free trial)
- Webhook verification and error retry logic

### F. Security & Compliance

- HTTPS enforced across environments
- Password hashing (bcrypt)
- Sensitive data encryption at rest
- Access logs and audit trail
- Data privacy compliance (regional/international)

### G. Testing & Quality

- Unit tests (backend/frontend)
- Integration tests (API + frontend)
- Webhook contract tests
- End-to-end tests (Playwright)
- Linting and formatting rules enforced
- Test coverage reports in CI/CD

### H. Documentation

- README.md (project setup, run instructions)
- API\_DOCS.md / Swagger docs
- DEPLOY.md (env variables, deployment steps)
- STYLEGUIDE.md (code conventions)
- ROADMAP.md (MVP → v1 plan)
- RUNBOOKS.md (incident response)
- CONTRIBUTING.md (PR workflow)

### I. Release & Pilot

- Tag release v0.1.0
- Staging environment live demo
- Pilot checklist completed (2 businesses)
- User feedback collection form
- Release notes and change log

