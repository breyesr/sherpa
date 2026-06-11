# Sherpa B2B Sales Intelligence Pivot (PRIMARY)

## Epic 100: Environment & Backup (Pivot Foundation)
- [x] Task 100.1: Create Legacy Snapshot (`cp -r` to `../sherpa-legacy-b2c`).
- [x] Task 100.2: Create and checkout `feature/b2b-pivot` branch.
- [x] Task 100.3: Update `GEMINI.md` and project docs to reflect the B2B Sales Intelligence focus.

## Epic 101: Codebase Audit & Decoupling
- [x] Task 101.1: Audit `ai_service.py` for orchestration efficiency (LangChain/LlamaIndex evaluation). **RESULT: Transition to modular Orchestrator recommended.**
- [x] Task 101.2: Audit Messaging Webhooks (`whatsapp.py`, `telegram.py`) for domain logic separation. **RESULT: Decoupling into MessagingService recommended.**
- [x] Task 101.3: Audit Database patterns for async efficiency and `uuid7str` consistency. **RESULT: High consistency; ready for pgvector.**

## Epic 102: Schema Evolution & Vector Infrastructure
- [x] Task 102.1: Add `pgvector` and related dependencies to `backend/requirements.txt`.
- [x] Task 102.2: Configure Alembic to support the `vector` extension.
- [x] Task 102.3: Implement B2B Relational Models: `Store`, `Customer` (Contact), `Categories`, `Products`, `Orders`, `Competitors`.
- [x] Task 102.4: Implement Intelligence Models: `Store_Notes`, `Customer_Notes` (with `pgvector` columns).
- [x] Task 102.5: Refactor `Appointment` model to link to `Store` and `Customer`.
- [x] Task 102.6: Execute Alembic migrations for the new B2B schema.

## Epic 103: Multi-Agent AI System (The Orchestrator)
- [x] Task 103.1: Implement AI State Router (Ingestion vs. Retrieval vs. Scheduling).
- [x] Task 103.2: Build entity-extraction pipeline for unstructured Field Intelligence (Ingestion).
- [x] Task 103.3: Implement logic for automated Vector generation on note save.
- [x] Task 103.4: Implement GraphRAG querying logic (Similarity Search + SQL Joins).
- [x] Task 103.5: Develop "Pre-visit Brief" synthesis prompt.

## Epic 104: Scheduling & Frontend Transformation
- [x] Task 104.1: Enhance Google Calendar sync with Store/Address metadata.
- [x] Task 104.2: Synchronize frontend types with new OpenAPI spec (`npm run gen:api`).
- [x] Task 104.3: Refactor CRM views to "Accounts" (Stores) and "Contacts" (Customers).
- [x] Task 104.4: Build "Intelligence Timeline" view for Store/Account profiles.
- [x] Task 104.5: Update Appointment/Calendar modals and filters for B2B entities.

## Epic 105: Audio Ingestion & Transcription (PAUSED)
- [ ] Task 105.1: Implement OpenAI Whisper API utility (`core/audio_service.py`) to transcribe voice notes.
- [ ] Task 105.2: Update WhatsApp Webhook to download and process `audio/ogg` media messages.
- [ ] Task 105.3: Update Telegram Webhook to download and process `voice` messages.
- [ ] Task 105.4: Route transcribed text automatically into the B2B Ingestion Agent.

## Epic 106: Vertical-Aware Prompt Orchestration (IN PROGRESS)
- [x] Task 106.1: Separate system prompts into `b2c_scheduler.j2` and `b2b_sales_brain.j2`.
- [x] Task 106.2: Refactor `AIService.get_response` to load templates based on `vertical_type`.
- [x] Task 106.3: Implement "Tool Masking" to hide B2B-specific tools from B2C (Basic) businesses.
- [x] Task 106.4: Remove hardcoded "Marco" persona and genericize `B2BOrchestrator` routing messages.
- [ ] Task 106.5: Validate dual-mode logic: Ensure B2C flows maintain "Identity Gating" while B2B flows prioritize "Intelligence Ingestion".

## Epic 107: Trade Schema Hardening & Draft Alignment (FOUNDATIONS COMPLETE)
- [x] Task 107.1: Relational Hardening: Update `Store`, `Client`, and `Competitor` models with draft fields plus B-Tree indexes for fast regional filtering.
- [x] Task 107.2: Migration & Type Sync: Execute Alembic migrations and run `npm run gen:api` to synchronize the frontend TypeScript types.
- [x] Task 107.3: AI Prompt & Tool Enrichment: Update `b2b_sales_brain.j2` and `intent_classifier.j2` so the AI knows how to "Hybrid Search" the new fields.
- [x] Task 107.4: Progressive Disclosure UI: Update Store/Client modals in Next.js with a "Trade Details" section for mobile optimization.
- [x] Task 107.5: Ingestion Logic Update: Update `process_b2b_ingestion` task to automatically extract and populate these new fields from chat.
- [x] Task 107.6: Catalog Hardening: Update `Product`, `Category`, and `Order` models to align with the draft (Delivery IDs, Category Types, etc.).
- [x] Task 107.7: Dashboard Column Expansion: Update Stores and CRM tables to show Region, Segment, and Role columns in the main list views.
- [x] Task 107.8: Persona Serialization: Implement recursive `get_semantic_summary()` for B2B entities (Flattened Entity Mapping).
- [x] Task 107.9: Hybrid Search & RRF: Implement Parallel Keyword (FTS) + Semantic (pgvector) search with Reciprocal Rank Fusion (RRF).
- [ ] Task 107.10: Async Vectorization: Implement Celery-driven background vector updates with Exponential Backoff reliability.
- [x] Task 107.11: Deterministic Knowledge Storage: Migrate to v5 UUIDs and deterministic UPSERTs for knowledge chunks (Idempotency).
- [ ] Task 107.12: Account Intelligence Table: Create the "Fat Table" schema for Dossiers (Metadata, Playbook, Triggers, Context).
- [ ] Task 107.13: Heuristic Inference Pipeline: Implement the logic that updates the Dossier Playbook and Triggers automatically from field reports.
- [ ] Task 107.14: Strategic Coach Prompt: Rewrite `visit_briefer.j2` to use the "Cognitive Frame" assembly pattern (Strategy-First).

## Epic 108: The Actionable Intelligence Ledger (Frictionless CRM)
**Objective**: Transition from purely narrative visit notes to a structured ledger of Marketing and Commercial actions, automatically extracted by AI to power management dashboards and future "Active AI" interventions.

- [ ] Task 108.1: **Schema Implementation**: Create the `StoreAction` model with fields for `category` (MARKETING, COMMERCIAL), `objective` (THREAT_RESPONSE, ANNIVERSARY, etc.), `impact`, and `details` (JSONB).
- [ ] Task 108.2: **AI Extraction Logic**: Update the `process_b2b_ingestion` pipeline to use a specialized LLM parsing step to identify and populate `StoreAction` records from raw chat notes.
- [ ] Task 108.3: **Historical Backfill**: Re-process existing mock notes (from the last 60 days) into the new `StoreAction` table to ensure dashboards are populated.
- [ ] Task 108.4: **Dashboard API**: Create specialized endpoints for high-level reporting (e.g., actions by objective, visits per month, success rates).
- [ ] Task 108.5: **Frictionless UI Integration**: Implement the "Strategy Desk" view with charts and an "Opportunity Inbox" for proposed AI actions that require Rep approval.
- [ ] Task 108.6: **Anniversary Trigger**: Implement a background job that automatically generates a `StoreAction` (PROPOSED) when a store's `opening_date` is approaching.

## Epic 109: Context-Aware Account Intelligence & Discovery (COMPLETE)
**Objective**: Resolve AI context confusion and enable global account discovery by implementing stateful session tracking, attributed context injection, and dual-mode semantic search.

- [x] Task 109.1: **Stateful Session Memory**: Implement Redis-based `active_store_id` tracking in `ChatMemory` to maintain and switch focus between accounts.
- [x] Task 109.2: **Attributed Context Labeling**: Update `GraphRAGService` to prefix every retrieved intelligence chunk with its source (e.g., `[SOURCE: Store X]`) to prevent entity mixing.
- [x] Task 109.3: **Focus Detection & Reset**: Implement logic in `B2BOrchestrator` to detect when a user mentions a new store and trigger a context reset/announcement.
- [x] Task 109.4: **Dual-Mode Search Engine**: Upgrade `GraphRAGService` to support both "Hard-Filtered" (one store) and "Global-Discovery" (all stores) search patterns based on user intent.
- [x] Task 109.5: **Regional & Segment Discovery**: Enable the AI to utilize Store profile embeddings (Task 107.8) to answer cross-account questions like "Which stores are in the North region?".

## Epic 110: High-Fidelity Session Isolation (COMPLETE)
**Objective**: Ensure total data isolation between store visits by wiping short-term chat history and summaries on account switch.

- [x] Task 110.1: **Session Wipe Mechanism**: Implement `clear_session_data` in `ChatMemory` to flush history, summary, and metadata in one atomic operation.
- [x] Task 110.2: **Auto-Flush Logic**: Trigger the Clean Slate wipe in `B2BOrchestrator` whenever a high-confidence store switch is detected.
- [x] Task 110.3: **Isolation Handshake**: Update the AI response to explicitly notify the user when a session is isolated (e.g., "Iniciando nueva sesión. Historial reiniciado.").
- [x] Task 110.4: **Inactivity Expiration**: Implement a 2-hour TTL for the `active_store_id` lock to prevent accidental context persistence across days.

---

## Epic 111: Unified Knowledge Architecture & Global Discovery
**Objective**: Transition from siloed vector storage (distributed across entity tables) to a centralized knowledge corpus to enable high-performance cross-entity discovery and simplified hybrid search (RRF).

- [x] Task 111.1: **Schema Implementation**: Create the `knowledge_corpus` table with `entity_type`, `entity_id`, `content`, `embedding`, and `metadata` (JSONB) columns.
- [x] Task 111.2: **Entity Serialization Sync**: Standardize the `get_semantic_summary()` methods across all models to ensure high-quality ingestion into the corpus.
- [x] Task 111.3: **Migration & Backfill**: Execute an Alembic migration and a script to move all existing embeddings from `stores`, `store_notes`, `customer_notes`, and `competitors` into the unified corpus.
- [x] Task 111.4: **Service Refactor**: Update `GraphRAGService` to perform all vector similarity searches against the `knowledge_corpus` table instead of individual model tables.
- [ ] Task 111.5: **Global Filter Implementation**: Enable the AI to use the `metadata` JSONB column to filter discovery results by Region, Segment, or Role in a single query.
- [x] Task 111.6: **Hybrid Search (RRF) Integration**: Implement Parallel Keyword (FTS) + Semantic search on the unified corpus using Reciprocal Rank Fusion.

---

## Epic 112: The Trinity Intelligence Pipeline
**Objective**: Decouple data retrieval, logical synthesis, and persona-driven delivery into a specialized three-step internal pipeline to maximize factual accuracy and strategic framing.

- [x] Task 112.1: **Retriever Parallelization**: Refactor `GraphRAGService` to use `asyncio.gather` for simultaneous SQL (Factual) and Vector (Semantic) data retrieval.
- [ ] Task 112.2: **The Synthesizer Prompt**: Develop `app/core/prompts/synthesizer.j2`, a flavorless, logic-driven template that merges raw data into a structured "Intelligence Dossier".
- [ ] Task 112.3: **The Sherpa Persona Refactor**: Rewrite `app/core/prompts/visit_briefer.j2` to act as "The Voice", focusing exclusively on strategic framing based on the clean Synthesizer dossier.
- [ ] Task 112.4: **Trinity Orchestration**: Implement the sequential flow: Fetch (Parallel) -> Synthesis (Flash Model) -> Persona Delivery (Capability Model).
- [ ] Task 112.5: **Validation Guardrails**: Implement "Identity Locking" checks in the Synthesizer to ensure facts from different stores never bleed into the same dossier.
- [ ] Task 112.6: **Latency & Token Benchmarking**: Quantify the performance impact of the multi-step pipeline and optimize model selection (e.g., Gemini Flash for Synthesis).

---

# Sherpa MVP Backlog (Legacy/Base)


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
- [x] Task 17.5: **Unsaved Changes Guardian**: Global implementation of warnings before navigating away or switching tabs with unsaved modifications (Applied to: General, Assistant, Services).
- [x] Task 17.6: **Two-Stage Field Deletion**: Soft-delete UI for CRM fields and Service catalog items to prevent accidental data loss.
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

## Epic 20: Advanced Calendar Management & Agenda View
- [x] Task 20.1: **Action-Oriented Agenda Sort**: Implement default sorting as 'Upcoming First' (Soonest Ascending) and 'Past' (Recent Descending).
- [x] Task 20.2: **Calendar Tab System**: Implement a toggle or tabbed view to separate `[Upcoming]` and `[Past]` appointments to reduce visual noise.
- [ ] Task 20.3: **Global Calendar Filter Bar**: Implement a unified filter bar above the calendar with:
    - Fuzzy search for Client Name/Service/Notes.
    - Date Range picker with quick-select chips (Today, This Week, Next Month).
    - Status-based multi-select filter (Scheduled, Confirmed, Cancelled, Completed).
- [ ] Task 20.4: **Enhanced Sorting Controls**: Add interactive column headers (Event/Client, Date & Time, Status) to allow manual overrides of the default sort.

## Epic 21: Authentication Stability & Routing Hardening
- [x] Task 21.1: Fix "Ghost Sidebar" on landing page by making layout responsive to client-side auth state.
- [x] Task 21.2: Resolve stale server-side state during login redirection by forcing a router refresh.
- [ ] Task 21.3: Audit and fix hydration mismatches in authentication-dependent layout components.

## Epic 22: Modular "Plug & Play" Architecture
- [x] Task 22.1: Add `vertical_type` (BASIC, TRADE) to BusinessProfile (Admin-controlled).
- [x] Task 22.2: Implement 1:N `Agent` architecture to support specialized bots per vertical.
- [x] Task 22.3: Build "Universal Data Gateway" for CSV bulk imports and REST API ingestion.
- [x] Task 22.4: Implement Token-Aware Context Assembler (Prompt Pruning & Summarization Logic).

## Epic 23: Trade Vertical Implementation (Relational)
- [x] Task 23.1: Implement Store and Store_notes tables (Dossier System fully functional).
- [x] Task 23.2: Implement Orders, Products, and Categories tables for inventory tracking.
- [x] Task 23.2.1: Implement CRUD API for Stores, Categories, and Products.
- [x] Task 23.3: Implement Competitors and Customer_Notes tables.
- [x] Task 23.4: Create specialized "Visit Briefer" and "Lead Qualifier" agents for Trade users.
- [x] Task 23.5: Build Trade Dashboard UI (Stores, Categories, and Products management).

## Epic 24: Unified Trade CRM (Clean Relationship Model)
- [x] Task 24.1: Model Cleanup: Remove redundant `contact_name` and `contact_phone` from Store model; ensure strict `client_id` linking.
- [x] Task 24.2: Smart Store Modal: Implement "Quick Add Client" in the picker and remove manual Name/Phone inputs.
- [x] Task 24.3: Trade Hub "Retailers" View: Create a unified view in Trade Hub showing CRM clients associated with Stores.
- [x] Task 24.4: Client Profile Trade Context: Add a conditional "Trade Context" tab to the client profile showing Store notes and Orders.

## Epic 25: Trade Operational Loop (Commercial Lifecycle)
- [ ] Task 25.1: Build the "New Order" Modal with Product Search, Quantity selectors, and automatic total calculation.
- [ ] Task 25.2: Implement the "Competitor Check" UI within the Store Detail page to record rival presence levels.
- [ ] Task 25.3: Create the "Global Activity Feed" in the Trade Hub dashboard showing recent observations across all stores.
- [ ] Task 25.4: Design and implement the "Active Visit" mode (Check-in to Check-out progress stepper).

## Epic 26: Architectural Refactor - Dedicated Trade Views
- [x] Task 26.1: Navigation Refactor: Map Sidebar links directly to physical routes instead of query parameters.
- [x] Task 26.2: Dedicated Retailers View: Migrate CRM list logic to `/trade/retailers`.
- [x] Task 26.3: Dedicated Stores View: Migrate location management logic to `/trade/stores`.
- [x] Task 26.4: Trade Hub Dashboard: Refactor `/trade` into a high-level operational pulse (Dashboard).

## Epic 27: Multi-Retailer Stores & Inline Ops
- [x] Task 27.1: Many-to-Many Backend Refactor: Implement `store_clients` association table.
- [x] Task 27.2: Multi-Retailer UI: Implement tagging-style picker in StoreModal.
- [x] Task 27.3: Inline Store Editing: Enable auto-saving header inputs in Store Detail view.
- [x] Task 27.4: Enhanced Metadata: Add Health indicators and Retailer names to the Stores grid.

## Hard Constraints (Enforced)
- No Generic Drag-and-Drop Form Builders (Dynamic niche-attributes only).
- No Open-Ended Conversational AI (Strict scheduling and internal reporting focus).
- No Multi-branch setups.
- No Segmented Marketing CRM (Operational context only).
- No MercadoPago.
