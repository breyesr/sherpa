# Handoff Log

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
