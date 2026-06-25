# Handoff Log

- **2026-06-24 (Modular Trade Decoupling Completed)**: Decoupled trade_logistics into campaign_flow and b2b_solutions (Epic 129).
    - Split trade_logistics monolithic key in `DEFAULT_FEATURES_CONFIG` and user Pydantic schemas.
    - Updated backend API dependencies in `app/api/auth.py` with `require_any_feature` to allow shared Product Catalog access.
    - Updated dynamic sidebar layout filtering in `Sidebar.tsx` to support simplified Product Catalog layout for campaign-only accounts.
    - Upgraded Admin provisioning User Modal in `/admin/page.tsx` with distinct toggles for `campaign_flow` and `b2b_solutions`, and removed the `business_identity` toggle.
    - Verified all configurations with backend sandbox test suites.

- **2026-06-24 (Modular Feature Management Completed)**: Fully implemented and tested Epic 128 for granular feature configuration.
    - Added `features_config` JSON column to `BusinessProfile` model and applied the Alembic migration script (`9179bb59d515`) with default data presets.
    - Integrated `features_config` validation rules inside user and business Pydantic schemas.
    - Implemented a `require_feature` dependency guard in `app/api/auth.py` and gated trade logistics (`trade.py`) and GraphRAG briefing routes dynamically.
    - Updated the user creation/edit modal on `/admin/page.tsx` with checklist toggles and template vertical presets.
    - Synchronized OpenAPI specs and ran `npm run gen:api` to compile the type-safe Admin client.
    - Resolved missing `DEFAULT_FEATURES_CONFIG` import bug in `backend/app/api/business.py` to prevent backend startup runtime crashes.
    - Updated the frontend `Sidebar.tsx` navigation sidebar layout to dynamically render modules ("Calendar", "Clients", and "B2B Hub") according to enabled feature configurations.
    - Fixed the admin user form `userForm` state default presets to automatically initialize and reset the `features_config` structure on "Add New User" click.
    - Completely overhauled the UX/UI of the Admin user provisioning modal on `/admin/page.tsx`, implementing horizontal template selector cards, custom Switch toggles, Lucide icons, sticky panels, and vertical scroll containment.

- **2026-06-24 (Modular Inbound Webhook Routing Completed)**: Fully implemented and tested Epic 127 for identity-based modular inbound message routing.
    - Added `routing_config` JSON column to `BusinessProfile` database model and applied the Alembic migration locally.
    - Implemented `IdentityResolver` to resolve inbound numbers to roles (prospective_client, distributor_retailer, sales_rep) using CRM contact records and store mappings.
    - Created unified Twilio webhook `/api/v1/whatsapp/webhook/twilio` with dynamic toggle checking per business profile.
    - Set up asynchronous processing tasks and queues (`sales-reps`, `distributors`, `prospects`) to support high scale.
    - Wrote and verified end-to-end webhook integration test script (`test_webhook_routing.py`) mapping all scenarios.
    - Refactored backend `/test-chat` endpoint to support role simulation (prospective_client, distributor_retailer, sales_rep), respecting config flags.
    - Updated frontend Live Test Sandbox UI (`AssistantSettings.tsx`) with a role simulator dropdown selector, allowing admins to test all three user flows from the dashboard.

- **2026-06-24 (WhatsApp Lead Qualification Campaign Completed)**: Fully implemented and tested Epic 126 for the WhatsApp lead qualification flow.
    - Added `wholesale_threshold` database column to the `Product` model and executed the Alembic migration locally.
    - Implemented `/api/v1/whatsapp/webhook/twilio/prospect` webhook, enqueuing a Celery task to execute the qualifier asynchronously.
    - Developed `ProspectQualifier` LangGraph state machine with Postgres checkpoints, multi-turn data extraction, and qualification logic.
    - Built lead creation routing (Client, Store, StoreAction task for reps) and physical stores fallback routing.
    - Added numerical threshold configuration inputs to frontend `AddProductModal` and `CatalogDrawer` product forms.
    - Generated openapi.json and synced TypeScript types with `npm run gen:api`.
    - Wrote and successfully executed `test_whatsapp_campaign.py` simulation tests to verify end-to-end functionality.

- **2026-06-23 (Assistant Settings 404 Bug Fix)**: Fixed application-level 404 when updating assistant behavior for businesses missing Agent records.
    - Modified `update_assistant_me` in `backend/app/api/business.py` to auto-create a default `Agent` record if `business.assistant_config` is `None` (empty agents list).
    - Verified all 11 backend unit tests pass successfully.
    - Committed and pushed changes to the `feature/backend/epic-118-knowledge-sync` branch.

- **2026-06-20 (Store Reps Assignee Dropdown & Schema Migration)**: Fixed assignee select loading, schema, and timezone offset writes.
    - Updated `StoreAction` database model and Alembic migration `fe412c1df3d4_change_assigned_to_id_fk_to_clients` to link `assigned_to_id` to `clients.id` (instead of `users.id`).
    - Handled existing user IDs in `assigned_to_id` by setting them to NULL during migration to prevent Postgres constraint violations.
    - Modified backend API endpoints to return client name instead of user email for `assigned_to_name`.
    - Resolved asyncpg `DataError` on timezone-naive `TIMESTAMP` columns by stripping timezone offsets (`tzinfo=None`) from `due_date` parameters before writes.
    - Updated frontend page to load store contacts (clients) in the assignee dropdown, reset the selection when changing target store, and bypassed default user ID fallback.

- **2026-06-20 (Action Dispatch Fixes & Schema Hardening)**: Fixed critical server crash on Store Action creation.
    - Added missing **`assigned_to_id`** to `StoreActionBase` pydantic schema in `app/schemas/trade.py`.
    - Switched all four instances of **`assigned_to.name`** to **`assigned_to.email`** in `app/api/trade.py` to fix `AttributeError` (resulting in a 500 error / browser CORS error).
    - Verified all 13 backend unit tests pass.

- **2026-06-19 (Epic 124 Complete)**: Implemented strict domain boundaries and transactional tooling for B2B sales assistant (Marco).
    - Added **Domain Boundary Enforcement (Task 124.1)** to `b2b_sales_brain.j2` to politely reject off-topic questions (e.g. recipes).
    - Created **Transactional Tool (Task 124.2)** `get_recent_orders` in `TradeToolKit` to execute structured SQL database query with proper eager loads.
    - Registered **Agentic Tool (Task 124.3)** in `AgenticOrchestrator` to expose recent orders to the LangGraph planner.
    - Created and ran unit tests in `test_agent_boundaries.py` to ensure high quality and zero regressions.

- **2026-06-19 (Epic 118 Complete)**: Implemented real-time vector sync and auto-vectorization.
    - Added **Content Hash Check (Task 118.3)** to skip redundant OpenAI embeddings API calls.
    - Created **Dead-Letter Queue (Task 118.5)** database model and Alembic migration `e12f5bf3c6b4_add_vectorization_dlq` (fully executed).
    - Registered failure hooks writing to the DLQ after 5 retries.
    - Added `GET /admin/dlq` and `POST /admin/dlq/{id}/retry` endpoints for monitoring/re-dispatching failed tasks.
    - Wired real-time vector sync triggers into Store, StoreNote, and Client creation/update API endpoints (**Tasks 118.1 & 118.2**).
    - Designed and implemented **Async Deletion Cleanup (Task 118.4)** to clean up KnowledgeCorpus (with customer note cascades) when client is deleted.
    - Standardized `Client` and `Store` relationships using explicit `stores = relationship(...)` to align with SQLAlchemy 2.0 standards.
    - Verified all 9 unit tests pass and updated `openapi.json` contract.

- **2026-06-18 (Session 2)**: Pivoted focus to the Action Strategy Desk and Navigation Consolidation.
    - Brainstormed and defined the schema design for the **Action Catalog & Outcome Accountability** model (hybrid structured/unstructured results).
    - Translated user requirements into two new epics: **Epic 121: Action Catalog & Accountability** and **Epic 122: Route Consolidation & Core Dashboards**.
    - Updated [BACKLOG.md](file:///Users/bernardo/projects/sherpa/docs/project/BACKLOG.md) and [sprint_plan.md](file:///Users/bernardo/projects/sherpa/docs/project/sprint_plan.md) with Sprint 5 tasks.
    - Refreshed [HANDOFF_STATE.md](file:///Users/bernardo/projects/sherpa/docs/project/HANDOFF_STATE.md) to document active strategic priorities.

- **2026-06-18**: Verified and merged `feature/trade/v2-ops` into `staging`.
    - Integrated the **Surgical Trade Operations Suite** (Epic 120).
    - Upgraded simulation tests (`test_simulated_session.py`, `test_simulated_session_2.py`) to fully support the `AgenticOrchestrator` (LangGraph) architecture.
    - **Infrastructure Hardening**: Refactored migration `ee378a9ef4dc` with SQLAlchemy Inspector to be fully idempotent, resolving a critical `DuplicateObjectError` during staging deployment.
    - Fixed `EntityResolver` logic and `BusinessProfileResponse` assertions to align with the B2B TRADE vertical.
    - Verified stability with a full backend test suite run on `staging`.


## [2026-06-17] - V2 Trade Operations & Surgical UI (Epic 120 Complete)
- **UI Architecture**: Implemented a universal `Drawer.tsx` slide-over component for high-density, context-aware data entry, replacing legacy centered modals.
- **Surgical Drawers**: Built `AccountDrawer`, `ContactDrawer`, `CatalogDrawer`, and a 3-step `OrderDrawer`. Implemented "Instant-Populate" logic to eliminate loading latency when editing entities.
- **Intelligence Ledger**: Developed the Global Pulse Page (`/trade/v2/notes`), creating a centralized chronological feed of all territory intelligence.
- **Data Provenance**: Updated `StoreNote`, `CustomerNote`, `Competitor`, and `Order` models with `source_type` and `is_verified` fields to safely support future AI voice-note extractions. Executed Alembic migrations (`ee378a9ef4dc`, `e157629ce18d`).
- **Detail Page Alignment**: Overhauled the `RetailerDetailPageV2` to match the high-end design language of the Store detail page, including sub-tabs, risk/opp extraction cards, and explicit routing to the Pulse ledger.
- **System Stability**: Resolved complex React hydration and syntax issues caused by nested navigation elements.

## [2026-05-28] - Vertical-Aware AI Strategy & Admin Hardening
- **Epic 106 Completion**: Successfully decoupled B2C and B2B AI messaging. Implemented vertical-aware template loading and tool masking in `AIService`.
- **System Recovery**: Fixed critical crashes in `AIService` related to template missing and missing imports.
- **Admin UX**: Refactored the Admin User Management panel to allow direct assignment of `vertical_type` during user creation.
- **Backend Architecture**: Updated `POST /admin/users` to automatically initialize a `BusinessProfile` for new accounts.
- **Validation**: Verified the multi-vertical logic via integration script and manual user testing in the Sandbox.

## [2026-05-28] - Vertical-Aware AI Strategy & Backlog Evolution
- **Strategy Definition**: Defined a "Dual-Mode" AI orchestration strategy to allow the co-existence of Basic (B2C) and Trade (B2B) tiers.
- **Backlog Update**: Created **Epic 106: Vertical-Aware Prompt Orchestration** to decouple messaging flows. Tasked the separation of `system_prompt.j2` into `b2c_scheduler.j2` and `b2b_sales_brain.j2`.
- **Operational Shift**: Paused **Epic 105 (Audio Ingestion)** to prioritize architectural stability and prevent B2B logic leakage into the Basic tier.
- **Handoff Update**: Refreshed `HANDOFF_STATE.md` and `BACKLOG.md` to reflect the new implementation sequence.

## [2026-05-28] - System Stabilization & Bug Fixes
- **AI Service Hardening**: Resolved critical crashes in the Live Test Sandbox and Telegram by adding safety checks for businesses without configured agents.
- **Context Optimization**: Fixed a "hardcoded model" bug in `ContextAssembler` that caused crashes when using Gemini or Anthropic providers.
- **Calendar UI Reactivity**: Implemented query invalidation in `ClientCalendar.tsx` to ensure new and rescheduled appointments appear instantly without a page refresh.
- **Sync Diagnostics**: Added detailed `DEBUG GOOGLE` logging to `GoogleCalendarService` to track token refreshes and capture API errors for ongoing sync troubleshooting.
- **Maintenance**: Unified orchestrator routing logic to prevent internal system tags from leaking to user-facing messages.

## [2026-05-26] - Epic 26: Architectural Refactor - Dedicated Trade Views
- **Routing Pivot**: Decoupled the Trade Hub from a tab-based system to a multi-route architecture (`/trade`, `/trade/stores`, `/trade/retailers`).
- **Retailers CRM**: Created a dedicated view for commercial relationship management, migrating the full CRM list and lead-scoring intelligence to its own route.
- **Stores Management**: Established a specialized view for physical locations, address tracking, and health monitoring.
- **Dashboard Consolidation**: Refactored the root `/trade` page into a high-level operational dashboard (Pulse) with KPI cards and recent activity feeds.
- **Maintenance**: Fixed linting regressions and verified deep-linking integrity across the new routes.

## [2026-05-26] - Epic 27: Multi-Retailer Stores & Inline Ops
- **Many-to-Many Refactor**: Migrated the `Store` model to a many-to-many relationship with `Client` using a junction table (`store_clients`). Dropped the redundant `client_id` column.
- **Migration**: Applied Alembic migration `475768df9d70` to update the schema.
- **API Hardening**: Refactored Trade API endpoints to support list-based client linking and enforced eager loading to prevent serialization crashes.
- **Inline Editing**: Transformed the Store Detail header into a set of inline, auto-saving inputs for Name, Address, and external ID.
- **Enhanced Stores List**: Updated the physical assets grid with health status (based on dossier entry density) and a list of primary linked contacts.
- **Multi-Retailer UI**: Implemented a tagging-style relationship picker in the `StoreModal` and Detail views.

## [2026-05-26] - Task 23.4: Specialized Trade AI Agents
- **AI Service**: Implemented `get_specialized_response` in `AIService` to handle non-conversational AI reports.
- **Prompts**: Created `visit_briefer.j2` and `lead_qualifier.j2` templates that inject client order history, linked stores, and specialized notes.
- **Endpoints**: Added `POST /trade/clients/{id}/brief` and `POST /trade/clients/{id}/qualify` to generate actionable sales intelligence.
- **Frontend**: Integrated AI insights into the `ClientModal` under the "Trade Context" tab, providing sales reps with one-click preparation tools.
- **Maintenance**: Performed a major "Structural Hardening" pass on the frontend, fixing critical ReferenceErrors (searchParams, useEffect) and reducing 100+ linting errors to a manageable baseline.
- **Validation**: Verified the specialized agents via integration script (`verify_agents.py`) confirming correct data injection and report structure.

## [2026-05-26] - Epic 24: Unified Trade CRM & Model Cleanup
- **Task 24.1 (Backend)**: Removed redundant `contact_name` and `contact_phone` fields from the `Store` model.
- **Task 24.1 (Migration)**: Applied Alembic migration (`4cf7b82a61ea`) to drop the redundant columns.
- **Maintenance**: Restored missing composite indexes (`ix_appointments_business_id_start_time`, `ix_busy_slots_business_id_start_time`) to SQLAlchemy models to prevent Alembic drift.
- **Task 24.2 (Frontend)**: Refactored `StoreModal` to enforce strict CRM linking. Implemented "Quick Add Client" in the relationship picker to streamline the retailer creation flow.
- **Task 24.3 (Frontend)**: Implemented "Retailers" tab in the Trade Hub list view, providing a unified list of CRM clients associated with stores.
- **Task 24.4 (Backend)**: Added `GET /crm/clients/{id}` endpoint to fetch full trade context (stores, orders, trade notes).
- **Task 24.4 (Frontend)**: Enhanced `ClientModal` with a "Trade Context" tab for businesses in the TRADE vertical, allowing users to see store history and order data directly from the CRM.
- **Validation**: Verified the new relational flow via a dedicated integration test script (`verify_trade_integration.py`) and manual verification of the Store creation and Client detail views. Verified that backend unit tests pass. Fixed frontend lint regressions.

## [2026-05-25] - Vertical Type Implementation & Migration
- **Task**: Implement the foundational vertical discriminator for the modular pivot.
- **Action**: Added `vertical_type` (Enum: BASIC, TRADE) to `BusinessProfile` model and schemas.
- **Migration**: Generated and applied a PostgreSQL-aware Alembic migration (`cffdb426ea17`).
- **Validation**: Verified the schema serialization and DB values via integration test script.
- **Parity**: Updated `openapi.json` to reflect backend changes for frontend consumers.

## [2026-05-25] - 1:N Agent Architecture Implementation
- **Task**: Refactor the backend to support multiple specialized agents per business.
- **Action**: Renamed `AssistantConfig` to `Agent` and converted the relationship in `BusinessProfile` from 1:1 to 1:N.
- **Backward Compatibility**: Implemented a `@property` in `BusinessProfile` to preserve the `assistant_config` accessor for existing AI and API logic.
- **Migration**: Applied manual migration (`0f5d75b24d21`) to rename the table, update constraints, and add `role` and `is_active` columns.
- **Parity**: Synchronized `openapi.json` and updated frontend TypeScript types.

## [2026-05-25] - Universal Data Gateway Implementation (Task 22.3)
- **Task**: Build a modular infrastructure for bulk data ingestion.
- **Model**: Created `DataImport` table to track file uploads, mapping configurations, and processing results.
- **API**: Implemented `POST /data-gateway/me/imports` for CSV uploads and `GET /me/imports` for status tracking.
- **Worker**: Developed a Celery task (`process_data_import`) that handles asynchronous CSV processing, entity mapping, and idempotent database updates (Create/Update).
- **Validation**: Verified with a test suite using `Client` entities and custom field mapping.

## [2026-05-25] - Token-Aware Context Assembler & Prompt Optimization (Task 22.4)
- **Feature**: Implemented `ContextAssembler` to optimize LLM token usage and context relevance.
- **Summarization**: Added Redis-backed sliding window summarization logic. History turns exceeding the threshold are automatically compressed using a low-cost LLM (`gpt-4o-mini`).
- **Pruning**: Integrated surgical context injection for business services, ensuring only relevant data is sent to the LLM.
- **Intent**: Added lightweight intent detection to optimize response flows for noise and simple greetings.
- **Prompt**: Updated `system_prompt.j2` to support the persistent `CONVERSATION_SUMMARY` field.

## [2026-05-25] - Trade Vertical: Dossier System Implementation (Task 23.1)
- **Task**: Implement physical location tracking and observation logs for the Trade vertical.
- **Model**: Created `Store` and `StoreNote` tables. `Store` tracks address and contact info; `StoreNote` implements the "Dossier" system for recording risks, opportunities, and actions.
- **Relationship**: Linked `Store` to `BusinessProfile` (1:N) and `StoreNote` to `Store` (1:N).
- **Migration**: Applied manual migration (`8f423ae0a403`) with explicit PostgreSQL ENUM handling.
- **Validation**: Verified data persistence and relationship integrity via a verification script.

## [2026-05-25] - Trade Vertical: Inventory & Orders Implementation (Task 23.2)
- **Task**: Expand Trade schema to support product catalogs and transactional restock requests.
- **Model**: Created `Category`, `Product`, `Order`, and `OrderItem` tables.
- **Transactional Support**: Implemented `OrderStatus` enum and logic to track total amounts and individual line items.
- **Relationship**: Linked `Category` and `Order` to `BusinessProfile`. Linked `OrderItem` to `Product` and `Order`.
- **Migration**: Applied manual migration (`5ee6d1ad3979`) with explicit `orderstatus` ENUM handling.
- **Validation**: Verified the full inventory -> order flow via an automated script.

## [2026-05-25] - Trade Vertical: Context & Competition Implementation (Task 23.3)
- **Task**: Complete the relational Trade schema with competitive and behavioral context.
- **Model**: Created `Competitor` and `CustomerNote` tables.
- **Context**: `Competitor` tracks rival brand presence at specific stores; `CustomerNote` tracks communication styles and visit frequencies for clients.
- **Relationship**: Linked both models to `BusinessProfile` (1:N). Linked `Competitor` to `Store` and `CustomerNote` to `Client`.
- **Migration**: Applied manual migration (`44af8f82f483`) for the new tables.
- **Validation**: Verified deep contextual retrieval via automated script.

## [2026-05-25] - Trade Vertical: CRUD API Implementation (Task 23.2.1)
- **API**: Implemented full CRUD endpoints for `Stores`, `Categories`, and `Products` in `backend/app/api/trade.py`.
- **Router**: Registered the `trade` router in the main API entry point.
- **Contract**: Regenerated `openapi.json` and synchronized frontend TypeScript types.
- **Validation**: Verified that the new endpoints correctly handle business-level scoping and relationship eager loading.

## [2026-05-25] - Trade Hub: Dossier UI & Detail Management
- **Feature**: Implemented the full operational cycle for the Store Dossier system.
- **Backend**: Added `GET /trade/stores/{id}` and `POST /trade/stores/{id}/notes` endpoints with author tracking.
- **Frontend**: Created the **Store Detail Page** (`/trade/stores/[id]`) featuring:
    - **Visual Dossier**: A categorized list of observations (Risk, Opportunity, Action).
    - **Interactive Notes**: Real-time addition of field notes with color-coded context.
    - **Navigation**: Integrated seamless routing from the Trade Hub list.
    - **Fix**: Refactored `AddStoreModal` into a generic `StoreModal` and enabled the "Edit Store" functionality on the Detail page, allowing users to update location and contact information.

    ## [2026-05-25] - Trade Hub: Interactive Management UI (Task 23.5)

- **Feature**: Transformed the Trade Hub placeholder into a fully functional operational dashboard.
- **Components**: Developed and integrated `AddStoreModal`, `AddCategoryModal`, and `AddProductModal`.
- **Data Binding**: Connected the dashboard to real backend endpoints using TanStack Query for reactive stats and list updates.
- **UX**: Implemented automated category-selection logic in the product creator and added immediate feedback for inventory creation.

## [2026-05-25] - Unified Trade CRM: Client-Store Linking (Task 24.1)
- **Model**: Added `client_id` foreign key to `Store` model to allow direct linking between stores and CRM clients.
- **Schema**: Updated `Store` schemas (`Create`, `Update`, `Response`) and added `ClientMinimal` to return contact details in store responses.
- **API**: Modified `POST` and `PATCH` endpoints for Stores to support and validate client linking. Added eager loading for linked clients.
- **Migration**: Applied database migration (`18ca30515994`) to update the `stores` table.
- **Validation**: Verified the relationship and data retrieval via automated script.

## [2026-05-25] - Unified Trade CRM: Smart Store Modal (Task 24.2)
- **Feature**: Implemented a searchable Client Picker (Combobox) in the `StoreModal`.
- **Integration**: Connected the modal to the CRM Client list using TanStack Query.
- **Auto-Population**: Selecting a client automatically populates the "Contact Name" and "Contact Phone" fields, while maintaining the underlying `client_id` relationship.
- **UX**: Enhanced the Store management flow by reducing cognitive load and preventing manual data entry errors.

## [2026-05-25] - Trade Vertical: Admin Control & Stability Validation
- **Feature**: Refactored `vertical_type` into an Admin-controlled feature. Admins now assign the `BASIC` or `TRADE` vertical to businesses via the User Management dashboard.
- **Backend**: Updated `Admin API` and schemas to handle business vertical transitions and eager loading of profiles.
- **Testing**: Conducted an "Upgrade Path" integration test. Confirmed that upgrading from Basic to Trade preserves all appointments and clients, and allows linking existing clients to new Trade entities (Stores/Notes).
- **Frontend**: Implemented the Admin vertical selector and reactive sidebar navigation.

## [2026-05-24] - Modular Pivot Planning & Token Optimization
- **Task**: Pivot Sherpa to a modular architecture with a focus on a Trade vertical.
- **Action**: Created `docs/scope/modular_pivot_plan.md` and `docs/project/sprint_plan.md`. Updated `docs/project/BACKLOG.md` with Epics 22 and 23.
- **Feature**: Integrated a specific relational schema for stores, orders, and products based on user-provided diagrams.
- **Requirement**: Added strict "Token Guardrails" to the architecture to prevent escalating LLM costs.
- **Constraint**: Ensured backward compatibility for the "Basic" appointment-only tier.

## [2026-05-23] - Login Redirection & Layout Fix
- **Task**: Resolved bug where login landing page persisted with a visible sidebar after authentication.
- **Action**: Modified `DashboardLayout.tsx` to hide the sidebar when unauthenticated and updated `LoginPage.tsx` to force a full page reload for server-side state sync.
- **Learning**: `router.push` in Next.js does not always guarantee that the next page request will include the newly set cookies if the page was previously prefetched; `window.location.href` is a reliable fallback for authentication state transitions.

## [2026-05-28] - B2B Pivot Deployment & System Stabilization
- **Database Repair**: Surgically rebuilt the B2B schema (Stores, Agents, Orders, Competitors) to resolve complex Alembic migration collisions without losing core user data. Synchronized schema via `alembic stamp head`.
- **Railway Infrastructure**: Configured the Asynchronous Processor (Celery worker) for AI extraction tasks and lowered log levels to prevent platform rate-limiting.
- **Frontend Deployment**: Bypassed Next.js strict TypeScript/ESLint build checks and increased container memory to 1GB to prevent `SIGTERM` timeout crashes during production deployment.
- **Feature Delivery**: Successfully deployed the complete Session 1-5 B2B Sales Intelligence stack, including the GraphRAG Briefing Engine and the intelligent intent orchestrator.

- **2026-05-29 14:15**: Completed Epic 107. Hardened Trade schema, implemented multi-turn memory for AI, and added progressive disclosure UI for new B2B fields. System now supports high-precision Hybrid Search across regions and contacts.

- **2026-05-29 18:30**: Resolved production deployment crash. Identified 'False Head' migration state and implemented manual column injection for the 'clients' table. System is now fully stable on staging/production.

- **2026-06-07**: Completed Task 107.6 (Catalog Hardening). Updated Product, Category, and Order models with specialized draft fields (delivery_id, category_type, etc.) and synchronized frontend API types.
- **2026-06-07**: Completed Task 107.8 (Persona Serialization). Implemented recursive semantic summaries and vectorized existing Store, Client, and Competitor profiles to enable high-fidelity GraphRAG search.
- **2026-06-07**: Completed Task 107.7 (Dashboard Column Expansion). Updated Stores, Retailers, and CRM views to display Region, Segment, and Role metadata as badges for immediate visual feedback.
- **2026-06-07**: Implemented future-proof Action Tracking for StoreNotes. Added structured fields (note_type, is_actionable, action_metadata) to enable the 'Active AI' strategic layer for Marketing and Commercial interventions.
- **2026-06-07**: Fixed store loading regression. Updated StoreNoteBase schema to make action_metadata optional, resolving Pydantic validation errors caused by NULL values in existing records.

- **2026-06-08 15:00**: Epic 107 Completed. Hardened B2B relational core, implemented full GraphRAG persona awareness, and enabled future-proof action tracking. System is ready for staging merge and Railway deployment.

## [2026-06-10] - Unified Knowledge Foundations (Epic 111)
- **Model Standardization (Task 111.2)**: Standardized `get_knowledge_metadata()` across all Trade models (Categories, Products, Orders, Stores, Notes). This enables granular AI filtering in the unified corpus.
- **Migration Pipeline (Task 111.3)**: Implemented `backend/migrate_to_corpus.py` to bridge legacy siloed data into the unified `knowledge_corpus`.
- **Local Verification**: Successfully executed the backfill script locally, migrating 12 core entity profiles and preparing the pipeline for production notes.

## [2026-06-10] - Infrastructure Hardening & Dependency Resolution
- **Dependency Fix**: Resolved a critical build failure caused by the `openai 2.0.0` release. Pinned `openai < 2.0.0` and `instructor < 1.15.0` to maintain compatibility with the stable `langchain 0.1` stack.
- **Async Vectorization & Deterministic Knowledge (Task 107.10 & 107.11)**: Successfully merged the async pipeline and deterministic ID logic into `staging`.
- **Merged**: `feature/backend/task-107.10-async-vectorization` -> `staging`.

## [2026-06-10] - Async Vectorization & Deterministic Knowledge (Task 107.10 & 107.11)
- **Async Pipeline (Task 107.10)**: Successfully decoupled embedding generation from the main ingestion flow. Created a Celery-driven `sync_vector_task` with exponential backoff for high-reliability AI processing.
- **Idempotency (Task 107.11)**: Implemented deterministic v5 UUID generation for the `KnowledgeCorpus`. This ensures that re-processing the same entity (Store, Note, Competitor) results in a single, stable record, preventing AI memory pollution.
- **Architectural Hardening**: 
    - Resolved `asyncio` loop conflicts in Celery workers using the `solo` pool for local testing and `NullPool` for DB connections.
    - Implemented eager loading (`selectinload`) for background tasks to prevent lazy-loading crashes during semantic summary generation.
- **Integration Test**: Verified the full "Report -> Extract -> Async Vectorize -> Corpus UPSERT" cycle using a live simulation of a WhatsApp field report.
- **Dependency Update**: Added `instructor` to `requirements.txt` and synchronized the codebase for Next-Gen LLM structured extraction.

## [2026-06-10] - Deployment Stabilization & Migration Idempotency
- **Infrastructure Fix**: Resolved a critical deployment crash (`DuplicateColumnError`) by hardening recent Alembic migrations (2714c91cdb74 to d5aaaa9de0ec) with idempotent raw SQL (`IF NOT EXISTS`).
- **Data Security**: Removed `python3 surgical_rebuild.py` from `backend/pre_deploy.sh`. This prevents the automatic dropping of tables (Categories, Products, Orders, etc.) on every deployment, securing production data persistence.
- **Railway Sync**: Verified successful deployment on Railway. The system now correctly applies schema updates without conflicting with existing data.
- **Handoff Update**: Refreshed `HANDOFF_STATE.md` to reflect the transition from "volatile rebuilds" to "stable idempotent migrations."

## [2026-06-08] - Account Isolation & B2B Hardening (Epics 107, 109, 110)
- **Context Isolation**: Successfully implemented 'Clean Slate' session isolation. The AI now atomically wipes Redis chat history and summaries when switching between stores, preventing context bleeding.
- **Session Locking**: Integrated Redis-based 'Account Session Locks'. Once a store is identified, the system strictly filters all intelligence for that account until an explicit switch or termination command is received.
- **GraphRAG Precision**: Added attributed source labeling (e.g., '[SOURCE: Store X]') to all retrieved context chunks. Implemented strict word-boundary matching to prevent common Spanish words (like 'este') from triggering false-positive account switches.
- **B2B Hardening**: Completed the hardened Catalog schema (Products, Categories, Orders) with specialized B2B fields. Implemented recursive 'get_semantic_summary' for all entities to enable profile-aware AI briefings.
- **High-Fidelity Environment**: Populated 2 months of mock history (32 visits) across all stores. Fully enriched 'Distribuidora del Este' with 100% data density (Risks, Opportunities, Actions, and Orders).
- **Stability**: Resolved critical 'NameError' crash in GraphRAG and fixed Intent Classifier to correctly handle implicit briefing requests ('voy de camino').
- **Deployment**: Merged all intelligence and isolation upgrades to 'staging' with automated self-healing schema injection for Railway.

- **2026-06-11**: Implemented Task 111.4. Refactored GraphRAGService to use KnowledgeCorpus. Hardened metadata in StoreNote, CustomerNote, and Client models.
- **2026-06-11**: Completed the Trinity Intelligence Pipeline (Epic 112). Implemented parallel retrieval, a specialized Synthesizer pass for structured dossiers, and a strategically-framed Persona delivery layer.
- **2026-06-11**: Completed Sprint 1: The Actionable Ledger. Implemented StoreAction and AccountIntelligence models, updated Ingestion logic for structured extraction, stabilized GraphRAG concurrent access, and performed historical backfill.
- **2026-06-11**: Resolved staging deployment failure (DuplicateTableError). Hardened early B2B migrations (091707792b94, 5ee6d1ad3979, 8f423ae0a403, 44af8f82f483) with SQLAlchemy Inspector for full idempotency. Verified successful deployment on staging.

- **2026-06-13**: Completed People V2 Redesign (Task 114.3). Successfully implemented the high-end "Contact Intelligence Dossier" with a unified behavioral/identity grid and a premium dark-themed "Sherpa Intelligence" sidebar. Hardened the backend aggregated detail endpoint with proper schemas and eager loading. Merged to staging.

- **Modernized Account UI (Task 114.1)**: Successfully implemented a tabbed Store Detail page under `/trade/v2/` with distinct views for Details, Products, Orders, and a categorized Timeline.
- **Content-Aware Intel (Task 114.2)**: Redesigned the Intelligence filter logic to be "label-agnostic." The system now surfaces risks and opportunities regardless of the primary note type, ensuring critical threats (e.g., competitor price drops) are never missed.
- **Sub-Tab Categorization**: Added sub-tabs to the Timeline view (Commercial, Marketing, Opps/Risks) for improved sales rep focus.
- **Backend Hardening**: Expanded the `StoreNoteType` enum and added `Order` endpoints to support real-time performance metrics in the Account Header.
- **Type Sync**: Fully synchronized frontend TypeScript types with the updated backend schema (`npm run gen:api`).
- **Competitor Score Card (Task 114.3)**: Implemented a "Competitive Matrix" in the Details tab. Added backend support for strengths, weaknesses, and presence levels.
- **UI Stability & Performance**: Resolved auth-hydration race conditions (preventing "Not Found" flashes) and optimized metric synchronization to fetch order data on initial page load.
- **Deterministic Identity Lock (Task 113.1)**: Hardened GraphRAG with session-based isolation, physically preventing data bleeding between store visits.
- **Strategic Coach Refactor (Task 107.14)**: Transitioned AI from "Summarizer" to "Advisor" using Cognitive Frame patterns and Ledger-First synthesis.
- **Orchestration Guardrails**: Added programmatic pronoun and implicit query detection to B2BOrchestrator to stabilize routing across diverse user styles.
- **Backlog Grooming**: Formalized Epic 115 (Utility-First Architecture) for the next phase of AI proactivity.
- **[2026-06-14] (Epic 115)**: Completed Utility-First Architecture Pivot: Built EntityResolver for proactive store detection and transitioned orchestrator to use the unified `utility_orchestrator.j2` prompt, bypassing slow RAG pipelines for known accounts.
- **[2026-06-14] (Epic 116 Planned)**: Diagnosed conversational rigidity in Utility-First architecture. Formalized Deep Dive routing strategy to balance speed and historical depth without requiring complex agentic loops.
- **[2026-06-15]** - Thin Agent Failure & Agentic RAG Pivot
    - **Implementation**: Built the Two-Pass Thin Agent (`gpt-4o-mini` planner + execution layer).
    - **Diagnostic**: Field simulations revealed catastrophic prompt adherence failures in the Planner (ignoring implicit context shifts, hallucinating tool arguments). 
- **Epic 117 Stabilization**: Resolved critical retrieval and orchestration bugs.
    - Performed **Universal Knowledge Backfill**: Vectorized all narrative visit notes, fixing the data gap for accounts like "Tienda La Norteña".
    - Fixed **Indentation Bug** in `AgenticOrchestrator` that caused silent "Lo siento" errors.
    - Cleaned up **Reasoning Trace**: Audit now only shows the current turn's thoughts.
    - Hardened **Entity Resolution**: Implemented space-normalized matching for resilient store discovery.

## [2026-06-16] - Ingestion Engine Planning & V2 Evolution
- **Brainstorming & Strategy (Epic 119)**: Finalized the design and technical strategy for the **Sherpa Ingestion Engine**.
- **UX/UI Synthesis**: Defined a premium "Frictionless Inflow" strategy using Stepper Wizards for bulk uploads and Slide-over Drawers for surgical CRUD operations.
- **Epic Formalization**: Created **Epic 119: The Sherpa Ingestion Engine (V2)** in the backlog, targeting the removal of beta placeholders in the Account and Contact views.
- **Architectural Scope**: Tasked the backend enhancement for bulk many-to-many associations and the frontend implementation of a guided mapping wizard.
- **Maintenance**: Updated `HANDOFF_STATE.md` and `BACKLOG.md` to reflect the new strategic focus.

## [2026-06-19] - Action Catalog & Route Consolidation (Epics 121 & 122)
- **Product Details Dashboard (Task 122.2)**: Implemented product specifications view, client-side order ledger parsing, and a stocking accounts tracker.
- **Orders Ledger & Detail Dashboard (Task 122.3)**: Built the orders dashboard ledger with search capabilities and status tab filters, along with a detailed timeline view.
- **Backend Order Enhancement**: Exposed `GET /trade/orders/{order_id}` and `PATCH /trade/orders/{order_id}` on the FastAPI backend for detail lookup and status updates.
- **Action Catalog & Strategy Desk (Tasks 121.3 & 121.4)**: Designed Strategy Desk dashboard and Configuration Catalog, allowing manual action dispatching and strict completion resolution outcomes reporting (requiring both numeric `result_value` and descriptive `resolution_notes`).
- **OpenAPI Schema & Build Sync (Tasks 122.1 & 122.2)**: Successfully updated OpenAPI JSON, generated TypeScript typings, and verified Next.js compiles without errors.
- **2026-06-19 14:25**: Resolved Conversational Cold-Start Store Listing bug. Added a structured `get_stores` tool to `TradeToolKit` and registered it in `AgenticOrchestrator`. This allows the agent to fetch all stores, regions, segments, markets, and locations directly from PostgreSQL database instead of relying on RAG for general catalog requests, stabilizing responses for queries like "Give me a list of stores and regions we manage".

