# Sherpa MVP Backlog

## Epic 1: Infrastructure & Architecture
- [x] Task 1.1: Initialize monorepo structure (frontend, backend, infra, docs).
- [x] Task 1.2: Setup Docker Compose (PostgreSQL 16, Redis 7).
- [x] Task 1.3: Configure GitHub Actions CI/CD.
- [x] Task 1.4: Setup Celery + Redis for background jobs.
- [x] Task 1.5: Establish OpenAPI type generation loop for frontend.
- [x] Task 1.6: Deploy to Railway (API, Worker, Web) with automated migrations.
- [ ] Task 1.7: Expand Docker Compose to include Backend, Worker, Beat, and Frontend services.
- [ ] Task 1.8: Implement API Rate Limiting (e.g., SlowAPI or FastAPI-limiter) to prevent AI/Messaging abuse.

## Epic 2: Authentication & Business Profile
- [x] Task 2.1: Implement JWT Auth (Register, Login).
- [x] Task 2.2: Define BusinessProfile and AssistantConfig models.
- [x] Task 2.3: Implement endpoints for BusinessProfile CRUD.
- [x] Task 2.4: Implement endpoints for AssistantConfig CRUD.
- [ ] Task 2.5: Add Timezone support to BusinessProfile and ensure all Dashboard views respect the business local time.

## Epic 3: Guided Onboarding Wizard
- [x] Task 3.1: Create multi-step Onboarding UI in Next.js (5 steps).
- [x] Task 3.2: Connect Onboarding steps to backend endpoints.
- [x] Task 3.3: Implement "Activate Trial" (30-day) logic and idempotent profile creation.
- [x] Task 3.4: Make onboarding optional with a dashboard banner.

## Epic 4: Google Calendar Integration
- [x] Task 4.1: Implement OAuth2 flow for Google Calendar (Backend).
- [x] Task 4.2: Implement read-only sync for availability (Backend).
- [x] Task 4.3: Implement one-way sync (Backend).

## Epic 5: Messaging Integrations (Multi-Tenant)
- [x] Task 5.1: Implement multi-tenant Telegram Bot logic (unique webhook_id).
- [x] Task 5.2: Create TelegramService for bot validation and messaging.
- [x] Task 5.3: Update Settings UI to allow connecting Telegram independently.
- [ ] Task 5.4: Implement WhatsApp Meta Cloud API multi-tenant webhook.
- [ ] Task 5.5: Connect Messaging handlers to AIService for automated booking.

## Epic 6: Calendar & Appointments
- [x] Task 6.1: Implement Appointment CRUD (Backend + Frontend).
- [x] Task 6.2: Create Dashboard Calendar view (Next.js).
- [x] Task 6.3: Implement manual appointment creation via Dashboard.
- [ ] Task 6.4: Update manual/AI rescheduling logic to modify existing appointments instead of creating new ones.

## Epic 7: CRM & Reminders
- [x] Task 7.1: Implement Client list with search (Backend + Frontend).
- [x] Task 7.2: Auto-create client on first booking.
- [x] Task 7.3: Implement 24h automatic reminder job (Celery).
- [ ] Task 7.4: Refactor background tasks (reminders, sync) to use async `httpx` instead of `requests`.

## Epic 8: Dashboard & Subscription
- [ ] Task 8.1: Implement KPI display (Total Clients, Appointments, Reminders).
- [ ] Task 8.2: Integrate Stripe Test Mode for manual upgrades.

## Epic 9: Lead Capture & Intelligent Scheduling
- [x] Task 9.1: Implement "Identity Gate" in AIService (check if client info is complete).
- [x] Task 9.2: Create `update_client_identity` tool for AI to save Name/Email/Phone during chat.
- [ ] Task 9.3: Refine WhatsApp multi-tenant webhook for full production parity.
- [ ] Task 9.4: Implement Redis-based conversation state to handle multi-turn data collection.
- [ ] Task 9.5: Automate "Booking Confirmation" message back to the messaging provider.

## Epic 10: Scalability & UX Hardening
- [ ] Task 10.1: Migrate CRM and Calendar data fetching to React Server Components (RSC) to improve LCP.
- [ ] Task 10.2: Implement Skeleton loaders and standardized Error Boundaries for all dashboard views.
- [ ] Task 10.3: Configure and verify Celery Beat for reliable periodic task triggering (Reminders & Sync).
- [ ] Task 10.4: Implement "Retry" and "Recovery" interactive paths for AI/API failure states.

## Epic 11: System Scalability & Reliability
- [ ] Task 11.1: Refactor Google Calendar API to use async HTTP calls (httpx) instead of blocking sync client.
- [ ] Task 11.2: Add B-Tree and Composite indexes to `appointments` and `busy_slots` tables.
- [ ] Task 11.3: Configure separate Railway services for Web API, Celery Worker, and Celery Beat.
- [ ] Task 11.4: Integrate TanStack Query (React Query) for frontend data synchronization and caching.
- [ ] Task 11.5: Replace CI/CD placeholder checks with real `pytest` execution and coverage reporting.
- [ ] Task 11.6: Implement "Assistant is typing..." signals for messaging platforms.
- [ ] Task 11.7: Implement responsive Sidebar and mobile-optimized CRM views.
- [ ] Task 11.8: Refactor `sync_single_calendar` to use bulk `insert().values()` operations for batch processing.
- [ ] Task 11.9: Apply `useMemo` to CRM filtering and Calendar sorting to prevent UI lag under load.
- [ ] Task 11.10: Expand Zustand stores to manage global CRM and Appointment state for data consistency.
- [ ] Task 11.11: Move migrations to a standalone "Pre-Deploy" task to prevent race conditions during scaling.
- [ ] Task 11.12: Configure Redis with `allkeys-lru` eviction policy and persistent storage.
- [ ] Task 11.13: Migrate Google Calendar Auth from popup-based to standard redirect-based flow.

## Hard Constraints (Enforced)
- No Form Builders.
- No Advanced Conversational AI.
- No Multi-branch setups.
- No Segmented CRM.
- No MercadoPago.
