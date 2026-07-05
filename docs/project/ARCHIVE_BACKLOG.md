# Archived Backlog

Completed epics moved from `docs/project/BACKLOG.md` on 2026-07-03.

## Sherpa B2B Sales Intelligence Pivot (PRIMARY)

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

## Epic 112: The Trinity Intelligence Pipeline (COMPLETE)
**Objective**: *(Original Trinity pipeline has been superseded by the LangGraph ReAct agent in Epic 117. Performance optimization and pruning has been successfully resolved.)*

- [x] Task 112.1: **Retriever Parallelization**: Refactor `GraphRAGService` to use `asyncio.gather` for simultaneous SQL (Factual) and Vector (Semantic) data retrieval.
- [x] Task 112.2: **The Synthesizer Prompt**: Develop `app/core/prompts/synthesizer.j2`, a flavorless, logic-driven template that merges raw data into a structured "Intelligence Dossier".
- [x] Task 112.3: **The Sherpa Persona Refactor**: Rewrite `app/core/prompts/visit_briefer.j2` to act as "The Voice", focusing exclusively on strategic framing based on the clean Synthesizer dossier.
- [x] Task 112.4: **Trinity Orchestration**: Implement the sequential flow: Fetch (Parallel) -> Synthesis (Flash Model) -> Persona Delivery (Capability Model).
- [x] Task 112.5: **Validation Guardrails**: Implement "Identity Locking" checks in the Synthesizer to ensure facts from different stores never bleed into the same dossier.
- [x] Task 112.6: **ReAct Agent Benchmarking**: Quantify the multi-turn latency and token costs of the LangGraph ReAct loop. Optimize step limits and model routing to control SaaS margins.

---

## Epic 118: Real-time Knowledge Sync & Auto-Vectorization (COMPLETE)
**Objective**: Ensure the Knowledge Corpus stays synchronized with manual user actions in the dashboard, eliminating the need for manual backfills.

- [x] Task 118.1: **API Hooking - Trade**: Update `POST /stores` and `POST /stores/{id}/notes` to trigger `sync_vector_task` on success.
- [x] Task 118.2: **API Hooking - CRM**: Update `POST /clients` and `PATCH /clients/{id}` to trigger `sync_vector_task` for profile updates.
- [x] Task 118.3: **Update Handling**: Implement logic to detect content changes and update existing vector entries in the `KnowledgeCorpus`.
- [x] Task 118.4: **Deletion Cleanup**: Ensure that deleting a Store or Note also removes its corresponding entries from the `KnowledgeCorpus`.
- [x] Task 118.5: **Worker Reliability**: Implement a dead-letter queue for failed vectorization tasks to prevent permanent data gaps.

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


## Sherpa MVP Backlog (Legacy/Base)

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

- [x] Task 138.1: **Database Schema Migration & Audit Log**: Create a self-referential `assigned_store_id` relationship on `Store`, and add `requested_product_id` (ForeignKey to products), `requested_quantity` (Integer), `potential_value` (Float), and `referred_at` (DateTime) columns. Implement the `ClientStoreHistory` audit logging table to track reassignments.
- [x] Task 138.2: **Lead Qualification Value Ingestion**: Update `qualify_lead` in `prospect_qualifier.py` to write the resolved `matched_store_id`, `product_id`, `quantity`, `referred_at`, and calculated `potential_value` (`qty * product.price`) into the prospect's newly created `Store` record.
- [x] Task 138.3: **API Schema & Validation Setup**: Update schemas in `schemas/trade.py` and endpoints in `api/trade.py` to accept, return, and update `assigned_store_id`, `requested_product_id`, `requested_quantity`, `potential_value`, and `referred_at`, enforcing multi-tenant verification and circular reference checks.
- [x] Task 138.4: **Dashboard Referral Logs & KPI Expose**: Add a "Referrals" dashboard tab inside the Store details page to render a list of assigned prospects (showing date, product, quantity, and lead value, with PII masking gates for distributors), along with a Total Referral Pipeline Value KPI metric.
- [x] Task 138.5: **API Type Regeneration & Compile Check**: Update OpenAPI definitions, regenerate frontend types, and verify the production build succeeds.

---

## Epic 139: Prospects Segmentation & Retail Referrals
**Objective**: Introduce dynamic segmentation to group campaign prospects into Wholesale Leads or Retail Referrals. Modify the prospect qualifying flow to capture retail leads in the CRM database, re-route them to physical stores, and expose them as separate Wholesale vs. Retail listings in the navigation sidebar and views.

- [x] Task 139.1: **Database Schema & Segment Migration**: Add a `prospect_segment` column (VARCHAR, default "wholesale", indexed) to both `Client` and `Store` tables. Create Alembic migration script to default all existing rows to "wholesale".
- [x] Task 139.2: **API Filters & Pydantic Schema Integration**: Update `schemas/trade.py` and `schemas/crm.py` schemas to include `prospect_segment`. Extend GET `/trade/stores` and `/clients` to accept and validate the `prospect_segment` query filter parameter.
- [x] Task 139.3: **Lead Qualification Flow Segmentation**: Update `ProspectQualifier` (prospect_qualifier.py) to ask for contact details (name, email) for below-threshold retail leads, saving them with `is_prospect=True` and `prospect_segment="retail"`, and assigned to the matched store.
- [x] Task 139.4: **Sidebar Restructure & List Filtering**: Update `Sidebar.tsx` to separate Prospects into "Wholesale" and "Retail Referrals" headings, mapping navigation links to corresponding segment query parameters. Update React Query keys in account/contact lists to support dynamic query invalidation.
- [x] Task 139.5: **Test Suite Alignment**: Refactor `test_whatsapp_campaign.py` and `test_simulated_session_3.py` assertions to expect retail lead CRM generation instead of immediate session termination, verifying all test validations pass.
- [x] Task 139.6: **Type Regeneration & Build Verification**: Update OpenAPI definitions, regenerate frontend TypeScript types, and verify production build compilation.

---

## Epic 140: Feature-Bound Access Control & Intake Alignment
**Objective**: Restrict user access in the Live Test Sandbox, Telegram, and WhatsApp channels to only the flows they are explicitly licensed for in their `features_config` (e.g. limiting prospect interactions for businesses without the `campaign_flow` feature).

- [x] Task 140.1: **Sandbox /test-chat Feature Guardrails**
  * **Description**: Modify the backend `/test-chat` route in `backend/app/api/business.py` to check the business profile's `features_config` in addition to its `routing_config`. Block simulation requests for roles that do not have their corresponding feature flag enabled.
  * **Acceptance Criteria**:
    * *Given* a business profile with `features_config.campaign_flow.enabled = False` and `routing_config.prospective_clients.enabled = True`,
    * *When* a POST request is sent to `/test-chat` with `simulate_role: "prospective_client"`,
    * *Then* the endpoint returns `{"response": "Este servicio no está habilitado actualmente para este número en la configuración de la empresa."}`.

- [x] Task 140.2: **Webhook Routing Alignment (Telegram)**
  * **Description**: Modify the Telegram webhook handler in `backend/app/api/telegram.py` to cross-reference resolved sender roles with `features_config` flags. Reject incoming messages if the corresponding feature is disabled.
  * **Acceptance Criteria**:
    * *Given* a business profile with `features_config.campaign_flow.enabled = False`,
    * *When* an incoming message is received on Telegram from a chat ID that resolves to a `prospective_client`,
    * *Then* the Telegram handler intercepts the request and sends back a message: `"Este servicio no está habilitado actualmente para este número."`.

- [x] Task 140.3: **Webhook Routing Alignment (WhatsApp)**
  * **Description**: Modify the WhatsApp webhook handler in `backend/app/api/whatsapp.py` to cross-reference resolved sender roles with `features_config` flags. Reject incoming messages if the corresponding feature is disabled.
  * **Acceptance Criteria**:
    * *Given* a business profile with `features_config.b2b_solutions.enabled = False`,
    * *When* an incoming webhook message is received on WhatsApp from a sender that resolves to a `distributor_retailer`,
    * *Then* the webhook handler intercepts the message and returns a Twilio TwiML response containing `"Este servicio no está habilitado actualmente para este número."`.

- [x] Task 140.4: **Frontend Sandbox UI Feature Filtering**
  * **Description**: Update the Live Test Sandbox rendering in `AssistantSettings.tsx` to read the business profile's `features_config` and conditionally render option tags in the role selector. Hide or disable role options if the associated feature is disabled.
  * **Acceptance Criteria**:
    * *Given* a logged-in user whose business profile has `features_config.b2b_solutions.enabled = False` and `features_config.campaign_flow.enabled = True`,
    * *When* they navigate to the Assistant Settings panel,
    * *Then* the Live Test Sandbox role dropdown renders the `"Simulate Prospect"` and `"Simulate Sales Rep"` options, but does NOT render the `"Simulate Distributor"` option.

- [x] Task 140.5: **Business Profile Routing Config Initialization**
  * **Description**: Create a backend helper that yields default `routing_config` blocks per vertical (e.g. enabling prospects, distributors, and reps for `TRADE`), and invoke it during initial `BusinessProfile` instantiation points in `admin.py` and `business.py`.
  * **Acceptance Criteria**:
    * *Given* a new user registration or admin user creation specifying `vertical_type: "TRADE"`,
    * *When* the profile is created in the database,
    * *Then* the `routing_config` JSON column is initialized with `"prospective_clients": {"enabled": true}`, `"distributors_retailers": {"enabled": true}`, and `"sales_reps": {"enabled": true}` instead of `{}`.

- [x] Task 140.6: **Admin Upgrade Path Alignment**
  * **Description**: Update the PATCH `/admin/users/{user_id}` route in `admin.py` to ensure that when a user's vertical is promoted (e.g. `BASIC` to `TRADE`), their `routing_config` is upgraded with the corresponding B2B routing keys.
  * **Acceptance Criteria**:
    * *Given* an existing user profile with `vertical_type: "BASIC"` and `routing_config = {"prospective_clients": {"enabled": true}}`,
    * *When* the admin updates the user's vertical to `"TRADE"`,
    * *Then* the database profile is patched and `routing_config` is upgraded to include `"distributors_retailers": {"enabled": true}`.

- [x] Task 140.7: **Alembic Data Migration**
  * **Description**: Create a data migration script inside Alembic to backfill all existing business profile rows, populating `routing_config` with vertical-specific defaults if currently `NULL` or `{}`.
  * **Acceptance Criteria**:
    * *Given* existing profiles in the database with empty or `NULL` routing configurations,
    * *When* the Alembic upgrade script is run,
    * *Then* all rows are successfully populated with their corresponding vertical defaults and no data is lost.

- [x] Task 140.8: **Integration Testing & Verification Suite**
  * **Description**: Add integration tests asserting that the Sandbox, Telegram, and WhatsApp endpoints successfully reject messages for roles whose feature flags are disabled. Also assert that new user registration and vertical promotion successfully populate routing configurations.
  * **Acceptance Criteria**:
    * *Given* the test suite environment,
    * *When* running the testing suite,
    * *Then* all feature-bound restriction, profile initialization, and vertical migration scenarios pass cleanly.

---

## Epic 150: Infrastructure Staging Hardening & Cost Optimization
**Objective**: Optimize the Railway staging environment resources to reduce monthly billing while preserving performance and reliability.

- [x] Task 150.1: **Restrict Celery Worker Concurrency**
  * **Description**: Update the Celery worker command in `backend/Procfile` and `docker-compose.yml` to specify `--concurrency=1`, `--max-tasks-per-child=50`, and `--prefetch-multiplier=1`. This will limit memory overhead and prevent memory leaks.
  * **Acceptance Criteria**:
    * *Given* the worker configuration in staging,
    * *When* Celery is launched,
    * *Then* the process pool count is limited to 1, and child workers recycle after executing 50 tasks.

- [x] Task 150.2: **Implement Conditional Connection Pooling & Disable SQL Echo**
  * **Description**: Update `backend/app/core/database.py` to use `QueuePool` with sensible limits for the API server, but keep `NullPool` for worker processes to prevent pre-fork socket sharing issues. Disable SQL echo in staging/production (`echo=False`) to reduce logging overhead.
  * **Acceptance Criteria**:
    * *Given* the database engine configuration,
    * *When* running in the API server context,
    * *Then* a connection pool is initialized.
    * *When* running in a Celery worker context,
    * *Then* connection pooling is disabled (`NullPool`).
    * *Then* SQLAlchemy logs are not printed to stdout in staging/production.

- [x] Task 150.3: **Optimize Celery Result Expiration & Polling Chatter**
  * **Description**: Configure `task_ignore_result = True` by default in `celery_app.py`, set a low expiration (`result_expires = 1800`), and configure `broker_transport_options` with a `polling_interval` of 5.0 seconds.
  * **Acceptance Criteria**:
    * *Given* Celery broker transport configuration,
    * *When* the worker is running idle,
    * *Then* it polls Redis at 5-second intervals, reducing Redis CPU load.

- [x] Task 150.4: **Next.js Standalone Build**
  * **Description**: Configure Next.js standalone output in `frontend/next.config.js` to build a minimal standalone node application, reducing runtime memory footprint.
  * **Acceptance Criteria**:
    * *Given* Next.js compilation,
    * *When* running `npm run build`,
    * *Then* the compiler outputs a standalone build target in `.next/standalone/server.js`.

- [x] Task 150.5: **Configure Railway CPU/RAM Limits and Sleep on Idle**
  * **Description**: Apply resource limits (512MB RAM for worker, API, frontend, postgres; 256MB RAM for Redis) and enable "Sleep on Idle" for the web and API services in the Railway dashboard settings.
  * **Acceptance Criteria**:
    * *Given* the Railway staging console,
    * *When* no developer is active,
    * *Then* the frontend and API containers spin down to sleep.


- [x] Task 150.6: **Celery Queue Isolation Setup**
  * **Description**: Configure Celery settings in `celery_app.py` to define two distinct queues (`fast_queue` and `slow_queue`). Route short I/O tasks (`send_upcoming_reminders`, `sync_all_calendars`) to `fast_queue` and heavy AI tasks (`ingestion`, `knowledge`) to `slow_queue`.
  * **Acceptance Criteria**:
    * *Given* a task dispatcher context,
    * *When* `sync_single_calendar` is dispatched,
    * *Then* it is routed to the `fast_queue`.
    * *When* a GraphRAG knowledge extraction task is dispatched,
    * *Then* it is routed to the `slow_queue`.

- [x] Task 150.7: **Configure Horizontal Production Procfile**
  * **Description**: Update production deployment settings to start separate worker processes targeting specific queues with customized concurrency constraints (`--concurrency=4` for fast queue and `--concurrency=1` for slow queue).
  * **Acceptance Criteria**:
    * *Given* the production environment,
    * *When* the Celery workers are launched,
    * *Then* the fast workers process tasks from `fast_queue` with concurrency 4, and the slow workers process tasks from `slow_queue` with concurrency 1.
---

## Epic 151: Simplified Admin User Provisioning & Feature Layout Alignment
**Objective**: Streamline the Admin User Provisioning modal layout to use progressive disclosure, hiding core features and conditionally showing B2B sub-features only when B2B (Trade) is active, while updating feature labels for clarity.

<<<<<<< HEAD
- [x] Task 151.1: **Define B2B Sub-Feature Conditional Rendering**
  * **Description**: Modify the Admin User Modal in `frontend/app/(admin)/admin/page.tsx` to conditionally render Section 3 (Modular B2B Features) only if `vertical_type === 'TRADE'`. If `vertical_type === 'BASIC'`, render a read-only list of core included features (Appointment Scheduler & CRM).
  * **Acceptance Criteria**:
    * *Given* the Admin User Modal is open,
    * *When* vertical type is "B2C (Basic)",
    * *Then* Section 3 displays the read-only core features and hides the B2B toggles.
    * *When* vertical type is "B2B (Trade)",
    * *Then* Section 3 displays the three modular toggles.

- [x] Task 151.2: **Refine Feature Labels & Descriptions**
  * **Description**: Rename labels and descriptions in Section 3 of the Admin User Modal to use clear B2B terminology: "Automated Intake & Campaigns", "Store Routing & Order Logistics", and "Sales Intelligence & AI Briefs".
  * **Acceptance Criteria**:
    * *Given* B2B toggles are displayed,
    * *When* the admin views the labels,
    * *Then* they see the updated labels and their corresponding B2B-centric descriptions.

- [x] Task 151.3: **Simplify State and Preset Bindings**
  * **Description**: Remove individual "Appointment Scheduler" and "CRM Suite" toggles from Section 3 since they are core features. Ensure they are automatically set to `enabled: true` in the backend payload on save.
  * **Acceptance Criteria**:
    * *Given* any vertical selection,
    * *When* saving the user features,
    * *Then* `scheduling` and `crm_suite` are always sent as `{ enabled: true }` in `features_config` to the backend.

---

## Epic 152: Dual-Vertical Sandbox & Webhook Gating Alignment
**Objective**: Explicitly introduce the `customer` role for B2C end consumers to separate B2C scheduling/catalog interactions from B2B wholesale pipelines, dynamically gating webhooks and sandbox configurations.

- [x] Task 152.1: **Define B2C Customer Role in Identity Resolver**
  * **Description**: Modify `IdentityResolver.resolve_sender` in `backend/app/services/identity_resolver.py`. If `vertical_type == 'BASIC'`, resolve unknown or standard contacts as `"customer"` instead of `"prospective_client"`.
  * **Acceptance Criteria**:
    * *Given* a business with vertical `BASIC`,
    * *When* a message is received from a phone that is not a registered sales rep/staff,
    * *Then* `resolve_sender` returns `("customer", client)`.

- [x] Task 152.2: **Dynamic Frontend Sandbox Dropdown Gating (B2C vs B2B)**
  * **Description**: Refactor the role simulator selector in `AssistantSettings.tsx` to inspect `vertical_type`. If `BASIC`, display only the option **"Simulate Customer"** (value: `customer`). If `TRADE`, dynamically display **"Simulate Prospect (Wholesale Lead)"** (value: `prospective_client`, gated by `campaign_flow`), **"Simulate Distributor (Store Client)"** (value: `distributor_retailer`, gated by `b2b_solutions`), and **"Simulate Sales Rep (Field Agent)"** (value: `sales_rep`, gated by `sales_intelligence`).
  * **Acceptance Criteria**:
    * *Given* a B2C (BASIC) account,
    * *When* the admin opens the settings sandbox,
    * *Then* they only see "Simulate Customer" and selecting it sends `simulate_role: "customer"`.
    * *Given* a B2B (TRADE) account,
    * *When* the admin opens the settings sandbox,
    * *Then* only enabled B2B role options are rendered.

- [x] Task 152.3: **Vertical-Aware Webhook Feature Gates (Telegram & WhatsApp)**
  * **Description**: Update `telegram.py` and `whatsapp.py` webhook handlers.
    * For `customer`: Allow if `vertical_type == 'BASIC'` and core `scheduling` is enabled. Routes to B2C scheduler/catalog response.
    * For `prospective_client`: Gated strictly by B2B `campaign_flow`.
    * For `distributor_retailer`: Gated strictly by B2B `b2b_solutions`.
    * For `sales_rep`: Gated strictly by B2B `sales_intelligence`.
  * **Acceptance Criteria**:
    * *Given* a B2C profile,
    * *When* a customer messages,
    * *Then* the message is processed successfully by the scheduler AI.
    * *Given* a B2B profile,
    * *When* a customer/prospect messages,
    * *Then* it is gated by `campaign_flow`.

- [x] Task 152.4: **Verification & Test Realignment**
  * **Description**: Update the test cases in `backend/test_sandbox_gates.py` to cover the new `customer` role, B2C vertical gating, and correct routing.
  * **Acceptance Criteria**:
    * *Given* the integration test suite,
    * *When* running pytest,
    * *Then* all tests pass cleanly.

---

## Epic 141: B2C Product & Category Catalog Activation & UI Gating
**Objective**: Activate the products and categories catalog for B2C (BASIC) vertical users by reusing the shared `Product` and `Category` database models and tables, while dynamically adapting the frontend catalog page, sidebar menu options, and edit drawer layouts to hide B2B-only attributes (such as wholesale quantity thresholds, manufacturer brands, and distribution metrics). Additionally, support admin-controlled toggles to enable or disable the Services Catalog (for B2C) and the Products Catalog (for B2C and B2B).

- [x] Task 141.1: **Map B2C Product and Category Sidebar Links, Feature Gate Sidebar Menus, & Standardize Side Menu Look & Feel**
  * **Description**: 
    1. Wire the B2C sidebar menu links for `Category (pending)` and `Products (pending)` in `Sidebar.tsx` to active routes `/trade/products?tab=categories` and `/trade/products?tab=products` respectively, removing the "Pending" tag. 
    2. Gate B2C Services, B2C Category/Products, and B2B Products catalog links in `Sidebar.tsx` to conditionally display only if `features_config.services` and `features_config.products` are enabled.
    3. Overhaul the sidebar typography and layout hierarchy:
       - **Hierarchy**: Apply standard sizes (`text-sm` for Tier 0 top-level items, `text-xs font-bold` for section headers, `text-xs font-semibold` for sub-folders, and `text-xs font-medium` for leaf links). Do not overuse `font-bold` for everything.
       - **No Bullets**: Eliminate all `•` bullet characters from the menu text.
       - **Indentation**: Standardize indentation (`pl-9` for Tier 1.5 sub-folders, `pl-12 ml-2 border-l border-slate-100` with guide line for Tier 2 leaf nodes).
       - **Transitions & Indicator**: Implement active markers (using a 4px left-border blue pill `bg-blue-50/40 text-blue-600`) and rotate transitions on the folder chevrons (`duration-200 ease-in-out`).
  * **Acceptance Criteria**:
    * *Given* a B2C user profile with `products.enabled = false` and `services.enabled = true`,
    * *When* the user views the sidebar,
    * *Then* they see the "Services" link, but Category/Products links are completely hidden.
    * *Given* a B2B user profile with `products.enabled = false`,
    * *When* they view the sidebar,
    * *Then* the entire "Products" group folder is hidden.
    * *Given* any menu section,
    * *Then* there are no raw bullet points (`•`), chevrons animate smoothly on click, and font weights reflect their respective depth tiers.

- [x] Task 141.2: **Dynamic Product Catalog Page Vertical Filtering**
  * **Description**: Update the products list table/grid view (`frontend/app/trade/products/page.tsx`) to check the business vertical profile. If `BASIC` (B2C), hide the "Wholesale Threshold" column, brand, and B2B-specific metrics from the layout.
  * **Acceptance Criteria**:
    * *Given* a B2C user viewing `/trade/products`,
    * *When* the page renders,
    * *Then* the "Wholesale Threshold" column and "Brand" values are not displayed in the table.

- [x] Task 141.3: **Dynamic Catalog Drawer Form Gating**
  * **Description**: Update the product configuration edit/create drawer form (`CatalogDrawer.tsx` or similar product form) to dynamically render input fields. If vertical is `BASIC` (B2C), hide inputs for `wholesale_threshold`, `brand`, and `unit_of_measure` (or default them in the request payload), showing only name, price, description, and categories.
  * **Acceptance Criteria**:
    * *Given* a B2C user opening the Add Product drawer,
    * *When* the form renders,
    * *Then* inputs for "Wholesale Threshold" and "Brand" are completely hidden from the user interface.

- [x] Task 141.4: **Update API Schema Tolerances & Unit Testing**
  * **Description**: Ensure all Pydantic schemas in `schemas/trade.py` (such as `ProductCreate`/`ProductUpdate`) have B2B fields (`wholesale_threshold`, `brand`) defined as optional/nullable, and write unit tests verifying B2C product creations succeed with only basic fields.
  * **Acceptance Criteria**:
    * *Given* a B2C product payload with only name, price, and category_id,
    * *When* creating the product via POST `/trade/products`,
    * *Then* the product is successfully saved in the database with NULL B2B fields.

- [x] Task 141.5: **Build Compile and Integration Verification**
  * **Description**: Regenerate frontend TypeScript clients, verify zero compilation/TypeScript errors during Next.js builds, and verify all unit/integration tests pass cleanly.
  * **Acceptance Criteria**:
    * *Given* the updated schemas and pages,
    * *When* running `npm run build` in the frontend,
    * *Then* the production compilation succeeds with no errors.

- [x] Task 141.6: **Admin User Modal Custom Feature Switches**
  * **Description**: Add toggle components to the Admin panel user provisioning modal (`frontend/app/(admin)/admin/page.tsx`). For B2C (BASIC) accounts, show toggles for "Services Catalog" and "Products & Categories". For B2B (TRADE) accounts, show a toggle for "Products & Categories Catalog". Wire them to sanitize and serialize into `features_config` on save.
  * **Acceptance Criteria**:
    * *Given* the Admin User creation modal,
    * *When* the admin configures a BASIC user's features,
    * *Then* they can check/uncheck Services and Products, saving them as `services` and `products` flags.

- [x] Task 141.7: **Register Feature Defaults in Backend**
  * **Description**: Register `services` and `products` keys in `DEFAULT_FEATURES_CONFIG` and `get_default_features_config(vertical_type)` inside `backend/app/api/business.py` to ensure B2C gets services default-enabled, and B2B gets products default-enabled.
  * **Acceptance Criteria**:
    * *Given* a new B2B profile is initialized in the database,
    * *When* defaults are fetched,
    * *Then* `features_config` includes `"products": {"enabled": true}` and `"services": {"enabled": false}`.

---

## Epic 142: Sidebar Navigation Nomenclature & Hierarchy Alignment (COMPLETE)
**Objective**: Redefine menu item nomenclatures in `Sidebar.tsx` to eliminate cognitive load and label repetition across active customer assets and prospective pipelines. Organize B2C links under clear thematic sections (CRM Operations & Catalog Setup) and standardize plural categories labels.

- [x] Task 142.1: **Differentiate B2B Hub and Prospecting Menu Leaf Labels**
  * **Description**: Rename leaf nodes in `Sidebar.tsx` to ensure distinct terms:
    - B2B Hub accounts -> "Active Accounts"
    - Wholesale Prospecting accounts -> "Lead Accounts"
    - Wholesale Prospecting contacts -> "Lead Contacts"
    - Retail Prospecting accounts -> "Referral Stores"
    - Retail Prospecting contacts -> "Referral Contacts"
  * **Acceptance Criteria**:
    - *Given* a B2B user viewing the sidebar,
    - *When* the sidebar renders,
    - *Then* they see unique labels: "Active Accounts", "Lead Accounts", and "Referral Stores".

- [x] Task 142.2: **Standardize B2C Plural Nomenclatures and Section Headers**
  * **Description**: Update the B2C section in `Sidebar.tsx` to:
    - Group B2C links under CRM Operations (Clients, Services) and Catalog Setup (Categories, Products) section headers.
    - Rename "Category" to "Categories" for parity.
  * **Acceptance Criteria**:
    - *Given* a B2C user viewing the sidebar,
    - *When* the sidebar renders,
    - *Then* they see "Categories" and "Products" grouped under "Catalog Setup".

- [x] Task 142.3: **Compile & Verify**
  * **Description**: Compile the Next.js frontend with no compiler or type warnings.
  * **Acceptance Criteria**:
    - *Given* the modified sidebar component,
    - *When* running `npm run build` in the frontend,
    - *Then* compilation completes successfully.

## Epic 143: Reusable Strategy Library & Dispatch Desk
**Objective**: Split the action creation flow into two decoupled operations: (1) Defining Action Blueprints (Templates) inside the Strategy Library (store-agnostic, assignee-agnostic, and due-date-agnostic), and (2) Assigning Actions (Task Deployment) by selecting a blueprint and specifying the target store, assignee, due date, and metric goal.

- [x] Task 143.1: **Define Action Blueprint UI (Strategy Library)**: Create a card-based form drawer to define operational Action Templates. The form must capture: Category (Commercial/Marketing Segmented Control), Action Type (Objective name, filtered by category), Main Action (Title), Description (Guidelines), and Metric Unit. Store, Assignee, and Due Date fields must be completely excluded.
  * **Acceptance Criteria**:
    - *Given* a sales manager on the Strategy Library settings,
    - *When* they click "Create Strategy Action Blueprint",
    - *Then* they are prompted only for Category, Action Type, Title, Description, and Metric Unit.
    - *And* saving the blueprint posts to `/api/v1/trade/action-templates`.

- [x] Task 143.2: **Assign Action UI (Deployment Desk)**: Build the dispatch drawer to assign actions to reps. The form captures: Target Store, Assignee Rep, Category, Action Type, a dropdown displaying active blueprints filtered by category/type, Metric Goal, and Operational Deadline.
  * **Acceptance Criteria**:
    - *Given* a manager dispatching an action,
    - *When* they select Category and Action Type,
    - *Then* the "Select Blueprint" dropdown displays only matching action templates.
    - *And* selecting a blueprint pre-fills Title and Description in a read-only preview state.
    - *And* the manager must specify Store, Assignee, Goal (with unit suffix), and Due Date.

- [x] Task 143.3: **Dynamic Backend Blueprint Instantiation**: Update the backend `POST /trade/actions` controller to copy the baseline properties (Title, Description, Objective, Category, Unit) from the selected `template_id` blueprint, while overriding the target store, assignee, due date, and target goal value in the database.
  * **Acceptance Criteria**:
    - *Given* an assignment payload with `template_id`, `store_id`, `assigned_to_id`, `target_value` (Metric Goal), and `due_date`,
    - *When* posting to `/api/v1/trade/actions`,
    - *Then* the backend automatically resolves and duplicates the blueprint's properties, saving the result into `store_actions` inside the `details` JSONB field.

- [x] Task 143.4: **Desktop & Mobile Execution Integration**: Update the Strategy Desk action cards to display the custom title and details from the `details` JSONB column, and verify the mobile outcome resolution sheet remains fully functional.
  * **Acceptance Criteria**:
    - *Given* an action instantiated from a template,
    - *When* viewed on the desktop Strategy Desk or mobile client,
    - *Then* the action card displays the customized Title instead of the generic template category name.
    - *And* reps can resolve it with numeric validation.


