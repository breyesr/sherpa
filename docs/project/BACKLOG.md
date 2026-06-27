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

## Epic 106: Vertical-Aware Prompt Orchestration (COMPLETE)
- [x] Task 106.1: Separate system prompts into `b2c_scheduler.j2` and `b2b_sales_brain.j2`.
- [x] Task 106.2: Refactor `AIService.get_response` to load templates based on `vertical_type`.
- [x] Task 106.3: Implement "Tool Masking" to hide B2B-specific tools from B2C (Basic) businesses.
- [x] Task 106.4: Remove hardcoded "Marco" persona and genericize `B2BOrchestrator` routing messages.

## Epic 107: Trade Schema Hardening & Draft Alignment (COMPLETE)
- [x] Task 107.1: Relational Hardening: Update `Store`, `Client`, and `Competitor` models with draft fields plus B-Tree indexes for fast regional filtering.
- [x] Task 107.2: Migration & Type Sync: Execute Alembic migrations and run `npm run gen:api` to synchronize the frontend TypeScript types.
- [x] Task 107.3: AI Prompt & Tool Enrichment: Update `b2b_sales_brain.j2` and `intent_classifier.j2` so the AI knows how to "Hybrid Search" the new fields.
- [x] Task 107.4: Progressive Disclosure UI: Update Store/Client modals in Next.js with a "Trade Details" section for mobile optimization.
- [x] Task 107.5: Ingestion Logic Update: Update `process_b2b_ingestion` task to automatically extract and populate these new fields from chat.
- [x] Task 107.6: Catalog Hardening: Update `Product`, `Category`, and `Order` models to align with the draft (Delivery IDs, Category Types, etc.).
- [x] Task 107.7: Dashboard Column Expansion: Update Stores and CRM tables to show Region, Segment, and Role columns in the main list views.
- [x] Task 107.8: Persona Serialization: Implement recursive `get_semantic_summary()` for B2B entities (Flattened Entity Mapping).
- [x] Task 107.9: Hybrid Search & RRF: Implement Parallel Keyword (FTS) + Semantic (pgvector) search with Reciprocal Rank Fusion (RRF).
- [x] Task 107.10: Async Vectorization: Implement Celery-driven background vector updates with Exponential Backoff reliability.
- [x] Task 107.11: Deterministic Knowledge Storage: Migrate to v5 UUIDs and deterministic UPSERTs for knowledge chunks (Idempotency).
- [x] Task 107.12: Account Intelligence Table: Create the "Fat Table" schema for Dossiers (Metadata, Playbook, Triggers, Context).
- [x] Task 107.13: Heuristic Inference Pipeline: Implement the logic that updates the Dossier Playbook and Triggers automatically from field reports.

## Epic 108: The Actionable Intelligence Ledger (Frictionless CRM)
**Objective**: Transition from purely narrative visit notes to a structured ledger of Marketing and Commercial actions, automatically extracted by AI to power management dashboards and future "Active AI" interventions.

- [x] Task 108.1: **Schema Implementation**: Create the `StoreAction` model with fields for `category` (MARKETING, COMMERCIAL), `objective` (THREAT_RESPONSE, ANNIVERSARY, etc.), `impact`, and `details` (JSONB).
- [x] Task 108.2: **AI Extraction Logic**: Update the `process_b2b_ingestion` pipeline to use a specialized LLM parsing step to identify and populate `StoreAction` records from raw chat notes.
- [x] Task 108.3: **Historical Backfill**: Re-process existing mock notes (from the last 60 days) into the new `StoreAction` table to ensure dashboards are populated.
- [ ] Task 108.4: **Dashboard API**: Create specialized endpoints for high-level reporting (e.g., actions by objective, visits per month, success rates).
- [ ] Task 108.5: **Opportunity Inbox**: Implement the AI-proposed action queue where the system surfaces recommended actions (e.g., from anniversary triggers or competitive threats) for Rep approval. *(Note: The Strategy Desk list view was delivered under Epic 121.4.)*
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
- [x] Task 111.5: **Global Filter Implementation**: Enable the AI to use the `metadata` JSONB column to filter discovery results by Region, Segment, or Role in a single query.
- [x] Task 111.6: **Hybrid Search (RRF) Integration**: Implement Parallel Keyword (FTS) + Semantic search on the unified corpus using Reciprocal Rank Fusion.

---

## Epic 112: The Trinity Intelligence Pipeline (SUPERSEDED — BENCHMARKING PENDING)
**Objective**: *(Original Trinity pipeline has been superseded by the LangGraph ReAct agent in Epic 117. The only remaining task is performance benchmarking of the new architecture.)*

- [x] Task 112.1: **Retriever Parallelization**: Refactor `GraphRAGService` to use `asyncio.gather` for simultaneous SQL (Factual) and Vector (Semantic) data retrieval.
- [x] Task 112.2: **The Synthesizer Prompt**: Develop `app/core/prompts/synthesizer.j2`, a flavorless, logic-driven template that merges raw data into a structured "Intelligence Dossier".
- [x] Task 112.3: **The Sherpa Persona Refactor**: Rewrite `app/core/prompts/visit_briefer.j2` to act as "The Voice", focusing exclusively on strategic framing based on the clean Synthesizer dossier.
- [x] Task 112.4: **Trinity Orchestration**: Implement the sequential flow: Fetch (Parallel) -> Synthesis (Flash Model) -> Persona Delivery (Capability Model).
- [x] Task 112.5: **Validation Guardrails**: Implement "Identity Locking" checks in the Synthesizer to ensure facts from different stores never bleed into the same dossier.
- [ ] Task 112.6: **ReAct Agent Benchmarking**: Quantify the multi-turn latency and token costs of the LangGraph ReAct loop. Optimize step limits and model routing to control SaaS margins.

---

## Epic 113: Relational Graph-Enriched RAG (APPROVED)
**Objective**: Evolve the GraphRAG engine by adding a structured **"Identity Link"** layer in Postgres. This allows the AI to perform high-precision multi-hop reasoning (e.g., following a contact across multiple stores) without the latency or infrastructure cost of a dedicated GraphDB.

**Strategic Guardrails**:
1. **Strict Hop Limit**: Graph traversals via SQL are capped at **2 levels** (e.g., Store -> Client -> Other Stores).
2. **Confidence Threshold**: Any AI-extracted link with a confidence score **< 0.85** is hidden from the retriever until confirmed.
3. **Isolation First**: Global discovery is strictly toggled; multi-hop results are **suppressed** during active visit sessions unless explicitly requested.
- [ ] Task 113.2: **Polymorphic Link Schema**: Create the `knowledge_links` table with fields for `source_corpus_id`, `target_entity_type`, `target_entity_id`, `confidence_score`, and `link_provenance`.
- [ ] Task 113.3: **High-Confidence Enrichment Pipeline**: Implement a Celery task using Gemini Flash to parse `KnowledgeCorpus` chunks and identify exact relational entity IDs.
- [ ] Task 113.4: **Precision Context Injection**: Refactor the Retriever to perform "Hard-Coded Lookups" for exact entity names found in the query, bypassing vector similarity for known nodes.
- [ ] Task 113.5: **Multi-Hop SQL Traversal**: Implement SQL CTEs for neighboring account discovery (Max 2 Hops) to connect disparate intelligence nodes (e.g., shared competitors or managers).
- [ ] Task 113.6: **Dynamic RRF Weighting**: Update Hybrid Search ranking to prioritize Relational Hits (2.0 weight) over Keyword (1.5) and Semantic (1.0) hits.

---

---

## Epic 118: Real-time Knowledge Sync & Auto-Vectorization (PLANNED)
**Objective**: Ensure the Knowledge Corpus stays synchronized with manual user actions in the dashboard, eliminating the need for manual backfills.

- [ ] Task 118.1: **API Hooking - Trade**: Update `POST /stores` and `POST /stores/{id}/notes` to trigger `sync_vector_task` on success.
- [ ] Task 118.2: **API Hooking - CRM**: Update `POST /clients` and `PATCH /clients/{id}` to trigger `sync_vector_task` for profile updates.
- [ ] Task 118.3: **Update Handling**: Implement logic to detect content changes and update existing vector entries in the `KnowledgeCorpus`.
- [ ] Task 118.4: **Deletion Cleanup**: Ensure that deleting a Store or Note also removes its corresponding entries from the `KnowledgeCorpus`.
- [ ] Task 118.5: **Worker Reliability**: Implement a dead-letter queue for failed vectorization tasks to prevent permanent data gaps.

---

## Epic 119: The Sherpa Ingestion Engine (V2)
**Objective**: Transition from beta placeholders to a high-end, high-volume bulk ingestion system that powers the Trade intelligence corpus.

- [ ] Task 119.1: **Guided Bulk Wizard**: Implement the 3-step UI (Upload -> AI-Assisted Mapping -> Conflict Resolution) with real-time progress feedback.
- [ ] Task 119.2: **Association Ingestion Logic**: Enhance the `Data Gateway` backend to handle bulk linking of Stores and Clients via `external_id` mapping.
- [ ] Task 119.3: **Deduplication & Conflict UI**: Build a side-by-side comparison interface for manual resolution of data collisions during import.
- [ ] Task 119.4: **Incremental Knowledge Sync**: Implement post-import hooks to trigger vector re-embedding for all newly ingested or modified entities.

---

## Epic 120: Surgical Trade Operations (The V2 Drawer System)
**Objective**: Overhaul the manual data entry experience with high-density, "Surgical" slide-over drawers and a centralized intelligence ledger.

- [x] Task 120.1: **Reusable V2 Drawer Component**: Implement the premium, slide-over foundation with high-density scroll areas and smooth animations.
- [x] Task 120.2: **Surgical Entity Drawers**: Implement the `AccountDrawer` and `ContactDrawer` for V2 list views, replacing legacy modals.
- [x] Task 120.3: **Unified Catalog Drawer**: Implement a single high-density drawer for managing both Categories and Products inline.
- [x] Task 120.4: **Field Note & Observation Drawer**: Build the combined capture flow for Narrative Notes and Competitor Intelligence.
- [x] Task 120.5: **Global Intelligence Pulse**: Implement the `/trade/v2/notes` page—a chronological, filterable ledger of all territory intelligence.
- [x] Task 120.6: **Transactional Order Drawer**: Build the surgical 3-step order entry flow (Header -> Line Items -> Summary).
- [x] Task 120.7: **Timeline Deep-Link**: Implement the "See all notes" redirect logic from Store/Contact profiles to the Global Pulse page with pre-applied filters.
- [x] Task 120.8: **Data Provenance & Verification UI**: Implement "Source" indicators and "Needs Review" highlighting for AI-extracted data in all V2 Drawers to handle future voice-note ingestion.

---

## Epic 121: Action Catalog & Accountability (The Strategy Desk)
**Objective**: Transition Store Actions from a static log into an active task desk, complete with a template catalog, owner assignment, due dates, and elastic outcome reporting.

- [x] Task 121.1: **Database Migrations & Models**: Define the `ActionTemplate` model and add status, assignee, deadline, result value, result unit, and template reference to `StoreAction`. Create the Alembic migration script.
- [x] Task 121.2: **Template & Action CRUD APIs**: Expose `GET/POST/PATCH/DELETE` for `/trade/action-templates` and query, assign, and resolution routes for `/trade/actions`.
- [x] Task 121.3: **Action Catalog Configuration (UI)**: Build a simple settings interface to define standard action templates (e.g. name, category, default result unit).
- [x] Task 121.4: **Strategy Desk & Detail Sheet (UI)**: Build the `/trade/actions` dashboard list. Implement a slide-over sheet to resolve tasks by inputting numerical results (using default template units) and logging execution notes.

---

## Epic 122: Route Consolidation & Core Dashboards (Products & Orders)
**Objective**: Clean up legacy route structures, promote the modern V2 layout as the system standard, and implement dedicated dashboard directories for Products and Orders.

- [x] Task 122.1: **Deprecate V1 Routes & Promote V2**: Delete legacy folders `stores/` and `retailers/`, rename V2 folders to standard routes, and update internal file navigation hooks in `Sidebar.tsx` and detail components.
- [x] Task 122.2: **Products Catalog Page & Details**: Implement the `/trade/products` list view, query the backend catalog, link it to the existing `CatalogDrawer`, and build a product detail slide-over.
- [x] Task 122.3: **Orders Ledger Page & Details**: Implement the `/trade/orders` ledger, query order statuses, integrate the existing `OrderDrawer` for new orders, and create a status timeline detail sheet.

## Epic 124: Agent Domain Boundaries & Transactional Tooling
**Objective**: Stabilize the B2B agent ("Marco") by implementing strict persona guardrails to prevent off-topic behavior and introducing structured SQL tools for accessing transactional data (orders) to prevent hallucinations during GraphRAG semantic searches.

- [x] Task 124.1: **Domain Boundary Enforcement**: Update Jinja prompt templates (`b2b_sales_brain.j2`) with strict instructions to politely reject non-business queries (e.g., recipes) and refocus the conversation on sales intelligence.
- [x] Task 124.2: **Transactional Tool Implementation**: Create a `get_recent_orders` method in `TradeToolKit` to execute a structured PostgreSQL lookup instead of relying on fuzzy semantic vector search.
- [x] Task 124.3: **Agentic Registration**: Register the `get_recent_orders` tool within `AgenticOrchestrator` to provide the LangGraph LLM planner immediate access to factual order data.

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

## Epic 114: Modern Account Intelligence UI (V2)
**Objective**: Overhaul the account management experience with a modern, high-density interface that surfaces pre-calculated Dossiers and actionable intelligence.

- [x] Task 114.1: **V2 Scaffolding**: Implement the modernized Account (Store) and Contact (Retailer) List and Detail pages under `/trade/v2/`.
- [x] Task 114.2: **Content-Aware Intelligence**: Implement intelligence extraction and filtering that surfaces Risks/Opps regardless of the primary note label.
- [x] Task 114.3: **People V2 Redesign**: Implement the high-end "Intelligence Dossier" for Contacts, featuring a unified context grid and dark-themed AI sidebar.
- [ ] Task 114.5: **Mobile-First Ingestion**: Optimize the note-taking flow for mobile users (Quick Actions).

## Epic 115: Proactive Utility-First Orchestration
- [x] Task 115.1: **Entity-First Resolution**: Refactor `orchestrator.py` to resolve Stores/Contacts independently of LLM intent classification.
- [x] Task 115.2: **Proactive Context Injection**: Automatically retrieve the Account Intelligence Dossier (Fat Table) as soon as an entity is resolved.
- [x] Task 115.3: **Multi-Mode Utility Logic**: Implement `utility_orchestrator.j2` to allow the AI to simultaneously brief, capture, and guide based on context.
- [x] Task 115.4: **Linguistic Flexibility Benchmarking**: Test against varied user styles (e.g., "Estoy con Maria", "Llegando", "Viendo a Carlos") to ensure zero-friction engagement.

## Epic 116: Agentic AI Transition (Thin Agent)
**Objective**: Replace the deterministic intent routing with an Agentic Loop (Thin Agent) to allow the AI to autonomously select and sequence tools.
- [x] Task 116.1: **Tool Decoupling**: Refactor `EntityResolver` and `GraphRAGService` into standalone LLM-compatible tools.
- [x] Task 116.2: **Thin Agent Implementation**: Update `B2BOrchestrator` to use a Two-Pass (Plan/Execute/Synthesize) workflow.
- [x] Task 116.3: **Tool Execution Layer**: Build the deterministic handler that executes the LLM's plan and aggregates results.
- [x] Task 116.4: **Persona Alignment**: Update `b2b_sales_brain.j2` to emphasize the proactive, analytical "Marco" persona.
- [x] Task 116.5: **Validation**: Performed end-to-end testing. Diagnostic revealed that the Thin Agent suffers from severe hallucination in tool arguments when faced with B2B conversational ambiguity.

## Epic 117: Agentic RAG Pivot (Full Agent & Unified Corpus)
**Objective**: Transition from the brittle "Thin Agent" to a self-correcting "Full Agent" (ReAct) and merge the static Dossier into the Knowledge Corpus to eliminate data silos and context failures.
- [x] Task 117.1: **Corpus Unification**: Write a migration script to inject `AccountIntelligence` dossiers into `KnowledgeCorpus` as high-priority "Summary Nodes".
- [x] Task 117.2: **Tool Consolidation**: Deprecate `get_account_dossier` and update `query_knowledge` to be the sole data retrieval tool for the Agent.
- [x] Task 117.3: **LangGraph Implementation**: Replace the custom orchestrator logic with a LangGraph state machine (ReAct pattern) to manage multi-tool loops and state persistence.
- [x] Task 117.4: **State & Memory Hardening**: Configure LangGraph Checkpoints (Postgres-backed) to ensure the agent can recover from failures and maintain long-term multi-turn state.
- [x] Task 117.5: **Validation**: Re-run the deep-dive diagnostic session to confirm 100% data retrieval and context retention.

## Epic 125: Dynamic Strategy & Global Playbooks
**Objective**: Transition the static, hardcoded Action Objectives and local-only templates into a dynamic, superadmin-configurable system framework. Allow the creation of global templates available system-wide, and dynamically adapt the AI classification engine to custom objectives.

- [ ] Task 125.1: **Database Schema Migration**: Create the `action_objectives` table, replace the Enum-based objective field in `StoreAction` with a foreign key to the new table, and make `ActionTemplate.business_id` nullable (`nullable=True`) to support global scoping. Implement Alembic migration script.
- [ ] Task 125.2: **Backend CRUD & Scoping APIs**: Implement standard CRUD endpoints for `/trade/action-objectives` (writes restricted to superadmins) and update `/trade/action-templates` scoping queries and permissions to allow superadmins to create/edit system-wide templates.
- [ ] Task 125.3: **Dynamic AI Ingestion Classification**: Modify the background Celery extraction jobs to query active `action_objectives` from the DB and dynamically inject them as classification options into the GraphRAG ingestion prompt context.
- [ ] Task 125.4: **Admin Management Console (UI)**: Build a Superadmin control panel under `/admin` in the frontend to manage Action Objectives (create, edit, toggle active status) and templates (set global/local scope).
- [ ] Task 125.5: **Strategy Desk Integration (UI)**: Refactor the Objective select dropdown and Template selector in the create action drawer to fetch dynamic values from the API and visually badge global templates with a "System" lock status.

## Epic 126: WhatsApp Lead Qualification Campaign (Meta Prospection)
**Objective**: Build a WhatsApp-based qualification flow using Twilio to collect prospective client details. The system uses a multi-turn LangGraph orchestrator to gather six key data points (Product, Quantity, Location, Phone, Email, Company). Leads meeting a per-product quantity threshold trigger an automated representative call task (assigned `StoreAction`), notifying the user that a rep will follow up. Leads below the threshold are sent physical store recommendations.

- [x] Task 126.1: **Database Schema & Migrations**: Add `wholesale_threshold` (Integer, nullable=True) to the `Product` model in `backend/app/models/trade.py`. Implement Alembic migration script and run the upgrade locally.
- [x] Task 126.2: **Frontend Type Synchronization**: Run `npm run gen:api` in the frontend to synchronize TypeScript API types with the new backend schema containing the product threshold.
- [x] Task 126.3: **Async Twilio Webhook Handler**: Create a dedicated FastAPI endpoint `/api/v1/whatsapp/webhook/twilio/prospect` that validates Twilio signatures, immediately returns a `200 OK` response to prevent timeouts, and enqueues a Celery task (`process_whatsapp_prospect_message`) for processing.
- [x] Task 126.4: **LangGraph Lead Qualifier Agent**: Implement the `ProspectQualifier` LangGraph state machine. It must maintain session state (via Postgres checkpointing), conduct multi-turn conversations to extract the 6 required data points (Product, Quantity, Location, Phone, Email, Company), and validate user input.
- [x] Task 126.5: **Qualification & Routing Logic**: Implement the threshold comparison logic. If quantity >= `wholesale_threshold`, create a `StoreAction` of category COMMERCIAL with details of the qualified lead, assign it to a rep, and notify the client that a rep will schedule a call with them. If below, query database store locations and reply with physical store addresses.
- [x] Task 126.6: **Product Threshold UI**: Add a field to the product creation/edit form in the Trade Dashboard UI to allow users to edit the per-product quantity threshold (`wholesale_threshold`).
- [x] Task 126.7: **End-to-End Integration Testing**: Write integration tests simulating the WhatsApp multi-turn webhook interaction, validating both the above-threshold (rep assignment) and below-threshold (store recommendation) flows.

## Epic 127: Modular Inbound Webhook Routing (Multi-Tenant Ingress)
**Objective**: Build a modular, identity-based routing architecture for inbound messages (WhatsApp/Telegram). Incoming messages are resolved using an identity resolver to identify if the sender is a prospective client, distributor/retailer, or sales representative. Admins can enable or disable these three flows per business profile using a JSON routing configuration. Messages are routed asynchronously to specialized Celery queues.

- [x] Task 127.1: **Database Schema & Migrations**: Add `routing_config` (JSON) to the `BusinessProfile` model, generate an Alembic migration script, and apply it locally.
- [x] Task 127.2: **Inbound Identity Resolution**: Create an `IdentityResolver` helper that parses phone numbers to resolve user roles (sales_rep, distributor_retailer, prospect) based on contact roles and store mappings.
- [x] Task 127.3: **Unified Ingress Webhook**: Overhaul `/webhook/twilio` in `app/api/whatsapp.py` to intercept all WhatsApp traffic, perform identity matching, check dynamic configuration toggles, reject disabled flows, and dispatch immediately to Celery.
- [x] Task 127.4: **Asynchronous Processing Pipelines**: Set up separate Celery tasks and task queues (`sales-reps`, `distributors`, `prospects`) to decouple processing of the three message flows.
- [x] Task 127.5: **Simulated Webhook Testing**: Write a simulation integration test suite to verify webhook execution under various routing toggle scenarios.

## Epic 128: Modular Feature Management (Admin Console Toggles)
**Objective**: Transition from rigid vertical options to a modular "Plug & Play" configuration toggled per user. Admins can enable or disable feature modules (Appointment Scheduler, Business Identity Suite, CRM, Trade Logistics, Sales Intelligence Coach) inside the "Save/Edit User" modal in the admin page, with backend feature-gating dependencies enforcing access limits.

- [x] Task 128.1: **Database Schema & Migrations**: Add `features_config` (JSON) to `BusinessProfile`, autogenerate the migration script (`9179bb59d515_add_features_config_to_businessprofile`), clean checkpointer drops, and apply it locally with a vertical-type preset data migration.
- [x] Task 128.2: **Backend Schema Validations**: Integrate `features_config` into business and user Pydantic schemas (`BusinessProfileBase`, `BusinessProfileUpdate`, `UserUpdate`, `UserCreateAdmin`, `BusinessProfileMinimal`).
- [x] Task 128.3: **Admin Endpoints Integration**: Update admin creation and edit controllers in `app/api/admin.py` to correctly populate and update `features_config` on the business profiles.
- [x] Task 128.4: **Feature Gating Dependency**: Implement a `require_feature` dependency guard in `app/api/auth.py` and enforce it at the router level in `app/api/trade.py` (and specifically on GraphRAG briefing routes).
- [x] Task 128.5: **Frontend Admin UI & Preset Templates**: Integrate checklist toggles in the Create/Edit user modal on `/admin/page.tsx` with dynamic presets based on the chosen template vertical.
- [x] Task 128.6: **Type Sync & Integration Testing**: Synchronize frontend Typescript API definitions (`npm run gen:api`) and verify endpoint constraints are validated using `/test-chat` simulation tests.
- [x] Task 128.7: **Remove Business Identity Suite Toggle from Admin UI**: Remove the toggle checkbox option from the User modal on `/admin/page.tsx` since business identity settings are a core mandatory prerequisite that should not be disableable by admins.

## Epic 129: Modular Trade Packaging & Decoupling
**Objective**: Refactor the rigid `trade_logistics` monolithic feature configuration into two decoupled modules (`campaign_flow` and `b2b_solutions`) to support precise tenant setups: Client A (Campaign only), Client B (B2B solutions only), Client C (Sales Coach only), or the full Trade Vertical. Remove the redundant `business_identity` toggle from the admin panel UI.

- [x] Task 129.1: **Backend Configs & Data Migration**: Split `trade_logistics` into `campaign_flow` and `b2b_solutions` keys in default config dicts (`DEFAULT_FEATURES_CONFIG`) and Pydantic schemas. Run a database script to safely upgrade existing business profiles' `features_config` JSON records.
- [x] Task 129.2: **Refined API Gating Guards**: Implement `require_any_feature` dependency guard in `app/api/auth.py`. Update FastAPI endpoints in `trade.py` and `whatsapp.py` to route based on individual feature toggles instead of the monolith.
- [x] Task 129.3: **Frontend Admin Modal & Preset Upgrades**: Refactor `/admin/page.tsx` user form presets. Replace `trade_logistics` checkbox with two distinct checkboxes for campaigns and B2B solutions. Remove the `business_identity` checkbox toggle.
- [x] Task 129.4: **Dynamic Sidebar Decoupling**: Update `Sidebar.tsx` to conditionally render Products, Accounts/Stores, Restock Orders, and Sales Intelligence links based on the new granular feature toggles.
- [x] Task 129.5: **Validation & Verification**: Sync OpenAPI typescript schemas and run integration tests to check modular permissions routing.

## Epic 130: Sandbox Simulators Debugging & Hardening
**Objective**: Fix looping, persistence, confidence, and log leak bugs inside Sandbox Simulators (Prospect and Sales Rep flows) to make testing reliable and accurate.

- [x] Task 130.1: **Prospect Simulator Loop Prevention**: Pre-check checkpointer state using `aget_state` to prevent overriding the `is_completed: True` flag. Bypasses model invocation once qualifier processes are finalized.
- [x] Task 130.2: **Prospect Simulator Inbox Logging**: Implement Conversation and Message database logging inside `ProspectQualifier.get_response` so that simulated campaign conversations automatically appear in the dashboard inbox.
- [x] Task 130.3: **Client Record Lead Qualification Update**: Modify `qualify_lead` to update pre-existing client placeholder records (name, email, company custom fields) when the lead is qualified, supporting seamless history tracking.
- [x] Task 130.4: **Entity Resolver Confidence Adjustments**: Fix confidence score logic in `EntityResolver.resolve_entities` to preserve `confidence: 0.9` and `source: "contact_name_match"` even if matched contacts do not have linked store relations.
- [x] Task 130.5: **Dashboard Inbox Logs Gating**: Wrap DevMode (Audit ON/OFF) button rendering in `ConversationsContent.tsx` with an `isAdmin` check, hiding system logs and purple "Brain Logic" trace boxes for regular users.
- [x] Task 130.6: **DB Vectorization Backfill**: Re-sync and backfill all populated store and client entity records into the `KnowledgeCorpus` vector database.
- [x] Task 130.7: **Fallback Messaging Stabilization**: Initialize `b2b_reasoning` to `None` inside `ai_service.py` to prevent potential `UnboundLocalError` crashes in non-B2B fallback routing flows.

---

## 🚫 Deprecated & Superseded Tasks (Audit Log)
The following tasks have been removed or deprecated from active epics because of recent architectural shifts (e.g. Unified Knowledge Corpus, LangGraph ReAct agent, Epic 121 completions):

1. **Task 106.5: Validate dual-mode logic (Ensure B2C flows maintain "Identity Gating" while B2B flows prioritize "Intelligence Ingestion")**
   * *Status:* **Removed**.
   * *Reason:* Decoupling is now enforced cleanly at the application routing and 1:N `Agent` architecture levels. Basic and Trade modes use entirely separate orchestrators, making this gate-checking validation redundant.
2. **Task 107.14: Strategic Coach Prompt: Rewrite `visit_briefer.j2` to use the "Cognitive Frame" assembly pattern (Strategy-First)**
   * *Status:* **Removed**.
   * *Reason:* Standalone `visit_briefer.j2` prompt is deprecated. Response synthesis is handled dynamically by the LangGraph agent prompt (`b2b_sales_brain.j2`) and retrieval tools.
3. **Task 113.1: The Identity Lock: Update `B2BOrchestrator` and `GraphRAGService` with an explicit `discovery_scope` (LOCAL | GLOBAL) to ensure data isolation during visits**
   * *Status:* **Removed**.
   * *Reason:* Dynamic Redis-based session isolation and context flushing completed in Epic 110.
4. **Task 114.4: Strategy Desk: Build the high-level dashboard for management reporting on Marketing and Commercial actions**
   * *Status:* **Removed**.
   * *Reason:* Fully built and delivered under Epic 121 (the `/trade/actions` list and outcome resolution UI).

---

## Epic 131: Prospect vs. Client Data Classification (COMPLETE)
**Objective**: Correctly classify and segment "Prospects" from actual "Clients" (Stores / Accounts) to prevent unconverted prospects from surfacing in the CRM/UI as active clients for the sales reps.

- [x] Task 131.1: **Database Model Upgrades**: Add `is_prospect = Column(Boolean, default=False, nullable=False)` to the `Store` and `Client` database models.
- [x] Task 131.2: **Alembic Migration & Schema Upgrades**: Generate and execute the Alembic migration script using `server_default=sa.text('false')` to safely update existing rows without constraint violations.
- [x] Task 131.3: **Pydantic Schema Integration**: Update `StoreBase`, `StoreUpdate`, `ClientMinimal`, `ClientBase`, and `ClientUpdate` schemas to include and expose `is_prospect`.
- [x] Task 131.4: **Lead Qualification Classification**: Set `is_prospect=True` on `Client` and `Store` during initial WhatsApp lead creation in `ProspectQualifier.get_response` and qualification in `qualify_lead`.
- [x] Task 131.5: **API Filtering**: Update `list_stores` and `get_clients` endpoints to support `is_prospect` filtering, defaulting to `False` (hiding prospects from standard active lists).
- [x] Task 131.6: **Frontend Types Generation**: Synchronize openapi spec and regenerate frontend API models using `npm run gen:api`.
- [x] Task 131.7: **Validation Suite**: Create and execute `test_prospect_classification.py` verifying full API and database classification isolation.
- [x] Task 131.8: **Frontend Prospects Dashboard**: Create the new Next.js page at `/trade/prospects` utilizing the contacts layout and querying the backend using `is_prospect=true` filtering.
- [x] Task 131.9: **Sidebar Navigation Integration**: Integrate the `• Prospects` navigation link in the B2B Hub section of `Sidebar.tsx`, and add dynamic "Back to Prospects" label resolution on the contact details page.
- [x] Task 131.10: **Store Deletion API**: Create `DELETE /trade/stores/{store_id}` endpoint in the backend and wire up `delete_vector_task` for clean RAG index purging.
- [x] Task 131.11: **Dashboard Delete Actions**: Add delete buttons with trash icons and confirm modal prompts on accounts, contacts, and prospects dashboard lists (grid & list views), and aggregated details views.

---

## Epic 132: Conversational Prospect Flow & Delivery Validation (COMPLETE)
**Objective**: Restructure the conversational prospect qualification flow in the WhatsApp campaign, enforcing sequential steps (intent capture -> quantity check -> lead data collection -> postal code validation -> handoff), resolving simulator reset issues for all users, and creating a unified dashboard action/notification mechanism.

- [x] Task 132.1: **Conversational Flow Restructuring**: Update `ProspectQualifier` to utilize a stateful phase tracking (`"intent"`, `"collecting"`, `"rehearsing"`, `"completed"`, `"rejected"`) and enforce that personal details are not requested until the quantity threshold check is passed.
- [x] Task 132.2: **ZIP Code Range Check (Cost-Zero)**: Implement postal code (CP) extraction and validation inside `qualify_lead`. Verify if the extracted CP falls inside the business profile's `routing_config` configured `allowed_zip_codes`.
- [x] Task 132.3: **Graceful Rejection Routing**: If the quantity threshold is not met, or if the postal code range validation fails, direct the user to the nearest physical store based on store address/city matching and immediately terminate the qualification flow.
- [x] Task 132.4: **Unified Sandbox & Production Reset Logic**: Enable greeting-based resets (e.g. "hola", "buen día") for all completed flows, allowing returning clients to place new material requests.
- [x] Task 132.5: **Lead Actions & Internal Notification Hook**: Implement automated `StoreAction` record creation upon successful qualification and wire it to a mocked SMS/email internal notification logger.
- [x] Task 132.6: **End-to-End Integration Testing**: Add test coverage to verify low-quantity routing, invalid postal code routing, valid qualification flow, and returning user resets.

---

## Epic 133: Structured Store Addresses & SEPOMEX Postal Preloading (COMPLETE)
**Objective**: Refactor store addresses into structured fields, create a pre-seeded Mexican postal codes lookup database table for automatic validation and autocomplete, and build the corresponding UI fields in the account creation drawer.

- [x] Task 133.1: **Database Schema Refactoring**: Define the `PostalCode` model and add `street_address`, `colonia`, `municipality`, `city`, `state`, `zip_code`, and `country` fields to the `Store` database model.
- [x] Task 133.2: **Alembic Migration**: Generate and execute schema migration parsing existing unstructured address strings into new columns.
- [x] Task 133.3: **SEPOMEX High-Density Seeding**: Preload SEPOMEX key region codes into the `postal_codes` lookup table (expanded to include comprehensive key municipalities and zip codes for CDMX, Nuevo León, Jalisco, Veracruz, Oaxaca, Puebla, Querétaro, and Yucatán).
- [x] Task 133.4: **Backend Autocomplete APIs**: Expose GET `/api/v1/trade/postal-codes/{zip_code}` endpoint and update store CRUD controllers and schemas.
- [x] Task 133.5: **Frontend Account Drawer Autocomplete**: Integrate structured inputs and automatic location filling inside the Account Drawer component.
- [x] Task 133.6: **Verification & Test Execution**: Verify Next.js compilation and integration tests are passing.

---

## Epic 134: Out-of-Coverage Waitlist Lead Capture (Prospect Flow Upgrade)
**Objective**: Transition from hard rejection of out-of-coverage prospects to an opt-in waitlist lead capture flow. Out-of-coverage prospects are prompted for contact details (name, email, phone, company) to be registered in the CRM with a `status: "waitlist"` flag, preserving leads and mapping geographic demand.

- [x] Task 134.1: **Waitlist Flow Phase Tracking**: Update `ProspectQualifierState` to support `collecting_waitlist` phase. Update `call_model` state machine prompts inside `prospect_qualifier.py` to prompt for contact details if a prospect is out of coverage.
- [x] Task 134.2: **Waitlist DB Persistence**: Update `run_tools_and_update_state` and `qualify_lead` nodes to transition to waitlist collection if coverage check fails. If they have already provided details (or once they do), write them to the CRM (database) as a prospect Client and Store with `status: "waitlist"` and `lead_source: "WhatsApp Prospection - Lista de Espera"`.
- [x] Task 134.3: **Integration Testing Suite Upgrades**: Update `test_simulated_session_3.py` (specifically Scenario 2) to assert that out-of-coverage prospects are collected and saved as waitlist leads in the database.
- [x] Task 134.4: **Verify & Validate Flow**: Run tests to ensure all scenarios pass and the frontend compiles successfully.

---

## Epic 135: Information Architecture & Navigation Realignment
**Objective**: Restructure the frontend navigation hierarchy and UI segmentation to align data representation with user segments (B2B Distributor vs. Campaign Prospects), ensuring clear role clarity and workflow segmentation.

- [x] Task 135.1: **Sidebar Route Restructuring**: Update `Sidebar.tsx` to display three segmented groups: B2B Hub (Accounts, Clients, Orders, Actions), Prospects (Accounts, Contacts), and Products (Categories, Products).
- [x] Task 135.2: **Data Filtering Segregation**: Configure dashboard views for B2B Hub (Accounts/Clients) and Prospects (Accounts/Contacts) to query endpoints using `is_prospect=false` and `is_prospect=true` filters respectively.
- [x] Task 135.3: **UI Terminology Unification**: Align the dashboard tables and drawers so that `Client` models are rendered as "Clients" inside B2B Hub but as "Contacts" inside the Prospects dashboard.
- [x] Task 135.4: **Build & Compile Verification**: Validate route changes and ensure Next.js compiles with zero runtime link warnings or missing page type errors.

---

## Epic 136: Twilio Integration Compliance, Status Tracking & Verification
**Objective**: Enhance the Twilio/WhatsApp integration with explicit compliance opt-in capturing, webhook signature validation, real-time connection health checks, and user-facing connection state / error diagnostics.

- [x] Task 136.1: **Compliance Opt-in UI**: Add explicit compliance notice text and a mandatory opt-in checkbox to the WhatsApp connection modal (`WhatsAppModal.tsx`) to satisfy Twilio/WhatsApp legal policies.
- [x] Task 136.2: **Compliance DB Storage**: Add `whatsapp_opt_in: Boolean` and `whatsapp_opt_in_at: DateTime` columns to the `Client` database model and generate the corresponding database schema migration script.
- [x] Task 136.3: **Webhook Request Validation**: Implement Twilio signature verification utility for webhook endpoints (`/api/v1/whatsapp/webhook/twilio`) to ensure only authentic requests originating from Twilio are processed.
- [x] Task 136.4: **Connection Status webhooks & Health Checks**: Implement active status ping checks against Twilio API resources to verify connectivity.
- [x] Task 136.5: **User-facing Connection Diagnostics**: Enhance error presentation on settings panel integration drawers, displaying detailed verification failures or connection API disconnect reasons to the user.

---

## Epic 137: Channel Alignment & Identity-Based Routing for Telegram
**Objective**: Unify the messaging infrastructure by implementing identity-based routing on Telegram. Incoming Telegram messages will resolve using the `IdentityResolver` and route dynamically to the B2B Sales Rep (Orchestrator), Distributor, or Prospect Qualifier flow depending on the resolved role, matching the WhatsApp channel behavior.

- [x] Task 137.1: **Telegram Webhook Identity Resolution**: Integrate `IdentityResolver.resolve_sender` in `app/api/telegram.py` to identify the sender's role (`sales_rep`, `distributor_retailer`, or `prospective_client`) on Telegram.
- [x] Task 137.2: **Dynamic Flow Routing in AI Service**: Update `app/core/ai_service.py` to check the client's role and metadata flow configurations, running the LangGraph Sales Rep orchestrator (`b2b_sales_brain.j2`) only when the sender is a verified `sales_rep`.
- [x] Task 137.3: **Prospect & Distributor Routing for Telegram**: Connect Telegram to the `ProspectQualifier` flow for prospects, and a standard helper prompt for distributors.
- [x] Task 137.4: **Validation & Verification**: Verify routing behavior and ensure test suite runs cleanly.

---

## Epic 138: Prospect-to-Store Redirection & Value Tracking
**Objective**: Build a structured database redirection mapping and request value tracking between Campaign Prospects (`is_prospect = True`) and authorized physical stores. Track the referred date, target store, requested product/quantity, and estimated potential value, and expose these referral connections in the prospect drawers and store details dashboards with role-based masking.

- [ ] Task 138.1: **Database Schema Migration & Audit Log**: Create a self-referential `assigned_store_id` relationship on `Store`, and add `requested_product_id` (ForeignKey to products), `requested_quantity` (Integer), `potential_value` (Float), and `referred_at` (DateTime) columns. Implement the `ClientStoreHistory` audit logging table to track reassignments.
- [ ] Task 138.2: **Lead Qualification Value Ingestion**: Update `qualify_lead` in `prospect_qualifier.py` to write the resolved `matched_store_id`, `product_id`, `quantity`, `referred_at`, and calculated `potential_value` (`qty * product.price`) into the prospect's newly created `Store` record.
- [ ] Task 138.3: **API Schema & Validation Setup**: Update schemas in `schemas/trade.py` and endpoints in `api/trade.py` to accept, return, and update `assigned_store_id`, `requested_product_id`, `requested_quantity`, `potential_value`, and `referred_at`, enforcing multi-tenant verification and circular reference checks.
- [ ] Task 138.4: **Dashboard Referral Logs & KPI Expose**: Add a "Referrals" dashboard tab inside the Store details page to render a list of assigned prospects (showing date, product, quantity, and lead value, with PII masking gates for distributors), along with a Total Referral Pipeline Value KPI metric.
- [ ] Task 138.5: **API Type Regeneration & Compile Check**: Update OpenAPI definitions, regenerate frontend types, and verify the production build succeeds.

---

## Epic 139: Prospects Segmentation & Retail Referrals
**Objective**: Introduce dynamic segmentation to group campaign prospects into Wholesale Leads or Retail Referrals. Modify the prospect qualifying flow to capture retail leads in the CRM database, re-route them to physical stores, and expose them as separate Wholesale vs. Retail listings in the navigation sidebar and views.

- [ ] Task 139.1: **Database Schema & Segment Migration**: Add a `prospect_segment` column (VARCHAR, default "wholesale", indexed) to both `Client` and `Store` tables. Create Alembic migration script to default all existing rows to "wholesale".
- [ ] Task 139.2: **API Filters & Pydantic Schema Integration**: Update `schemas/trade.py` and `schemas/crm.py` schemas to include `prospect_segment`. Extend GET `/trade/stores` and `/clients` to accept and validate the `prospect_segment` query filter parameter.
- [ ] Task 139.3: **Lead Qualification Flow Segmentation**: Update `ProspectQualifier` (prospect_qualifier.py) to ask for contact details (name, email) for below-threshold retail leads, saving them with `is_prospect=True` and `prospect_segment="retail"`, and assigned to the matched store.
- [ ] Task 139.4: **Sidebar Restructure & List Filtering**: Update `Sidebar.tsx` to separate Prospects into "Wholesale" and "Retail Referrals" headings, mapping navigation links to corresponding segment query parameters. Update React Query keys in account/contact lists to support dynamic query invalidation.
- [ ] Task 139.5: **Test Suite Alignment**: Refactor `test_whatsapp_campaign.py` and `test_simulated_session_3.py` assertions to expect retail lead CRM generation instead of immediate session termination, verifying all test validations pass.
- [ ] Task 139.6: **Type Regeneration & Build Verification**: Update OpenAPI definitions, regenerate frontend TypeScript types, and verify production build compilation.



