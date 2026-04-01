# Sherpa MVP Backlog

## Epic 1: Infrastructure & Architecture
- [x] Task 1.1: Initialize monorepo structure (frontend, backend, infra, docs).
- [x] Task 1.2: Setup Docker Compose (PostgreSQL 16, Redis 7).
- [x] Task 1.3: Configure GitHub Actions CI/CD.
- [x] Task 1.4: Setup Celery + Redis for background jobs.
- [x] Task 1.5: Establish OpenAPI type generation loop for frontend.
- [x] Task 1.6: Deploy to Railway (API, Worker, Web) with automated migrations.
- [ ] Task 1.7: Expand Docker Compose to include Backend, Worker, Beat, and Frontend services.
- [x] Task 1.8: Implement API Rate Limiting (e.g., SlowAPI or FastAPI-limiter) to prevent AI/Messaging abuse.

## Epic 2: Authentication & Business Profile
- [x] Task 2.1: Implement JWT Auth (Register, Login).
- [x] Task 2.2: Define BusinessProfile and AssistantConfig models.
- [x] Task 2.3: Implement endpoints for BusinessProfile CRUD.
- [x] Task 2.4: Implement endpoints for AssistantConfig CRUD.
- [x] Task 2.5: Add Timezone support to BusinessProfile and ensure all Dashboard views respect the business local time.

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
- [x] Task 6.4: Update manual/AI rescheduling logic to modify existing appointments instead of creating new ones.
- [x] Task 6.5: Implement AI tool to list user appointments (get_client_appointments).

## Epic 7: CRM & Reminders
- [x] Task 7.1: Implement Client list with search (Backend + Frontend).
- [x] Task 7.2: Auto-create client on first booking.
- [x] Task 7.3: Implement 24h automatic reminder job (Celery).
- [x] Task 7.4: Refactor background tasks (reminders, sync) to use async `httpx` instead of `requests`.

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
- [x] Task 10.1: Migrate CRM, Calendar, Dashboard, and Inbox data fetching to React Server Components (RSC) to improve LCP.
- [x] Task 10.2: Implement Skeleton loaders and standardized Error Boundaries for all dashboard views.
- [ ] Task 10.3: Configure and verify Celery Beat for reliable periodic task triggering (Reminders & Sync).
- [ ] Task 10.4: Implement "Retry" and "Recovery" interactive paths for AI/API failure states.
- [ ] Task 10.5: Resolve persistent visual flickering in Dashboard and Settings pages during RSC transition.

## Epic 11: System Scalability & Reliability
- [x] Task 11.1: Refactor Google Calendar API to use async HTTP calls (httpx) instead of blocking sync client.
- [x] Task 11.2: Add B-Tree and Composite indexes to `appointments` and `busy_slots` tables.
- [x] Task 11.3: Configure separate Railway services for Web API, Celery Worker, and Celery Beat.
- [x] Task 11.4: Integrate TanStack Query (React Query) for frontend data synchronization and caching.
- [x] Task 11.5: Replace CI/CD placeholder checks with real `pytest` execution and coverage reporting.
- [x] Task 11.6: Implement "Assistant is typing..." signals for messaging platforms.
- [ ] Task 11.7: Implement responsive Sidebar and mobile-optimized CRM views.
- [ ] Task 11.8: Refactor `sync_single_calendar` to use bulk `insert().values()` operations for batch processing.
- [ ] Task 11.9: Apply `useMemo` to CRM filtering and Calendar sorting to prevent UI lag under load.
- [ ] Task 11.10: Expand Zustand stores to manage global CRM and Appointment state for data consistency.
- [x] Task 11.11: Move migrations to a standalone "Pre-Deploy" task to prevent race conditions during scaling.
- [ ] Task 11.12: Configure Redis with `allkeys-lru` eviction policy and persistent storage.
- [ ] Task 11.13: Migrate Google Calendar Auth from popup-based to standard redirect-based flow.

## Epic 12: Customizable Service Catalog
- [x] Task 12.1: Define Service model with JSONB `attributes` and implementation of CRUD API.
- [x] Task 12.2: Implement Dynamic Service Management UI (List, Add, Edit).
- [ ] Task 12.3: Build a lightweight Custom Field Builder for services (Text, Number, Select).
- [x] Task 12.4: **AI Brain Upgrade**: Update AIService (Jinja2) to inject the active service catalog and required fields into the prompt.
- [x] Task 12.5: **Smart Escalation Chain**: Implement behavioral toggles (Honesty, Internal Alert, Lead Capture, Emergency Phone) for AI fallback handling.
- [x] Task 12.6: Refactor `create_appointment` tool to capture and store custom service attributes in JSONB metadata.
- [ ] Task 12.7: **Smart Context Awareness**: Skip the 'Ask for Reason' requirement if the user has already selected a specific service from the catalog (The service name is the reason).

## Epic 13: Extensible CRM Client Profiles
- [x] Task 13.1: Add JSONB `custom_fields` column to Client model and update schemas.
- [x] Task 13.2: Create Global CRM Field Settings (e.g., Define "Pet Name" once for the business).
- [x] Task 13.3: Implement Dynamic Client Profile UI that renders inputs based on global field definitions.
- [ ] Task 13.4: Create `update_client_metadata` AI tool for autonomous data extraction during chat.
- [ ] Task 13.5: Inject client metadata into the prompt for advanced personalization (e.g., "How is Max doing?").

## Epic 14: Settings Navigation & UI Overhaul
- [x] Task 14.1: Redesign Settings layout into a Tabbed navigation (General, Assistant, Services, Integrations).
- [ ] Task 14.2: Implement persistent Form State management to prevent data loss during tab switching.
- [ ] Task 14.3: Detach Live Test Sandbox into a persistent slide-out drawer accessible from all setting tabs.
- [ ] Task 14.4: Ensure full mobile responsiveness for the new settings architecture.

## Epic 15: Business-to-Assistant (B2A) Internal Chat
- [ ] Task 15.1: Implement a dedicated "Internal Manager" chat interface in the dashboard.
- [ ] Task 15.2: Create a "Boss Mode" Jinja2 system prompt (Focus on reporting and operational oversight).
- [ ] Task 15.3: Expose read-only reporting tools to the AI (e.g., `get_daily_summary`, `search_client_history`).
- [ ] Task 15.4: Implement strict data gating to ensure B2A chat cannot trigger client-facing messages or external bookings.

## Epic 16: Official WhatsApp Integration via Twilio
- [ ] Task 16.1: Implement Twilio Webhook handler for incoming messages and status receipts (Delivered/Read).
- [ ] Task 16.2: Implement Redis-based "AI Silent Mode" triggered by manual dashboard interjections.
- [ ] Task 16.3: Develop the "Message Credit" engine to track and limit tenant-specific outbound costs.
- [ ] Task 16.4: Build Media Pipeline to securely download and store Twilio attachments to S3/Cloudinary.
- [ ] Task 16.5: Implement WhatsApp Template Management UI and compliance enforcement for 24h window.

## Epic 17: Dashboard UX Polish & Accessibility
- [x] Task 17.1: Implement Global Toast Notifications (e.g., Sonner).
- [x] Task 17.2: Refactor Settings navigation to support Anchor/Hash links (e.g., `/settings?tab=general`).
- [x] Task 17.3: Optimize Modal responsiveness for dynamic content; implement internal scrolling.
- [ ] Task 17.4: Run a comprehensive UX/UI Audit.
- [ ] Task 17.5: **Unsaved Changes Guardian**: Warning before navigating away with unsaved modifications.
- [ ] Task 17.6: **Two-Stage Field Deletion**: Soft-delete UI for CRM fields.
- [ ] Task 17.7: **Data Retention UI**: Add tooltips explaining JSONB preservation.
- [ ] Task 17.8: **Intelligent Calendar Sorting**: Chronological ordering and visual distinction for past appointments (dimmed).
- [ ] Task 17.9: **Enhanced Appointment Statuses**: Implement UI for scheduled, confirmed, cancelled, and completed states.
- [ ] Task 17.10: **Dashboard Fix**: Ensure "Today's Schedule" strictly shows current date; move future appointments to a separate "Coming Up" list.


## Epic 18: Bulk Data Portability & CRM Sync
- [ ] Task 18.1: High-Performance Bulk Importer (Backend): Background processing for CSV/XLSX files using Celery.
- [ ] Task 18.2: Dynamic Column Mapper (Frontend): Mapping UI to align external file headers with Sherpa CRM fields.
- [ ] Task 18.3: Intelligent Deduplication Engine: Logic to handle phone/email collisions during bulk imports.
- [ ] Task 18.4: Third-Party CRM Connectors: Sync with HubSpot, Salesforce, or Pipedrive.
- [ ] Task 18.5: Import Safety & Rollback: "Review before commit" flow and 24h undo capability.

## Epic 19: Operational Hub (Inbox & Dashboard)
- [ ] Task 19.1: Multi-channel Unified Inbox: Split-screen interface for Telegram/WhatsApp chat management.
- [ ] Task 19.2: AI-Human Handoff UI: Indicators for flagged chats and "Pause AI" manual toggles.
- [ ] Task 19.3: Smart Dashboard Overview: "Daily Briefing" widgets for appointments, leads, and alerts.
- [ ] Task 19.4: Real-time Updates: WebSocket or optimized polling for incoming messages and alerts.

## Hard Constraints (Enforced)
- No Generic Drag-and-Drop Form Builders (Dynamic niche-attributes only).
- No Open-Ended Conversational AI (Strict scheduling and internal reporting focus).
- No Multi-branch setups.
- No Segmented Marketing CRM (Operational context only).
- No MercadoPago.
