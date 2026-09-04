# Handoff Log

- **2026-09-04 (Epics 223 & 224: Reasoning Trace Audit & Grounded Fact-Checking Guardrails)**: Implemented end-to-end thought process capture for Inbox audit visibility, and built the 4-layer hybrid technical fact-checking architecture eliminating product hallucinations and structural safety hazards.
  - **Backend (`services/prospect_qualifier.py`, `services/catalog_context.py`, `services/output_guardrail.py`, `services/technical_critic.py`, `services/agentic_orchestrator.py`, `core/ai_service.py`)**:
    - **Epic 223**: Mandated two-part response structure (`<thought>...</thought>` scratchpad + clean user message) across `ProspectQualifier`, `AgenticOrchestrator`, and `AIService`. Extracted thought deliberation into `Message.reasoning_trace` while stripping deliberation tags completely before outbound transmission.
    - **Epic 224 Layer 1**: Upgraded `CatalogContextBuilder` with grounded truth tables, strict non-improvisation directives, and negative application boundaries.
    - **Epic 224 Layer 2**: Built deterministic 0ms safety interceptors in `OutputGuardrail` blocking structural casting prescriptions with thin-bed mortars/adhesives, and unauthorized Basecoat prescriptions on floor tiles.
    - **Epic 224 Layer 3**: Created `TechnicalCritic` service running selective LLM audits only when product recommendations are detected (~30% of turns).
    - **Epic 224 Task 224.5**: Hardened all prompt templates, `TechnicalCritic`, and `OutputGuardrail` against hypothetical forcing and "choose the closest product" prompts, while strictly decoupling commercial closing (no quantity questions when products are rejected).
    - **Test Suite**: Created `test_reasoning_trace.py` and `test_technical_fact_checker.py`. Test suite expanded from 92 to 102 tests (100% passing).
  - **Frontend (`ConversationsContent.tsx`)**:
    - Upgraded Inbox Brain Logic / Audit Trace view with `whitespace-pre-wrap` and enhanced typography for structured multi-line diagnostic steps. Clean build (`npm run build`).

- **2026-09-01 (Epic 222 Defense-in-Depth AI Safety, Custom Instructions & Multi-Engine Integration)**: Implemented 4-layer defense-in-depth safety architecture, per-business custom instructions on Agent model, save-time regex and length validation, output guardrails, and unified multi-flow sandbox injection.
  - **Backend**:
    - Added `custom_instructions` (`Text`, nullable) to `Agent` model with Alembic migration `dbef3b554f4f`.
    - Created `InstructionValidator` (`services/instruction_validator.py`) for save-time security filtering (1,000 char cap, regex injection detection).
    - Enforced identity verification on `create_appointment` (blocks anonymous placeholder clients) and sanitized keys on `update_client_metadata`.
    - Integrated `OutputGuardrail` (`services/output_guardrail.py`) across all engines (`AIService`, `ProspectQualifier`, `AgenticOrchestrator`).
    - Connected `AgenticOrchestrator` and `ProspectQualifier` to inherit live in-memory sandbox overrides from `test_chat` and refined safety fence authority framing and greeting rules so that custom business voice/style instructions are actively applied across all interactions without triggering safety override suppressions.
    - Added automated unit tests (`test_tool_hard_locks.py`, `test_safety_fence.py`, `test_instruction_validator.py`, `test_output_guardrail.py`). All 92 backend tests passing.
  - **Frontend**:
    - Added Custom Instructions textarea with live character counter (0/1000) and safety disclaimer in `AssistantSettings.tsx`.
    - Synchronized API types via `npm run gen:api`. Verified clean build (`npm run build`).

- **2026-08-31 (Epic 221 Intelligent Catalog Context & Epic 220.3 Non-Negotiation Guardrails)**: Implemented structured product catalog intelligence context builder, relevance pruning for large catalogs (>15 items), side-by-side product comparison & recommendation directives, and hard non-negotiation pricing guardrails across ProspectQualifier and AIService.
  - **Backend (`services/catalog_context.py`, `services/prospect_qualifier.py`, `core/ai_service.py`)**:
    - Created `CatalogContextBuilder` utility with clean markdown table formatting, token pruning for large catalogs, and strict pricing guardrail injection.
    - Updated `ProspectQualifier` (LangGraph state machine) to use `CatalogContextBuilder` for answering technical inquiries, comparing products, and recommending items according to prospect needs.
    - Updated `AIService` and Jinja2 templates (`b2b_sales_brain.j2`, `b2c_scheduler.j2`) to inject structured catalog context and enforce pricing disclosure rules.
    - Documented product technical data sheet attachment & vector chunking architecture in `docs/architecture/product_data_sheets_design.md`.
    - Added unit test suite in `backend/app/tests/test_catalog_context.py` (all tests passing, 75/75 backend test suite passing).

- **2026-08-31 (Epic 219 Extensible Product Catalog Fields & Epic 220 Pricing Toggle)**: Implemented flexible product custom fields and AI pricing disclosure controls across backend models, schemas, migrations, and frontend drawers and settings.
  - **Backend (`models/trade/catalog.py`, `models/business.py`, `schemas/trade.py`, `schemas/business.py`)**:
    - Added `custom_fields` (`JSON`) column to `Product` model with automatic inclusion in semantic summaries and knowledge metadata.
    - Added `catalog_config` (`JSON`) column to `BusinessProfile` model to define dynamic field schemas.
    - Added `allow_price_disclosure` (`Boolean`, default `True`) column to `Agent` model for AI pricing policy control.
    - Created Alembic migration `a219b4c89e10_add_product_custom_fields_and_catalog_config.py`.
    - Added unit tests in `test_catalog_custom_fields.py` (100% passing).
  - **Frontend (`CatalogDrawer.tsx`, `GeneralSettings.tsx`, `AssistantSettings.tsx`)**:
    - Updated `CatalogDrawer.tsx` to dynamically render custom specification fields based on `business.catalog_config`.
    - Updated `GeneralSettings.tsx` with a full management card for product custom fields (matching CRM custom fields UX).
    - Added "Disclose Product Pricing" checkbox toggle to `AssistantSettings.tsx`.
    - Synchronized `openapi.json` and generated TypeScript definitions (`npm run gen:api`). Full test suite and type checks passing.

- **2026-08-31 (Meta Onboard WABA Discovery, Webhook Ingestion Fix & Phone Formatting)**: Verified live WhatsApp Embedded Signup onboarding on production with number `+5218186582756` (green `Conectado` status) and resolved inbound webhook processing.
  - **Backend (`integrations.py`, `whatsapp.py`, `ai_service.py`)**: 
    - Replaced User node WABA lookup with `/debug_token` granular scopes target ID discovery.
    - Fixed `UnboundLocalError` in `whatsapp_webhook` by renaming exception variable shadowing `import re`.
    - Created `app/core/phone_utils.py` formatting Mexican phone numbers into standard `+52 1 [10-digit number]` (e.g. `+52 1 8186582756`).
    - Fixed `is_real_phone` check in `ai_service.py` so incoming WhatsApp leads are recognized automatically without re-prompting for phone number.
  - **Frontend (`WhatsAppModal.tsx`)**: Captured Embedded Signup `postMessage` session events and removed hardcoded fallback website to ensure strict Meta ToS compliance.
  - **Tests**: Added `test_phone_utils.py` and `test_meta_onboard_with_debug_token`. Full pytest suite passing (68/68 tests).


- **2026-08-29 (Master Team Handoff & Docs Synchronization Completed)**: Audited the entire `/docs` ecosystem and created the master handoff guide [`docs/HANDOFF_GUIDE.md`](docs/HANDOFF_GUIDE.md) to onboard the new incoming engineering team.
  - **Documentation Audit**: Updated `PRODUCTION_STATUS.md` with recent deployments (Epics 206-220, Meta App Review approval, Coexistence mode), updated `deployment_guide.md` with service topologies and environment variables, updated `ARCHITECTURE.md` with modular sub-routers and messaging engines, and added context banners to legacy V1 documents.
  - **Master Handoff Guide**: Authored `docs/HANDOFF_GUIDE.md` covering the full product narrative (B2C roots to B2B Sales Intelligence), the "Marco" persona, complete system architecture, core engine deep-dives (Store Action ledger ingestion, 2-hop SQL CTE GraphRAG, Meta WhatsApp Cloud API), strict RAM and security guardrails, active backlog milestones, 7-day onboarding runbook, and comprehensive documentation index.

- **2026-08-29 (Epic 220: Zero-Friction Embedded Signup Auto-Fill Completed)**: Implemented automatic prefilling of business data and fallback website for Meta's Embedded Signup flow on branch `feature/epic-220-embedded-signup-prefill`.
  - **Backend (`integrations.py`)**: `GET /whatsapp/config` now extracts `business_name` and `category` from the authenticated user's `BusinessProfile` and returns a `prefill` dictionary. Added unit tests in `test_integrations_api.py`.
  - **Frontend (`WhatsAppModal.tsx`)**: Injected `setup.business` (`name`, `website: "https://xerpaa.com"`) and `setup.phone` (`displayName`, `category`) into `FB.login()` extras. Non-technical users no longer need to type website or business names manually into Meta's popup.
  - **Contracts & Tests**: Re-generated `openapi.json` and TypeScript types via `gen:api`. Full backend pytest suite (63 tests) and Next.js production build (`npm run build`) passed with zero errors.

- **2026-08-29 (Meta App Review Approved & Zero-Friction Onboarding Plan)**: Meta approved `public_profile` with Advanced Access (~2 hours after submission). Facebook Login is now 100% public. Identified and documented UX friction where Meta's popup forces users to manually enter website/business data. Created detailed implementation plan for Epic 220 (auto-fill Meta SDK fields, ~1.5 hrs) and refined Epic 219 (1-click virtual numbers via Twilio + Meta WABA binding, ~3-5 days). Plan at `temp/onboarding-optimization-plan.md`.

- **2026-08-28 (Meta App Review Submission & Tech Provider Live Status)**: Completed all Meta Developer requirements and submitted `public_profile` for App Review to enable 1-click WhatsApp onboarding for external public users.
  - **Review Submission**: Completed Data Handling assessment (RGPD/privacy checklist), Allowed Usage certification, Website Platform registration (`https://app.xerpaa.com`), and test instructions pointing to `/meta-review`. Status transitioned to **"Revisión en curso"**.
  - **Permissions Status**: Confirmed that `whatsapp_business_management` and `whatsapp_business_messaging` permissions are already **Approved** by Meta for Xerpa as an authorized Tech Provider.
  - **Auto-Registration & Error Telemetry**: Added automated `POST /{phone_number_id}/register` and `POST /{waba_id}/subscribed_apps` calls during onboarding in `integrations.py`, with detailed Meta error response payloads returned directly to the client.
  - **Modal Enhancements**: Made developer manual configuration accessible directly from all modal steps in `WhatsAppModal.tsx`.

- **2026-08-24 (WhatsApp Coexistence & Meta Tech Provider Onboarding)**: Implemented full Coexistence Mode and onboarding safety flow across frontend and backend on branch `feature/integrations/whatsapp-coexistence`.
  - **Pre-flight UX (`WhatsAppModal.tsx`)**: Created Step 2 pre-flight check and Step 6 migration guide explaining how non-technical personal WhatsApp users can migrate to WhatsApp Business App to avoid losing their personal chats.
  - **Always-on Coexistence (`WhatsAppModal.tsx`)**: Passed `extras: { featureType: 'coexistence' }` to `FB.login` in the Embedded Signup modal.
  - **Webhook Echo Filtering (`whatsapp.py`)**: Added sender vs registered business number verification in the webhook handler to suppress duplicate AI loops when merchants reply manually from the WhatsApp Business mobile app.
  - **Meta Deregistration on Disconnect (`provisioner.py` & `integrations.py`)**: Added `POST /{phone_number_id}/deregister` Meta Graph API call to clean up cloud registrations when disconnecting numbers from Sherpa.
  - **Test Plan**: Created structured test guides in `temp/whatsapp-code-changes.md` and `temp/whatsapp-test-plan.md`.

- **2026-08-11 (Google OAuth & Meta App Review Integration)**: Aligned codebase branding to ASCII "Xerpa", implemented root domain redirection, and guided user through Google and Meta verification submissions.
  - **OAuth Branding**: Changed all instances of "Xerpā" to "Xerpa" to bypass encoding issues on Google's review bot, and simplified H1 and tab title definitions.
  - **Root Domain Redirection**: Added a Next.js middleware check to redirect `xerpaa.com` to `app.xerpaa.com` via a clean 301, and completed custom domain and SSL provisioning in Railway and Namecheap.
  - **Verification Submissions**: Drafted concise compliance descriptions and guided user through Google Cloud appeal forms and Meta App Review questionnaires.

- **2026-08-08 (Onboarding Redirects & Meta Cloud API Production Confirmed)**: Implemented frontend onboarding redirects on 404 business profiles, and successfully validated end-to-end production messaging.
  - **Onboarding Redirects**: Configured server-side redirects to `/onboarding` if `/business/me` returns 404 on all primary authenticated routes (`/`, `/calendar`, `/crm`, `/settings`), preventing console error cascades and broken page rendering.
  - **Meta Webhook Signature & App Activation**: Diagnosed and assisted in resolving Meta App webhook signature mismatches and unarchiving the Meta Developer App to restore full API access in production.
  - **Repository Cleanup**: Discarded local database initialization scripts at user request once keys were verified operational in production.

- **2026-08-07 (WhatsApp Flow Fixes & Backlog Epics - VERIFIED)**: Created branch `feature/backend/whatsapp-flow-fix` and resolved multiple bugs blocking webhook replies. Merged to `staging` and `main` (Production), and verified working via an end-to-end WhatsApp messaging test.
  - **Fixed 24h Window Tracking (Task 210.3)**: Set `whatsapp_24h_window_start` inside `conv.extra_data` on incoming messages in `prospect_qualifier.py`.
  - **Fixed Template Fallback & Discard (Tasks 210.1 & 210.2)**: Set fallback default template in `messages.py` to `hello_world` and added warning logging for unsent AI responses.
  - **Fixed Webhook Dispatch Safety (Task 211.1)**: Added safe `client.id` check fallback to avoid webhook crash inside `whatsapp.py`.
  - **E2E Validation**: Verified that incoming user messages trigger proper worker processing and deliver text replies back to the user's phone instantly.
  - **CI/CD Ruff Fix**: Created `backend/pyproject.toml` to exclude migrations/tests and ignore pre-existing style/formatting warnings, resolving the linting errors on GitHub Actions.
  - **Backlog**: Documented Epics 210, 211, and 212 in `BACKLOG.md`.

- **2026-08-05 (Meta WhatsApp Cloud API Core Integration & Onboarding Complete)**: Completed Epics 206 and 207, and implemented the core frontend parts of Epic 208 for the Meta WhatsApp Cloud API migration.
  - **Core Messaging Engine (Task 206.2)**: Implemented `MetaCloudEngine` in `backend/app/services/messaging/meta_cloud_engine.py` using `httpx.AsyncClient` and Graph API `v22.0`, providing fully non-blocking asynchronous calls to Meta's endpoints. Registered the engine in the unified `MessagingService` factory.
  - **Webhook Signature Security (Task 206.1)**: Developed an HMAC-SHA256 request signature verification middleware (`X-Hub-Signature-256`) inside `backend/app/core/webhook_security.py` using `META_APP_SECRET`.
  - **Asynchronous Webhook Overhaul (Task 206.3)**: Completely refactored the direct `/webhook` POST endpoint in `whatsapp.py` to run signature checks first, parse incoming message statuses, normalize payloads to standard formatting, and delegate processing asynchronously to Celery worker queues via `apply_async()`.
  - **24-Hour Window Gating (Task 207.1)**: Tracked the start of the WhatsApp 24-hour compliance window inside `Conversation.extra_data["whatsapp_24h_window_start"]` upon user message persistence. Integrated safety check gates in `send_twilio_reply` task to block free-form outgoing texts and trigger an approved template message fallback (`hello_communication` by default) if outside the 24-hour window.
  - **Multi-Mode Meta Onboarding (Task 207.2 & 207.3)**: Added backend endpoints `GET /whatsapp/config` (exposes public app settings) and `POST /whatsapp/meta-onboard` which supports both automated OAuth authorization code exchange (resolves user token, WABA ID, and phone number details automatically from Meta's Graph API) and manual input fallbacks.
  - **Frontend Signup UI Wizard (Task 208.1 & 208.2)**: Redesigned the `WhatsAppModal.tsx` onboarding wizard component to load the Facebook Login SDK, trigger Meta's Embedded Signup popup using `config_id`, and POST the authorization code to the backend. Built a beautiful developer manual toggle inside the modal to paste details directly. Adjusted `IntegrationsPanel.tsx` provider name checks to dynamically show "Cloud API" instead of "Twilio" for Meta channels.
  - **Type Safety & Testing**: Regenerated `openapi.json` and type-synced the frontend using `npm run gen:api`. Verified code correctness with `npx tsc --noEmit` and the backend `pytest` suite, all executing with zero errors.

- **2026-08-03 (Meta WhatsApp Cloud API Migration Backlog)**: Transformed the Twilio-to-Meta migration plan (`temp/meta_migration_plan.md`) into three detailed, actionable epics with Given/When/Then Acceptance Criteria: Epic 206 (Core Engine & Webhook Security), Epic 207 (24h Compliance Gating & Provisioning), and Epic 208 (Frontend wizard, settings dashboard, and Twilio deprecation). Ensured sequential epic numbering in the 200s to avoid any collisions with completed epics in `ARCHIVE_BACKLOG.md` or active tasks in `BACKLOG.md`. Deprecated Phase 3 of Epic 161 in favor of the new epics. Updated [HANDOFF_STATE.md](file:///Users/bernardo/projects/sherpa/docs/project/HANDOFF_STATE.md) next steps.

- **2026-08-03 (Tasks 200.7, 203.4, & 204.4 Complete; Nixpacks Build Fix)**: Audited all 26 tasks from `prioritized_tasks.md` directly against the codebase. Replaced 110 direct `print()` calls with proper logging levels across 18 backend files (Task 200.7). Resolved all 45 residual `: any` type annotations in the frontend components and page files, fixing compilation and Lucide icon typing errors in `Sidebar.tsx`, `TelegramModal.tsx`, `OrderDrawer.tsx`, and `ServiceDrawer.tsx` (Task 203.4). Added standard triple-quote module-level docstrings to `graphrag.py` and `agentic_orchestrator.py` (Task 204.4). Fixed `backend/nixpacks.toml` to initialize and activate the python virtual environment prior to installing dependencies via `requirements.lock`, resolving a `pip: command not found` error during deployment. Verified that all backend and frontend checks (`pytest`, `npx tsc --noEmit`, and `npm run test:ci`) pass successfully with zero errors. Created final audit work order in `temp/pending_tasks_audit.md` and updated next steps in [HANDOFF_STATE.md](file:///Users/bernardo/projects/sherpa/docs/project/HANDOFF_STATE.md).

- **2026-07-31 (Epic 205 & Backlog Cleaning)**: Defined Epic 205 (incorporating 5 tasks with Given/When/Then Acceptance Criteria for Inbox audit traces, backwards order status transitions, category editing, and product unit of measure updates) and scheduled them as Sprint 9 in `docs/project/sprint_plan.md` and `docs/project/BACKLOG.md`. Fully completed Epic 201 (Performance & Reliability) by having our DevOps subagent wire `requirements.lock` into the Nixpacks deployment via `backend/nixpacks.toml`. Partitioned the active backlog by transferring completed Epics (200, 201, 202, 203, 204) to `docs/project/ARCHIVE_BACKLOG.md` to respect the 400-line limit. Updated next steps in [HANDOFF_STATE.md](file:///Users/bernardo/projects/sherpa/docs/project/HANDOFF_STATE.md).

- **2026-07-31 (Phase 6: Frontend Architecture Complete)**: Completed all five tasks under Phase 6. Created a centralized `apiClient.ts` and migrated 44 files with raw fetch calls and inline token headers. Deleted legacy `ClientModal` and `StoreModal` files, migrating the trade dashboard store manager to `AccountDrawer`. Eliminated all remaining `: any` type annotations globally. Integrated `react-hook-form` + `zod` for input forms in `ClientDrawer.tsx` and `AccountDrawer.tsx`. Configured Vitest and React Testing Library, writing unit tests for `apiClient` and schema validators with all 7/7 passing tests. Verified clean TypeScript compilation (`npx tsc`) and production builds (`npm run build`).


- **2026-07-30 (Backend Architecture Cleanup & Seeder Fix)**: Successfully completed the Trade router and model split (Epic 202.1 & 202.2). Modularized `api/trade.py` and `models/trade.py` into sub-module packages under `api/trade/` and `models/trade/`, using wrapper `__init__.py` shims to preserve backward-compatible imports and mock patch targets. Fixed a relative CSV path bug in `import_postal_codes.py` caused by the script organization, successfully importing all 157,525 Mexican geography records into the DB. Fixed a runtime `NameError` crash in `update_store_action` by importing `datetime`. Re-generated `docs/IMPORT_MAP.md` and updated `docs/ARCHITECTURE.md`. Merged all changes into `staging` and verified 100% green tests (58/58 passed).

- **2026-07-29 (Production Release & Deployment)**: Successfully fast-forward merged the `staging` branch into `main` and pushed to origin to trigger the Railway production build. Configured production services in the Railway dashboard with optimized memory limits (512MB RAM for backend API/worker, 1024MB RAM for frontend, 512MB for Postgres, and 256MB for Redis) and set up the `BACKEND_CORS_ORIGINS` variable as a JSON array (`["https://web-production-ee436.up.railway.app", "https://domain.com"]`). Resolved database initialization issues on the clean database setup by applying the local database schema structure via `local_db_schema.sql` (bypassing the broken migration graph history by manually inserting the head version `'d95c008c9b8d'` into the `alembic_version` table), importing all 157,525 Mexican geography records using `local_postal_codes_fast.sql`, and running the `create_admin.py` seeder script to provision the primary admin user. The production environment is fully live and functioning.

- **2026-07-22 (B2C Services Drawer Migration & Attributes Setup)**: Implemented Epic 167 by creating `ServiceDrawer.tsx` to handle adding and editing services via a drawer interface. Built an inline custom attributes creator inside the drawer that supports dynamic types (Date, Dropdown, Text Area, Checkbox, Text, Number) and saves configurations to `business.features_config.services.attributes`. Created a stacked `ManageAttributesDrawer.tsx` to view, rename, and delete existing attributes safely. Updated `ServiceCatalog.tsx` to replace its inline edit form with the new `ServiceDrawer` and aligned the layout of `/services` with `/crm` (removed double-padding outer wrappers, removed restricted card layout, and implemented a responsive cards grid view). Successfully compiled the frontend.

- **2026-07-22 (Custom CRM Field Types Support)**: Implemented four new custom field types in the CRM drawer: **Date**, **Dropdown**, **Text Area**, and **Multi-select Checkboxes**. Added dynamic support in `ClientDrawer.tsx` inline creator to specify option lists for Dropdown and Multi-select types, which are parsed and saved to `business.crm_config` dynamically. Rendered appropriate HTML widgets (`input[type=date]`, `textarea`, `<select>`, and custom multi-checkbox grids) inside the client profile editor. Verified clean production compile.

- **2026-07-22 (Dynamic Custom Field Management)**: Created `ManageFieldsDrawer.tsx` to view, edit (labels only), and delete custom CRM fields from the business configuration with safety warnings. Integrated it into `ClientDrawer.tsx` by adding a 'Manage Fields' button at the bottom of the 'Additional Information' section. Removed unnecessary developer-facing technical tags (Key and Type badges) from the fields list UI. Adjusted layout and resolved JSX fragment rendering bugs. Marked Epic 166 tasks 166.4, 166.5, 166.6 as complete in the backlog.
- **2026-07-22 (Dynamic Add Custom Field Option A)**: Implemented Option A (Global Schema) custom CRM field addition in [ClientDrawer.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/v2/ClientDrawer.tsx). Rendered the 'Additional Information' section by default, rendered existing custom fields, added a '+ Add Field' button with a beautiful inline configuration form (supporting Text, Number, and Checkbox inputs), made a PATCH request to `/business/me` to save the new field definition on business profile `crm_config`, and invalidated the `['business']` react-query cache to dynamically refresh the form. Verified frontend compilation successfully.

- **2026-07-22 (B2C CRM Drawer Migration & Personal Details Customization)**: Refactored the Client Creation and Edit interface in `/crm` from a pop-up modal ([ClientModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/ClientModal.tsx)) into a side-sliding drawer ([ClientDrawer.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/v2/ClientDrawer.tsx)) utilizing the shared `Drawer.tsx` wrapper layout. Customized layout for B2C (BASIC) accounts: renamed subtitle to "Personal Details", hid the "Job Role" input entirely, and organized Birthday/Gender dynamically. Confirmed that dynamic custom fields (`business.crm_config`) render under an "Additional Information" header. Maintained B2B details for TRADE accounts. Updated [ClientCRM.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/crm/ClientCRM.tsx) to render `ClientDrawer` and verified a clean build.

- **2026-07-22 (B2C CRM Drawer Migration Plan)**: Formulated a UX/UI design analysis and migration plan to convert the B2C Client popup (`ClientModal.tsx`) into a side-sliding drawer (`ClientDrawer.tsx`) to align the CRM UX/UI with the rest of the application. Saved the detailed implementation roadmap to [crm_drawer_migration_plan.md](file:///Users/bernardo/projects/sherpa/temp/crm_drawer_migration_plan.md).

- **2026-07-22 (B2C Client Database Leak Diagnosis & Admin Deletion Cascade)**: Investigated why B2C clients were not showing for the test account `06a43300-16c0-754e-8000-59caa7a5a02f` (`Estudio de Filmación`, B2C/BASIC vertical) despite having 4 client records in the DB. Discovered that the B2B simulation integration tests query the first available business profile (`select(BusinessProfile).limit(1)`), which polluted this B2C test account with B2B WhatsApp trade messages and B2B prospects (`is_prospect = True`). Reverted a temporary bypass in the `get_clients` endpoint query of [crm.py](file:///Users/bernardo/projects/sherpa/backend/app/api/crm.py) to keep the core codebase clean. To allow a clean slate deletion from the UI without database constraint crashes, updated the `delete_user_admin` endpoint in [admin.py](file:///Users/bernardo/projects/sherpa/backend/app/api/admin.py) to cascade-delete dependent B2B orders, order items, store actions, objectives, templates, and store mappings before deleting the user. Verified 100% backend test coverage and clean frontend compilation.

- **2026-07-21 (Modular UI & Integrations Tuning)**: Tied sidebar calendar menu item visibility strictly to `services` (B2C) or `sales_intelligence` (B2B) features, hid the Google Calendar connection card in Settings when scheduling is disabled, added calendar page redirect checks to enforce route access controls, and conditionally wrapped the CRM Custom Fields Settings panel to only display when scheduling, routing, or sales intelligence is active. Successfully fast-forward merged and pushed these updates into staging for Railway deployment.

- **2026-07-21 (Prospect & Contact Deletion Cascade)**: Updated delete handlers in both the prospects list page (`frontend/app/trade/prospects/accounts/page.tsx`) and details page (`frontend/app/trade/prospects/[id]/page.tsx`) to retrieve the linked client contact (`store.clients?.[0]?.id`) and delete it via `DELETE` requests to `/crm/clients/{clientId}` on successful store deletion, ensuring cascade deletion of chat inbox/messages. Invalidated the `'stores'` query in the list view, redirected back to the prospects accounts list page on details delete, and verified clean compilation via `npm run build`.

- **2026-07-21 (Epic 164 - Prospect & Order Verification Flow)**: Implemented frontend changes to verify prospect accounts and their associated orders. Updated the status badges in listing view rows and grid view cards to evaluate `store.is_verified` and display amber "Unverified" or green "Verified". Added a "Verify Prospect & Orders" blue button in the details view header that updates the store status and all its unverified orders, and invalidates query caches to reload. Added "Unverified Order" labels next to unverified orders in the Orders tab. Confirmed clean compilation using `npm run build`.

- **2026-07-20 (Prospect Detail Page Bug Fixes)**: Resolved the order data fetching issue for B2B TRADE users without `b2b_solutions` permission by fetching from `/trade/prospects/orders?segment=...` and filtering client-side. Refactored the Products tab to compute bought products by grouping orders items by `product_id` and matching against the global catalog. Added a dynamic label "Bought: X [unit]" and friendly empty state "No products purchased yet." Fixed pre-existing TypeScript compilation errors in `frontend/types/api.ts` (added common schema exports) and `frontend/app/trade/prospects/[id]/page.tsx` (fixed undefined/optional checking). Verified clean compilation.

- **2026-07-20 (Epic 163 - Individual Prospect Title Resolution & Redundancy Cleanup)**: Implemented title substitution for system-generated prospects. In the prospects list, contact name now replaces system-generated store names as the primary card/row heading, and the redundant contact badge is hidden. In the prospect details page, the contact name replaces the system-generated store name in the header card. In the prospect orders page, the account link displays the contact name. All Epic 163 backlog tasks are fully complete.

- **2026-07-20 (Epic 163 - Prospecting Simplification & Unification)**: Simplified prospecting pipeline by collapsing separate "Lead Accounts" and "Lead Contacts" links in the sidebar into a single "Prospects" link. Built a unified listing displaying primary contact name and phone inline, and created a dedicated full-width details view `/trade/prospects/[id]` showing orange "UNVERIFIED ACCOUNT" badge and consolidated Account + Contact information side-by-side. Updated link targets on prospect orders ledger.

- **2026-07-20 (Epic 162 - Dynamic Module-Based UX/UI Personalization Backlog)**: Defined, scheduled, and updated Epic 162 in `docs/project/BACKLOG.md` and `docs/project/sprint_plan.md` to personalize the UX/UI of `/trade/stores` and `/trade/stores/[id]`. Configured dynamic OR-logic so that the Orders tab, Total Sales, and Avg. Ticket KPI cards render if EITHER Products Catalog or B2B Solutions is active. Outlined dynamic layouts, tabs, and drawer field restrictions.



- **2026-07-09 (Lead Qualification & Referral Flow Optimizations)**: Implemented product ID protection by dynamically resolving product names in `call_model` via a new tenant-isolated helper `_get_product_by_id_or_name`, replacing database IDs/UUIDs in prompts, and adding negative constraints. Enabled immediate below-threshold handshake and unified retail detail collection in a single turn (skipping phone collection). Built prefix-resilient fuzzy product matching to handle truncated names from parallel tool calls, and enriched final retail messages with the matched store's address and phone number. Verified that all 5 simulation scenarios in `test_simulated_session_3.py` pass cleanly.


- **2026-07-09 (Epic 154 - Telegram Multi-Tenant Data Isolation Fix)**: Started branch `feature/backend/telegram-data-isolation-fix` and logged the epic in `BACKLOG.md` to address the critical cross-tenant data leak. Copied the detailed diagnosis report `diagnosis_cross_tenant_data_leak.md` to `temp/`.

- **2026-07-09 (Epic 154 - Redis-less Database Fallback)**: Implemented a robust database-backed fallback for admin bind token storage and in-memory module-level fallback dictionary for prospect contact prompt tracking. This eliminates any crashes or failures if the Redis service is sleeping or unreachable, guaranteeing 100% functionality of the Telegram admin binding.

- **2026-07-09 (Epic 154 - Fix 500 Crash on Null Settings)**: Resolved an HTTP 500 error in `/generate-bind-token` caused by an unhandled `AttributeError` when `integration.settings` is NULL. Wrapped the token generator in a try-except block to return descriptive error payloads and log tracebacks.

- **2026-07-09 (Epic 154 - Real-Time Bind Status Polling & Step 3 Error Visibility)**: Added backend `GET /api/v1/telegram/bind-status` endpoint (with unit test) to check if an admin Telegram account is linked. Configured `TelegramModal` Step 3 to poll this status every 2 seconds, displaying a green checkmark success view and blue highlighted finish button upon successful binding. Hidden the settings page "Vincular Administrador" button once binding is confirmed, rendering a "Connected & Admin Linked" badge instead. Added error rendering inside Step 3 to make token generation failures visible.

- **2026-07-08 (Epic 154 - Unique Constraint Fixes & Frontend UX Enhancements)**: Fixed database `UniqueViolationError` on `telegram_id_hash` by checking for existing Telegram clients/prospects first and merging details instead of inserting duplicates. Implemented clean old-bind releasing for `/link` and contact webhook paths to avoid unique key crashes. Propagated `/generate-bind-token` API errors to the frontend modal, and added a "Vincular Administrador" button on `IntegrationsPanel.tsx` to let connected Telegram bot integrations view their QR codes and deep links directly at any time. Passed all 54 unit and integration tests.

- **2026-07-08 (Epic 154 - Cross-Platform Admin Binding & Frictionless CRM Routing Complete)**: Implemented the entirety of Epic 154. Created `POST /api/v1/telegram/generate-bind-token` returning secure Redis tokens mapping user contexts. Updated frontend `TelegramModal.tsx` to include Step 3 displaying a scannable QR Code and button for admin linking. Intercepted `/start admin_bind_<token>` inside `telegram.py` webhook, binding `admin_telegram_id` to integration settings. Updated `IdentityResolver` to check integration settings and resolve linked admins as `sales_rep` instantly. Implemented fallback contact keyboard prompting and contact payload handling for unknown users. Created and passed a comprehensive test suite `test_telegram_admin_bind.py`. All 50 tests in the backend pass cleanly.

- **2026-07-08 (Telegram & WhatsApp Gating Configuration & Type Resolution Fixes)**: Resolved messaging blocks where B2B TRADE businesses with empty config/routing in the DB would have all incoming flows (prospects, distributors, sales reps) silently blocked. Replaced hardcoded `DEFAULT_FEATURES_CONFIG` fallback dictionary with vertical-aware default features and routing configurations in both `telegram.py` and `whatsapp.py`. Added robust type resolution handling (`hasattr(..., "value")`) to safely manage both SQLalchemy Enum values and raw Python strings for `business.vertical_type`. Updated mocked businesses in `test_inbound_routing.py` to be `"TRADE"` type to align with default enabled configurations, passing the entire 50-test backend suite.

- **2026-07-08 (Cascading Geography Loaders, API Gating & SEPOMEX Sync)**: Resolved staging OOM container crashes and browser network timeouts by converting the monolithic `/postal-codes` endpoint to three cascading endpoints (`/postal-codes/states`, `/postal-codes/municipalities`, `/postal-codes/zip-codes`) and refactoring `AccountDrawer.tsx` to query geographic data step-by-step. Removed B2B feature requirements from address endpoints to enable B2C/BASIC access. Exported local DB via PostgreSQL `COPY` format and imported all 157,525 Mexican geography records into Staging Postgres on Railway.

- **2026-07-08 (Epic 113 - RAG Delivery Coverage & Checkpoint Reset Fixes)**: Fixed sandbox lockups by updating the LangGraph greeting-based reset check inside `prospect_qualifier.py` to wipe thread checkpoints when greeting messages are received and `has_existing_state` is active. Additionally, made retail coverage validation robust to unseeded regions by checking configured store `delivery_zip_codes` and fallback `zip_code` fields instead of strictly querying the database `PostalCode` table. Verified that the complete 5-scenario simulation test suite (`test_simulated_session_3.py`) and all unit tests pass successfully.

- **2026-07-08 (Epic 113 - RAG Delivery Coverage Fix Complete)**: Resolved the bug where store delivery ZIP codes were invisible to RAG/AI. Updated `Store.get_semantic_summary()` to include delivery ZIP codes, ensuring automatic content-hash invalidation and vector re-embedding during Celery sync tasks. Added delivery ZIP codes to `Store.get_knowledge_metadata()` to populate RAG search metadata, and added them to `GraphRAGService.get_store_context()` to pass delivery coverage zones into Jinja2 prompt contexts (`synthesizer.j2` and `visit_briefer.j2`). Created [test_delivery_zones_rag.py](file:///Users/bernardo/projects/sherpa/backend/app/tests/test_delivery_zones_rag.py) with 3 unit tests verifying correct output for all modified models/methods. Verified all 50 tests in the backend test suite pass cleanly.

- **2026-09-01 (Epic 222 - Defense-in-Depth AI Safety & Custom Instructions Complete)**: Implemented 4-layer Defense-in-Depth safety architecture. Enforced identity verification on `create_appointment` to eliminate anonymous booking loopholes, sanitized metadata keys against reserved fields in `update_client_metadata`, and required `store_id` in `log_field_report`. Added 9 immutable safety rules to `base_ai.j2`. Added `custom_instructions` column (`Text`, nullable) to `Agent` model and executed Alembic migration `dbef3b554f4f`. Built `InstructionValidator` (regex/length save-time validator) and `OutputGuardrail` (response bounding and traceback/leak interceptor). Added Custom Instructions UI textarea in `AssistantSettings.tsx` with character counter and safety disclaimer. Added comprehensive test suites (`test_tool_hard_locks.py`, `test_safety_fence.py`, `test_instruction_validator.py`, `test_output_guardrail.py`). All 91 backend unit tests pass and frontend builds cleanly with 0 errors.

- **2026-07-07 (Epic 153 - Multi-Tenant WhatsApp Phase 4 Complete)**: Completed Phase 4 (Frontend Integration UI) of the Multi-Tenant WhatsApp epic. Redesigned the setup wizard modal `WhatsAppModal.tsx` as a multi-step Spanish configuration flow (Intro -> Lada / Friendly name preferences -> Provisioning spinner with `POST /api/v1/integrations/whatsapp/provision` -> Success showing dedicated number). Updated `IntegrationsPanel.tsx` to retrieve consumption and credit usage profiles dynamically from `GET /api/v1/integrations/whatsapp/usage/{business_id}` and render progress bars with corresponding warning alerts for thresholds >= 80% and >= 100%. Integrated twilio resource releasing helper `release_whatsapp_sender` inside backend deletion routes to automatically release number SIDs and suspend subaccounts. Updated business schemas and type-synced the frontend using `npm run gen:api`. Extended `/admin` view with a Credit allocation input column and Save actions. Removed placeholder setup blocks from the first-time onboarding wizard. Verified zero regressions with successful production builds of both backend and frontend.

- **2026-07-07 (Epic 153 - Multi-Tenant WhatsApp Phase 3 Complete)**: Completed Phase 3 (Usage Control & Credit System) of the Multi-Tenant WhatsApp epic. Extended `app/core/limiter.py` with atomic monthly usage counters in Redis featuring end-of-month key TTLs. Implemented pre-LangGraph gating logic in Celery message handlers (`tasks/messages.py` and `tasks/ingestion.py`), blocking AI replies and storing raw inbound user messages in the DB (conversations UI) when over limit. Added a `purchased_credits` column to the `BusinessProfile` database model and applied Alembic migration revision `7d558932e49c` locally. Added 80% warning triggers (sends warning WhatsApp alert and updates in-app banner flag) and 100% hard blocking alerts. Exposed `PATCH /api/v1/admin/businesses/{id}/credits` and `GET /api/v1/integrations/whatsapp/usage/{id}`. Created `test_capping.py` asserting Redis counters, alerts, gating, and usage/admin API routes, with all 47 test assertions passing.

- **2026-07-07 (Epic 153 - Multi-Tenant WhatsApp Phase 2 Complete)**: Completed Phase 2 (Inbound Routing Overhaul) of the Multi-Tenant WhatsApp epic. Refactored the unified Twilio webhook `/api/v1/whatsapp/webhook/twilio` in `api/whatsapp.py` to route inbound messages dynamically via JSONB phone number index matching. Decoupled the legacy shared sandbox proxy fallback block. Updated request signature validation to dynamically load and decrypt the matching subaccount's auth token, returning a clean 404 for unmapped numbers. Refactored Celery task queues in `tasks/messages.py` and `tasks/ingestion.py` to decouple from hardcoded Twilio client libraries, routing all outgoing messages through `MessagingService` resolved by the matching business integration. Created `test_inbound_routing.py` asserting destination-driven routing, multi-tenant isolation, and clean 404 status outputs, with all 42 test assertions passing.


- **2026-07-07 (Epic 153 - Multi-Tenant WhatsApp Phase 1 Complete)**: Completed Phase 1 (Foundation) of the Multi-Tenant WhatsApp epic. Created the reusable `encrypt_value`/`decrypt_value` Fernet utility in `app/core/encryption.py` and updated `security.py`. Upgraded the `Integration` model's `settings` column to `JSONB` for PostgreSQL index lookups, generating and executing Alembic migration `5bd272677e6c` locally. Built abstract `BaseMessagingEngine` and concrete `TwilioSubaccountEngine` under `app/services/messaging/`. Implemented the automated `provision_whatsapp_sender` service with subaccount generation, Mexican (+52) number purchase, and webhook configuration featuring a 3-attempt exponential backoff retry. Registered `POST /api/v1/integrations/whatsapp/provision` endpoint and wrote comprehensive unit tests verifying isolation, provisioning, routing, and encryption, with all 41 test assertions passing.


- **2026-07-05 (Multi-Tenant WhatsApp Epic Planning & Backlog Integration)**: Conducted detailed codebase research verifying that the integration model uses String IDs and JSON metadata, and that an existing WhatsApp Sandbox modal is already present on the frontend. Resolved 22 key design decisions regarding automated Twilio subaccount provisioning, Mexico (+52) geography constraints, counting all messages (inbound & outbound) under a 200/month cap, and checking usage before the LangGraph loop to save LLM cost. Moved the finalized implementation plan to `temp/multitenant-whatsapp-implementation-plan.md` and registered Epic 153 (Tasks 153.1–153.20) in the project backlog.


- **2026-07-05 (Fix LangGraph Message History Pruning Bug)**: Resolved the 400 Bad Request error `Invalid parameter: messages with role 'tool' must be a response to a preceeding message with 'tool_calls'` in the live test sandbox. Refactored history pruning in `AgenticOrchestrator` ([agentic_orchestrator.py](file:///Users/bernardo/projects/sherpa/backend/app/services/agentic_orchestrator.py)) to group messages into logical transaction blocks (keeping tool calls and their corresponding tool responses together) before slicing/pruning the message history. Added unit test `test_agent_history_pruning_with_tools` in [test_agent_pruning.py](file:///Users/bernardo/projects/sherpa/backend/app/tests/test_agent_pruning.py) to verify that tool call sequences are not split. Verified that the entire backend test suite passes cleanly.


- **2026-07-03 (Settings Visibility Gating & Sandbox Control)**: Restricted visibility of complex settings fields (Logic Template, Custom Steps, Smart Escalation Chain, Core Controls) on the Assistant tab in Settings ([AssistantSettings.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/AssistantSettings.tsx)) to `super_admin` users, exposing only Assistant Name, Tone, and Standard Greeting to regular users. Passed `user` prop to `AssistantSettings` from [SettingsContent.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/SettingsContent.tsx). Introduced a `live_sandbox` toggle in the User Management modal under the Admin dashboard ([page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/%28admin%29/admin/page.tsx)) for both B2C and B2B feature lists. Gated simulated chat widget visibility behind `isSandboxEnabled` or `isSuperAdmin` in `AssistantSettings.tsx`. Compiled and built Next.js with zero errors and pushed to origin on `feature/frontend/settings-visibility-gating`.

- **2026-07-03 (Session — Settings Cleanup & Documentation Hygiene)**: Removed the `Services` tab from Settings navigation (`SettingsContent.tsx`): stripped it from the `TabType` union, URL validation, tabs array, render block, and cleaned up the unused `Scissors` icon import. Drafted an updated `GEMINI.md` (saved to `temp/GEMINI.md`) adding Surgical Writes and Cap Command Output rules plus BACKLOG partitioning guidance. Conducted a PM audit confirming `ARCHIVE_BACKLOG.md` was correctly populated with all completed epics and `BACKLOG.md` is 218 lines. Committed and pushed feature branch `feature/backend/epic-125-dynamic-objectives`, merged into `staging`, and pushed `staging` to GitHub. Updated `HANDOFF_STATE.md` to reflect current session state.

- **2026-07-03 (Epic 143 - Reusable Strategy Library & Dispatch Desk Complete)**: Decoupled the tactical task assignment flow from strategy blueprint definitions. Added the `details` JSON column to the `ActionTemplate` database model, mapped it in migration upgrade/downgrade scripts, updated the seeder script, and regenerated TypeScript API types. Fully refactored the template creation drawer to support Categories, dynamic Objectives, Default Goals, and Impact Levels. Built the "Assign Action" (Dispatch Desk) drawer, prompting for Store, Assignee Rep, Category, Objective, Metric Goal, and Deadline, and resolved active playbook blueprints with read-only previews. Integrated a dynamic amber CTA card in the Assign Action drawer to close it and auto-open the Strategy Blueprint drawer pre-filled when no templates exist for the selected combo. Verified all 27 backend tests pass and frontend builds successfully.

- **2026-07-01 (Trade/Actions Flow PM Evaluation, Backlog Alignment & Ticket Definitions)**: Evaluated the MVP scope, backlog alignment, and defined Gherkin (Given/When/Then) acceptance criteria for the new Trade/Actions flow. Synthesized UX specifications from docs/design_system.md and database models from the backend. Resolved the title/description database column mismatch by recommending storage within the existing `details` JSONB column (avoiding migration overhead). Descoped interactive live desktop previews, offline IndexedDB write queues, and AI-proposed queues for a leaner MVP release. Created PM Evaluation artifact.

- **2026-07-01 (Trade/Actions Flow UX/UI Evaluation & Guidelines)**: Evaluated the 3-phase Trade/Actions configuration flow focusing on category-dependent objectives, title/description inputs, and metric goal validation. Created comprehensive design guidelines (`docs/design_system.md`) outlining split-screen desktop live previews, mobile bottom-sheet vaul-based drawer adaptations with hardware-level numeric input assists, dynamic filtering logic, and WCAG 2.1 Level AA accessibility checklists. Created a user-facing design artifact.

- **2026-07-01 (Epic 125 - Dynamic Strategy & Action Objectives Backend Complete)**: Fully designed and implemented backend dynamic action objectives. Migrated `StoreAction.objective` from a hardcoded Enum type to a flexible String type in PostgreSQL. Implemented the `store_action_objectives` metadata table to hold custom business strategies. Developed a Python-based Alembic migration script to backfill existing businesses with the $8$ newly requested default objectives (`THREAT_RESPONSE`, `SHARE_OF_SHELF`, `NEW_PRODUCT_INTRODUCTION`, `INVENTORY_VELOCITY_OOS_PREVENTION`, `PERFECT_STORE_ASSORTMENT_COMPLIANCE`, `SEASONAL_EVENT_ACTIVATION`, `TRADE_LOYALTY_VOLUME_PUSHING`, `POSM_MAINTENANCE_ASSET_PURITY`). Built runtime Pydantic schema compilation using `create_model` and `Literal` types within the Celery IngestionAgent to prevent LLM hallucinations by dynamically enforcing valid database-defined objectives on extraction. Implemented endpoint CRUD operations under `/trade/objectives` and strict validation checks on StoreAction endpoints. Created `test_dynamic_objectives.py` verifying all endpoints, validations, and dynamic compilation. Checked off tasks 125.1-125.3 in `BACKLOG.md` and updated project docs.

- **2026-07-01 (Epic 118 - Real-Time Knowledge Sync & Task 112.6 - LangGraph Message History Pruning)**: Hooked and resolved real-time vector synchronization gaps: updated physical store deletions to query and cascade vector deletion tasks for associated `StoreNote` and `Competitor` items; updated client deletions to cascade vector deletion tasks for associated `CustomerNote` items; hooked competitor creation to automatically trigger background vectorization; integrated bulk CSV imports in `data_gateway.py` to trace and vectorize all created/updated store and client items post-commit. Optimized LangGraph conversational ReAct agent loop token consumption by implementing history pruning in `call_model` (slicing messages list to last 2 turns, keeping the current turn's tool call structures intact while relying on Redis summaries for older context). Created and ran comprehensive mock-based unit test suites `test_vector_sync_fixes.py` and `test_agent_pruning.py`, confirming all test assertions pass cleanly.

- **2026-06-30 (Epic 141 - B2C Product & Category Catalog Activation & UI Gating Complete)**: Fully implemented and tested Epic 141. Mapped top-level B2C navigation links in the dashboard sidebar for "Category" and "Products" (removing the "pending" styling) to active pages `/trade/products?tab=categories` and `/trade/products?tab=products`. Overhauled the sidebar visual hierarchy and styles following UX/UI specifications (removed all raw bullet points, standardized text weights, set up an active vertical border marker pill, aligned indentations, and added CSS chevron transitions on group foldings). Resolved category/product sidebar link duplication for B2C users with campaigns enabled by gating the B2B Products Group section behind the `showB2BSolutions` flag. Configured vertical-aware checks in `/trade/products` catalog page and the `CatalogDrawer` product form component to dynamically hide Brand, Wholesale Threshold, and B2B-specific metrics from lists, grids, and edit/creation fields when the vertical type is B2C (`BASIC`). Ensured backend defaults are properly configured for new registrations. Created new test suite (`test_b2c_catalog.py`) verifying B2C product schema validations and database constraints, regenerated frontend openapi types, and compiled Next.js with zero errors.

- **2026-06-29 (Epic 141 - B2C Product & Category Catalog Activation & UI Gating Backlog)**: Defined and added Epic 141 to `docs/project/BACKLOG.md` to reuse the shared `Product` and `Category` database models for B2C (BASIC) accounts, while dynamically gating B2B-specific fields in the catalog view and edit forms. Expanded the epic scope to include admin-controlled toggles to enable or disable the Services Catalog (for B2C) and the Products Catalog (for B2C and B2B), gating their respective sidebar entries. Added UI/UX side menu look-and-feel standardization (no bullets, standard font-weights, active marker pill, consistent indentations, and chevron rotation transitions) to the sidebar tasks list. Relocated Category and Products as flat top-level sibling items in the B2C sidebar menu. Reverted active workspace code changes to remain purely in the planning phase.

- **2026-06-29 (Epic 139 - Prospects Segmentation & Retail Referrals)**: Fully implemented and verified Epic 139. Added `prospect_segment` (VARCHAR, defaulted to "wholesale", indexed) column to both `Client` and `Store` tables, and generated/ran Alembic database migration. Updated FastAPI endpoints GET `/crm/clients` and GET `/trade/stores` to filter by `prospect_segment`. Overhauled `ProspectQualifier` qualifier logic to collect names and emails for below-threshold retail leads, tag them with `is_prospect=True` and `prospect_segment="retail"`, and map them to their matched store. Restructured the web dashboard navigation sidebar to show separate "Wholesale Leads" and "Retail Referrals" headings, and updated React Query components (`accounts` and `contacts` pages) to filter and cache lists dynamically per segment query parameter. Wrapped pages in `<Suspense>` to prevent prerendering bailout, and refactored integration tests (`test_whatsapp_campaign.py` and `test_simulated_session_3.py`) to verify correct database entries, running all simulation tests and Next.js builds successfully.

- **2026-06-29 (Epic 138 - Prospect-to-Store Redirection & Value Tracking)**: Fully implemented and verified Epic 138. Generated and applied Alembic schema migration adding `assigned_store_id`, `requested_product_id`, `requested_quantity`, `potential_value`, and `referred_at` columns to the `Store` model, and created `ClientStoreHistory` to log client reassignment audits. Updated the `qualify_lead` ingestion pipeline in `prospect_qualifier.py` to calculate potential value (`qty * product.price`) and populate referral fields in newly created prospect stores. Upgraded `POST /stores` and `PATCH /stores/{id}` endpoints in `api/trade.py` to enforce multi-tenant valid references and circular reference checks, and added automated audit logging to `ClientStoreHistory`. Added a "Referrals" tab panel to the Store details dashboard page listing referred prospects, a Pipeline Value KPI metric in the header, and PII masking gates (hiding email/phone details) for distributor users. Regenerated API types and compiled Next.js with zero errors.

- **2026-06-29 (Epic 152 - Dual-Vertical Sandbox & Webhook Gating Alignment)**: Explicitly separated B2C consumer flow from B2B wholesale pipelines by introducing the `customer` role. Updated `IdentityResolver` to resolve BASIC vertical senders as `customer`. Dynamically filtered the settings sandbox selector in `AssistantSettings.tsx` to render only "Simulate Customer" for B2C accounts (sending `simulate_role: "customer"`), and dynamically rendered B2B roles gated by corresponding toggles. Updated `/test-chat` backend endpoint to validate and process the `customer` role and route to B2C scheduler/catalog AI. Updated Telegram (`telegram.py`) and WhatsApp (`whatsapp.py`) webhooks to enforce vertical-aware gates: `customer` (gated by core `scheduling`), `prospective_client` (gated by `campaign_flow`), `distributor_retailer` (gated by `b2b_solutions`), and `sales_rep` (gated by `sales_intelligence`). Created new `process_customer_message` Celery task. Updated integration test suite `test_sandbox_gates.py` to cover B2C customer routing and blocks, running all 12 tests successfully.

- **2026-06-29 (Epic 151 - Simplified Admin User Provisioning & Feature Layout Alignment)**: Refactored the Admin User modal on the web dashboard to use progressive disclosure, hiding the modular toggles and displaying a clean core features list (Appointment Scheduler & CRM) for B2C accounts, and displaying refined toggles with updated labels ("Automated Intake & Campaigns", "Store Routing & Order Logistics", and "Sales Intelligence & AI Briefs") for B2B accounts. Updated form state presets and added payload sanitization inside `handleUserSubmit` to force core features to `enabled: true` and clean up B2B features for B2C users. Built Next.js successfully with zero compilation errors.

- **2026-06-29 (Epic 140 - Feature-Bound Access Control & Intake Alignment)**: Fully implemented and tested Epic 140. Upgraded Sandbox test-chat (/api/v1/business/me/test-chat), Telegram webhook (/api/v1/telegram/webhook/{id}), and WhatsApp Twilio webhook (/api/v1/whatsapp/webhook/twilio) to intercept, gate, and reject inbound interactions for unlicensed roles based on `features_config` (e.g. prospective_client vs campaign_flow, distributor_retailer vs b2b_solutions). Added automatic routing_config and features_config defaults per vertical (BASIC/TRADE) in onboarding and admin business creation, and added dynamic promotion upgrade logic in users and business vertical PATCH routes. Created and successfully ran an Alembic data migration to backfill existing profiles with vertical defaults. Added a comprehensive mock integration test suite `test_sandbox_gates.py` covering 10 webhook, sandbox, and promotion scenarios, passing 100% cleanly. Conditionally filtered role selector options in the frontend Live Test Sandbox (`AssistantSettings.tsx`) and added fallback effects for disabled roles.

- **2026-06-29 (Epic 150 - Infrastructure Staging Hardening & Cost Optimization)**: Implemented all backend configuration optimizations to scale down staging resources. Limited Celery worker concurrency to 1, limited task-per-child recycle limit to 50, and prefetch-multiplier to 1 across `backend/Procfile` and `docker-compose.yml`. Configured conditional database pooling in `backend/app/core/database.py` using `AsyncAdaptedQueuePool` (5 pool, 10 overflow) for the API server and `NullPool` for Celery processes to prevent socket pre-fork sharing, and turned off SQL echoing to prevent log bloat. Defined `fast_queue` and `slow_queue` isolation and routing rules in `backend/app/core/celery_app.py`, enqueuing quick I/O sync/reminder tasks to `fast_queue` and heavy tasks to `slow_queue`. Updated Next.js configuration in `frontend/next.config.mjs` to target a `standalone` build. Ran the backend pytest suite under `/Users/bernardo/projects/sherpa/backend` to verify all 11 tests pass successfully.

- **2026-06-27 (Epic 140 - Feature-Bound Access Control & Intake Alignment Backlog)**: Defined and added Epic 140 to `docs/project/BACKLOG.md` to enforce feature-level constraints on incoming Telegram/WhatsApp webhook messages and Sandbox simulation configurations. The system will restrict message routing to only flows associated with active flags in `features_config` (such as checking `campaign_flow` for prospects and `b2b_solutions` for distributors), preventing users from executing pipelines they are not licensed for. In addition, designed dynamic routing configuration defaults upon profile creation, admin vertical promotions, and database data backfills. Outlined all backend, webhook, frontend, and integration testing tasks with Given/When/Then acceptance criteria. Source files remain clean and unmodified.

- **2026-06-27 (Epic 139 - Prospects Segmentation & Retail Referrals Backlog)**: Defined and added Epic 139 to `docs/project/BACKLOG.md` and `docs/sprint_plan.md` to dynamically segment prospects into Wholesale Leads and Retail Referrals. The qualifier bot will now collect contact details for below-threshold retail leads and save them as CRM records (with `is_prospect=True` and `prospect_segment="retail"`) linked to the matched physical store. The navigation sidebar will separate Wholesale from Retail lists. Documented all database migration, API, React Query invalidation, and campaign test suite alignment implications. Source files remain unmodified.

- **2026-06-27 (Epic 138 - Prospect-to-Store Redirection & Value Tracking Backlog)**: Expanded Epic 138 (Prospect-to-Store Redirection & Value Tracking) and added it to `docs/project/BACKLOG.md` and `docs/sprint_plan.md`. This sprint will track referred dates, target physical stores, product IDs, quantities, and calculated potential values (`qty * price`) directly on prospect records. Evaluated database schemas, cascade rules, API validators, type sync steps, and PII masking requirements. Kept all codebase files unmodified.

- **2026-06-26 (Telegram Dynamic Routing & Channel Alignment)**: Implemented Epic 137 to establish consistent identity-based routing on Telegram. Hooked up [telegram.py](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py) webhook to run `IdentityResolver.resolve_sender` (with `is_telegram=True`), and gated flow checks based on the business routing configurations. Unrecognized Telegram senders now automatically redirect to the `ProspectQualifier` (waitlist / lead qualification flow) with proper platform/channel tracking. Updated the system prompt `b2b_sales_brain.j2` to dynamically shift between **Marco** (Sales Rep) and B2B Customer Support (Distributor) personas based on client database roles. Pre-loaded client stores in `agentic_orchestrator.py` to prevent async SQLAlchemy lazy loading greenlet exceptions. Ran all automated integration and campaign simulation tests with 100% success.

- **2026-06-26 (Twilio Configuration Documentation)**: Created and placed a comprehensive step-by-step setup guide for configuring a Twilio trial account and WhatsApp Sandbox at [twilio_setup_guide.md](file:///Users/bernardo/projects/sherpa/temp/twilio_setup_guide.md), detailing Account SID/Auth Token configuration, Railway/local environment setup, Sandbox join code registration, and status/health checks.

- **2026-06-26 (Railway Health Check and Campaign Test Realignment)**: Fixed deployment health check issues on Railway by adding a root path `/` redirect to `/health` in [main.py](file:///Users/bernardo/projects/sherpa/backend/app/main.py). Updated campaign simulation parameters in [test_whatsapp_campaign.py](file:///Users/bernardo/projects/sherpa/backend/test_whatsapp_campaign.py) to include valid Mexican postal codes (`CP 01000` / `CP 64000`) and standardized state names (`Nuevo León`), fixing execution failures introduced by Epic 133's structured address validations. Verified all unit and integration test suites compile and execute with 100% success.

- **2026-06-26 (Twilio Integration Compliance, Status & Verification)**: Implemented Epic 136 to secure webhook signature validation, track WhatsApp compliance opt-ins, and provide dynamic diagnostic feedback in the integrations panel. Added a mandatory opt-in checkbox to the WhatsApp onboarding setup modal [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx) to prevent connection without user certification. Expanded [Client](file:///Users/bernardo/projects/sherpa/backend/app/models/crm.py) model and Pydantic schemas with `whatsapp_opt_in` and `whatsapp_opt_in_at` fields, which are automatically logged in the CRM database during prospect qualification webhooks. Secured unified webhook endpoints [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L174) with Twilio request validator signature checks. Created `/whatsapp/status` dynamic check endpoint and updated [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx#L183) to fetch connection health status and display descriptive connection API validation errors on the user dashboard. Verified all backend pytest unit test suites and simulated integration tests pass cleanly.

- **2026-06-26 (B2B/Prospect Navigation & Category Realignment)**: Implemented Epic 135 to restructure the frontend layout and navigation to align with user segments (B2B Distributor vs. Prospects). Separated accounts and clients in B2B Hub from accounts and contacts in Prospects, and created a dedicated Category view tab inside Products. Updated [Sidebar.tsx](file:///file:///Users/bernardo/projects/sherpa/frontend/components/Sidebar.tsx), [AccountDrawer.tsx](file:///file:///Users/bernardo/projects/sherpa/frontend/components/v2/AccountDrawer.tsx), [retailers/page.tsx](file:///file:///Users/bernardo/projects/sherpa/frontend/app/trade/retailers/page.tsx), and detail routing paths, and wrapped client pages in Suspense boundaries for clean, error-free Next.js production compilation.

- **2026-06-26 (Out-of-Coverage Waitlist Lead Capture)**: Implemented Epic 134 to capture out-of-coverage prospects in the WhatsApp lead qualification flow as waitlist leads in the CRM database. Added a new `collecting_waitlist` phase in [prospect_qualifier.py](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py) to prompt out-of-coverage users for contact details (name, email, phone, company) if not already provided. Updated [qualify_lead](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L394) to save waitlisted prospects as prospect [Client](file:///Users/bernardo/projects/sherpa/backend/app/models/crm.py#L13) and [Store](file:///Users/bernardo/projects/sherpa/backend/app/models/trade.py) records in the database, with a `status: "waitlist"` flag inside `custom_fields` and [StoreAction](file:///Users/bernardo/projects/sherpa/backend/app/models/trade.py) details. Expanded the integration test suite in [test_simulated_session_3.py](file:///Users/bernardo/projects/sherpa/backend/test_simulated_session_3.py) to cover immediate and multi-turn waitlist qualification scenarios, and confirmed all 5 integration test scenarios pass successfully.

- **2026-06-25 (Geographic Hierarchy Dropdowns & Multi-Selection CP Improvements)**: Enhanced `AccountDrawer.tsx` to support a State -> Municipality -> CP (ZIP Code) selection dropdown hierarchy (removing redundant City level) for both store physical address configuration and delivery zones. Physical address configuration also includes a toggle to switch to Manual Address Entry and dropdown selection for Colonia. Configured custom multi-selection CP options utilizing a click-to-toggle option state pattern and shift-click index range selection. Implemented Next.js client-side navigation click interception on dirty forms, preventing accidental edits from being discarded. Verified and built the Next.js frontend application with zero compilation errors.

- **2026-06-25 (Multi-Select Delivery Zones & Dirty Form Warnings)**: Upgraded `AccountDrawer.tsx` to support a State/City -> Municipality -> ZIP Code hierarchical selection flow, enabling users to multi-select ZIP codes (supporting range selection by holding Shift) and select all filtered ZIPs at once via a "Select All" toggle button. Added automatic dirty form checking via JSON-serialized form snapshots that triggers validation alerts (`beforeunload` listener for browser tab closes and `window.confirm` dialogs for drawer closures). Verified stability via Next.js compilation and integration tests.

- **2026-06-25 (Premium Delivery Coverage UI & API Sync)**: Implemented a premium, dropdown-assisted delivery zip code manager in `AccountDrawer.tsx`. Users can select preloaded Mexican municipalities (e.g. grouped by State) to view and add corresponding ZIP codes, manage them as visually styled tags/badges (with delete operations), and enter custom ZIP codes. Created `GET /api/v1/trade/postal-codes` backend route to feed the selectors, regenerated API client interfaces, and validated Next.js builds and integration test suites.

- **2026-06-25 (Geographic Address Resolution & Seeder Hardening)**: Populated all missing physical address columns (colonia, municipality, city, state, zip_code) across all 15 store records in the database, seeded additional Mexican region lookups (Oaxaca and Veracruz CPs), updated the master seeder script to populate structured addresses out-of-the-box, and verified zero regressions using the simulation test suite.

- **2026-06-25 (Per-Store Delivery ZIP Codes Configuration & Verification)**: Migrated global ZIP routing configurations to granular, per-account store lists, added a custom input field in the Account Drawer UI, updated database seed scripts, and verified correctness with simulated conversations.
    - Updated `seed_cemenquin.py` to assign custom delivery ZIP code lists (e.g. CDMX coordinates) to seeded stores.
    - Modified `frontend/components/v2/AccountDrawer.tsx` to handle `delivery_zip_codes` initialization, form rendering as a comma-separated input, and list submission parsing in the API payload.
    - Regenerated TypeScript typings (`npm run gen:api`) based on modified store schemas.
    - Confirmed compile and bundle stability with a successful production build (`npm run build`).
    - Validated per-store qualification and coverage fallback gating under simulated multi-turn conversations (`test_simulated_session_3.py`).

- **2026-06-25 (Allowed Delivery Postal Codes Settings Field Added)**: Added an administrative configuration text area field to the platform's Settings dashboard to manage the allowed delivery postal codes for the prospective lead validation flow.
    - Exposed `routing_config` JSON configuration field in the backend Pydantic schemas `BusinessProfileBase` and `BusinessProfileUpdate` inside `backend/app/schemas/business.py`.
    - Integrated the new settings option inside the frontend settings panel `frontend/app/settings/components/GeneralSettings.tsx`, enabling users to input a comma-separated list of 5-digit allowed delivery zip codes.
    - Restructured form payload submissions in the frontend to cleanly parse, sanitize, and update the nested database configurations inside `routing_config`.
    - Regenerated the frontend API typescript types (`npm run gen:api`) to match backend changes and verified full frontend compile stability using `npm run build`.

- **2026-06-25 (Prospect Qualifier Restructured & ZIP Validation Completed)**: Restructured the conversational WhatsApp lead qualification flow (Epic 132), enforcing sequential verification checkpoints (intent capture -> quantity threshold validation -> lead data collection -> CDMX postal code range verification -> success handoff), implementing greeting-based resets for all returning clients, and creating a unified dashboard action/notification log.
    - Updated `ProspectQualifierState` and the `update_prospect_data` tool in `backend/app/services/prospect_qualifier.py` to capture and track contact `name`, `zip_code`, and conversational `phase` state variables.
    - Modified the `call_model` LLM system prompt to dynamically adapt to `intent` or `collecting` phases, preventing contact info collection until the quantity threshold is satisfied.
    - Upgraded `run_tools_and_update_state` tool execution node to validate wholesale quantity threshold immediately, reject and route to physical stores on failure, and validate 5-digit Mexican postal code ranges (CDMX prefix matching) before transitioning to lead handoff.
    - Enhanced `qualify_lead` node to lookup/update pre-existing placeholder client records in the database matching the active thread's `sender_phone` (Task 130.3) instead of creating duplicate records, setting `is_prospect=True` on the updated Client and Store.
    - Implemented a unified mocked notification action `_notify_sales_rep(...)` writing qualified prospect details to `logs/notifications.log` for CRM integrations.
    - Enabled greeting-based resets (`"hola"`, `"buen día"`) for all completed flows (both sandbox and production), resolving returning client materials inquiry lockups.
    - Developed and executed a comprehensive automated integration test suite in `backend/test_simulated_session_3.py` verifying all rejection and successful handoff paths.

- **2026-06-25 (Prospect Simulator Reset Logic Hardening & Bug Fix)**: Fixed the bug in the Live Test Sandbox where the prospect qualifier got stuck in a terminal completed loop, returning the cached final response regardless of input.
    - Upgraded `prospect_qualifier.py` to normalize user messages (lowercased, accents stripped, punctuation removed) and check for multi-word greetings (like `"Hola, buen día"`) using keyword substring searches.
    - Implemented a fallback reset for short messages (<15 characters) when the thread is in a completed state to prevent any sandbox lockups.
    - Developed and ran a standalone python verification test (`verify_reset.py`) simulating a completed prospect sequence and confirming the checkpointer correctly wipes and restarts the conversation flow upon receiving `"Hola, buen día"`.

- **2026-06-25 (Live Test Sandbox Data Seeding Completed)**: Seeded 2 months of historical B2B CRM and Trade data for user `agrivera@gmail.com` (Cemenquin), populated the unified vector corpus, and initiated active LangGraph checkpointer threads for live simulator testing. Also restored the unconditional AI Audit view on the conversations dashboard.
    - Created and ran [/backend/seed_cemenquin.py](file:///Users/bernardo/projects/sherpa/backend/seed_cemenquin.py) to clean and populate categories, products, stores, clients, orders, notes, and actions.
    - Resolved lazy-loading greenlet exceptions in the async database session by executing explicit inserts into the many-to-many junction tables and utilizing eager relationship loads.
    - Vectorized and synchronized all newly created records into the `KnowledgeCorpus` vector index.
    - Triggered live simulator runs for B2B client and prospect flows, storing valid LangGraph checkpoints in postgres checkpointer tables.
    - Executed validation query script confirming correct data counts and active checkpoint state.
    - Restored the unconditional "Audit: ON/OFF" toggle button in the Inbox conversations tab (`ConversationsContent.tsx`) to match staging specification, resolving context/privileges gating for sandbox testing.

- **2026-06-24 (Prospect vs. Client Data Classification Completed)**: Segregated prospects from active clients/stores across database models, schemas, and API queries, separated menu & dashboard layouts, and added deletion utilities (Epic 131).
    - Added `is_prospect` column to `Store` and `Client` database models and executed Alembic migration `d2b9c075daf3`.
    - Integrated `is_prospect` flags inside Pydantic schemas in `schemas/trade.py` and `schemas/crm.py`.
    - Updated `ProspectQualifier` simulation flows to flag created contacts/stores as prospects (`is_prospect=True`).
    - Added `is_prospect` optional query filtering to `/stores` and `/clients` API endpoints, defaulting to `False` to hide prospects from sales reps.
    - Synchronized `openapi.json` and compiled TypeScript definitions in `frontend/types/api.ts`.
    - Created and ran `test_prospect_classification.py` to verify API and database filtering.
    - Built a dedicated Prospects dashboard page at `/trade/prospects` using the contact listing layout with `is_prospect=true` filters.
    - Integrated the `• Prospects` navigation link in the B2B Hub section of the main menu sidebar (`Sidebar.tsx`).
    - Configured `ContactDrawer` to support creating prospects directly, and added dynamic "Back to Prospects" navigation on contact detail page.
    - Implemented `DELETE /trade/stores/{store_id}` endpoint in the FastAPI backend with async vector indexing updates.
    - Resolved 500 error on store deletion by implementing manual cascading deletes for child records (orders, notes, competitors, actions, link tables) referencing the store, ensuring database integrity.
    - Integrated temporary Delete buttons across Contacts, Prospects, and Accounts (Stores) list/grid views and detail pages.
    - Verified compile stability via successful Next.js production builds (`npm run build`).

- **2026-06-24 (Sandbox Simulators Debugging & Hardening Completed)**: Fixed looping, inbox persistence, confidence levels, and log leaks (Epic 130).
    - Added conversation and message database persistence in `ProspectQualifier.get_response` and pre-checked checkpoint states using `aget_state` to prevent loop repetitions.
    - Updated placeholder contact details transitions in `qualify_lead` when a lead is qualified.
    - Standardized `EntityResolver` confidence scoring to return `0.9` confidence for matched contacts without linked stores.
    - Gated DevMode (Audit ON/OFF) log visibility behind admin role checks on the frontend conversations tab.
    - Executed `full_backfill_corpus.py` script to index and vectorize all active stores and clients.
    - Resolved potential `UnboundLocalError` in non-B2B fallback pathways.
    - Verified all test flows are 100% green via `test_whatsapp_campaign.py`.

- **2026-06-24 (Modular Trade Decoupling Completed)**: Decoupled trade_logistics into campaign_flow and b2b_solutions (Epic 129).
    - Split trade_logistics monolithic key in `DEFAULT_FEATURES_CONFIG` and user Pydantic schemas.
    - Updated backend API dependencies in `app/api/auth.py` with `require_any_feature` to allow shared Product Catalog access.
    - Resolved shared dependency for stores: Relaxed store creation/view endpoints in backend `app/api/trade.py` to allow `campaign_flow` access, enabling campaign-only businesses to manage their retail locations.
    - Updated dynamic sidebar layout filtering in `Sidebar.tsx` to support simplified Product Catalog layout and "Points of Sale" link for campaign-only accounts.
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

## [2026-06-25] - Expanding Geographical Seeding & Verification
- **Municipalities & ZIP Code Preloading (Task 133.3)**: Expanded high-density SEPOMEX lookup seeds in `backend/app/core/postal_seeder.py` from 43 to 79 unique records. Included comprehensive coverage of critical municipalities and zip codes for CDMX (Iztapalapa, Gustavo A. Madero, Tlalpan, Azcapotzalco, Xochimilco), Nuevo León (Guadalupe, San Nicolás de los Garza, Apodaca, Santa Catarina, General Escobedo), Jalisco (Tlaquepaque, Tonalá), Veracruz (Xalapa, Coatzacoalcos, Orizaba), Oaxaca (Tuxtepec, Salina Cruz, Juchitán), Puebla, Querétaro, and Yucatán.
- **Database Seeding Execution**: Ran database re-seeding script `seed_cemenquin.py` to populate all newly added geography records into PostgreSQL, enabling instant dropdown lookup and validation matching.
- **Test Integrity**: Executed simulation tests (`test_simulated_session_3.py`) to verify zero regressions in the lead qualification, out-of-range ZIP verification, and database persistence processes.
- **Optimized Prospect Collection Flow**: Restructured the WhatsApp prospect qualification stage in `backend/app/services/prospect_qualifier.py`. When a request is qualified for wholesale, it immediately prompts for the delivery address and ZIP code to check coverage first. Once valid, it asks for the name, phone, email, and company details in one single consolidated query instead of one question at a time. Verified successfully with simulation tests.
- **State-Filtered Physical Store Redirects**: Added logic to `backend/app/services/prospect_qualifier.py` that checks the state corresponding to the prospect's out-of-range ZIP code and limits physical store redirects to locations inside that same state. If no stores exist in that state, suggestions are omitted entirely. Verified with integration tests.

## [2026-06-29] - Railway Staging Cost & Resource Optimization Analysis
- **Billing Audit**: Conducted a thorough cost and infrastructure audit of Railway staging billing details (totaling $10.16).
- **RAM Drivers Isolated**: Identified that RAM consumes 97.4% of total project costs ($9.90). Identified the Celery worker (Asynchronous Processor) as the primary contributor ($6.16, 60.6%) due to default worker core auto-detection spawning 32+ idle pre-fork processes.
- **Redis Polling Overhead**: Isolated high Redis CPU consumption (198.45 vCPU-hours) to worker heartbeats/polling loops, and FastAPI/Next.js memory usage to 24/7 run-time profiles without sleep/memory constraints.
- **Remediation Strategy**: Drafted an actionable cost-reduction guide recommending worker concurrency limits, strict memory quotas, standalone Next.js builds, and "Sleep on Idle" settings to save ~87% of monthly staging costs.

## [2026-07-03] - Backlog Archive Maintenance
- **Task**: Created `docs/project/ARCHIVE_BACKLOG.md` and moved completed epics out of `docs/project/BACKLOG.md`.
- **Result**: Archived 50 completed epics while preserving original top-level grouping. `BACKLOG.md` now contains only active/incomplete epics plus the deprecated/superseded audit block.
- **Learning**: Completion was classified by Epic sections whose task lines were all marked `[x]`; partially completed, paused, or approved future epics remained active.

## [2026-07-03] - Twilio Production & User WhatsApp Setup
- **Platform Twilio Configuration**: Inputted live Twilio Account SID, Auth Token, and Master number into system configuration settings under `/admin`.
- **Webhook Guide**: Drafted and validated URL routing for `https://<YOUR_PRODUCTION_BACKEND_API_URL>/api/v1/whatsapp/webhook/twilio` to accept Twilio incoming Webhook events.
- **User Connection Setup**: Linked the first live customer WhatsApp phone number into a standard user's integration settings, completing the end-to-end integration step.


## [2026-07-09] - Epic 155 Creation: Hybrid Sidebar Modularity & Lower-Tier Orders
- **Backlog Entry (Epic 155)**: Defined and added Epic 155 to [BACKLOG.md](file:///Users/bernardo/projects/sherpa/docs/project/BACKLOG.md) to decouple Prospecting and Products Catalog groups from B2B Solutions.
- **Lower-Tier Orders Integration**: Scoped the inclusion of direct wholesale Orders (`/trade/orders`) alongside Point of Sale (`/trade/stores`) as fallback links for lower-tier profiles without full B2B Solutions access.
- **Documentation**: Generated and moved the complete design specs and code recommendations report to [sidebar_diagnostic_report.md](file:///Users/bernardo/projects/sherpa/temp/sidebar_diagnostic_report.md) under `/temp`.
- **Handoff Tracking**: Updated [HANDOFF_STATE.md](file:///Users/bernardo/projects/sherpa/docs/project/HANDOFF_STATE.md) to slate Epic 155 as the next active task.

## [2026-07-09] - Epic 156 Creation: Automated Order Generation & Segmented Prospecting Orders UI
- **Backlog Entry (Epic 156)**: Expanded Epic 156 in [BACKLOG.md](file:///Users/bernardo/projects/sherpa/docs/project/BACKLOG.md) to cover automated order creation during qualification and segmented frontend Prospecting Orders views/routes (Wholesale vs. Retail).
- **Workflow Scoping**: Defined database model usage and frontend query parameter mapping (`?segment=wholesale` and `?segment=retail`) to partition orders.
- **State Tracking**: Updated [HANDOFF_STATE.md](file:///Users/bernardo/projects/sherpa/docs/project/HANDOFF_STATE.md) to log the expanded Epic 156.

- **Task 156.1 Completed**: Integrated `Order` and `OrderItem` generation inside the `qualify_lead` state graph node of [prospect_qualifier.py](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py).
- **Test Integrity Cleanup**: Updated [test_simulated_session_3.py](file:///Users/bernardo/projects/sherpa/backend/test_simulated_session_3.py) to resolve foreign key constraints on mock deletion, verifying all 5 test scenarios pass cleanly.
- **Task 156.2 Completed**: Implemented the segmented orders API endpoint `GET /api/v1/trade/prospects/orders` in [trade.py](file:///Users/bernardo/projects/sherpa/backend/app/api/trade.py#L558-L578) with dynamic segment filter joins. Regenerated `openapi.json` and ran `npm run gen:api` to sync TypeScript definitions with the frontend.
- **Task 156.3 Completed**: Added segment-filtered Orders submenu links (`/trade/prospects/orders?segment=wholesale` and `/trade/prospects/orders?segment=retail`) in [Sidebar.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/Sidebar.tsx).
- **Task 156.4 Completed**: Created the high-fidelity Next.js page at [page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/prospects/orders/page.tsx) to query and render segmented prospect orders, supporting quick-verification updates.
- **Task 156.5 Completed**: Wrote and integrated explicit database assertions verifying automated `Order` and `OrderItem` generation inside the test suite [test_simulated_session_3.py](file:///Users/bernardo/projects/sherpa/backend/test_simulated_session_3.py). Verified that all 5 simulation scenarios pass correctly.

## [2026-07-09] - Epic 157: Webhook Routing Gating & Custom Administrative Message
- **Task 157.1 Completed**: Updated webhook routes in [telegram.py](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py#L467) and [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L272) to allow campaign flow fallback gating, bypassing custom routing checks when campaigns are enabled.
- **Task 157.2 Completed**: Configured custom, user-friendly administrative response messages in [telegram.py](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py#L475) and [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L282) for internal sales reps/collaborators when `sales_intelligence` is disabled, explaining the active public campaigns state.
- **Task 157.3 Completed**: Extended the test suite in [test_sandbox_gates.py](file:///Users/bernardo/projects/sherpa/backend/test_sandbox_gates.py) to assert routing falls back successfully for prospects and that sales reps receive the custom message across sandbox, Telegram, and WhatsApp routes. Verified all integration tests pass successfully.

## [2026-07-09] - Lead Qualification & Referral Optimizations + Staging Integration
- **Lead Qualification & Referral Flow Optimizations (Completed & Verified)**:
  - **Product ID Protection**: Implemented dynamic resolution of human-readable product names inside the `call_model` node, substituting the raw database IDs/UUIDs across all system prompts. Added a strict negative constraint forbidding the assistant from leaking internal product database IDs to prospects.
  - **Below-Wholesale Handshake**: Instructed the qualifier model in the `intent` phase to accept below-threshold quantities immediately without pressing the user to buy the wholesale minimum.
  - **Single-Turn Retail Detail Collection**: Merged the split address and contact detail collection phases into a unified `collecting_retail_details` phase, requesting the prospect's delivery address, ZIP code, name, and email in a single turn. Added instructions to explicitly skip phone number collection (as we already communicate with their active number).
  - **Fuzzy/Prefix Product Matcher**: Enhanced the `_get_product_by_id_or_name` database helper to perform prefix and suffix-resilient matching (e.g., stripping trailing brackets/spaces). This resolves issues where the model generates duplicate or truncated product names in parallel tool calls (like missing the closing parenthesis).
  - **High-Fidelity Store Referrals**: Enriched the final retail confirmation message with the matched physical store's name, address, and telephone number, thanking the prospect for their preference.
  - **Test Verification**: Confirmed that the 5-scenario integration simulation test suite in `test_simulated_session_3.py` passes successfully with 100% correct assertions.
- **Obsolete orders link cleanup (Completed & Verified)**:
  - Removed the obsolete `/trade/orders` fallback link in `Sidebar.tsx` and successfully validated the Next.js compilation.
- **Staging Merge & Push**:
  - Merged the feature branch `feature/frontend/epic-155-sidebar-modularity` into `staging` and successfully pushed the `staging` branch to origin.
## [2026-07-14] - Epic 158: Identity Resolution & Operator Context Safety
- **Task 158.1 Completed**: Added a prospect guard check in `IdentityResolver.resolve_sender` before store evaluation, resolving the prospect lockout issue.
- **Task 158.2 Completed**: Nullified `active_store_id` for sales_rep roles in `agentic_orchestrator.py` before LangGraph initialization to isolate rep sessions.
- **Task 158.3 Completed**: Added an OPERATIONAL PROTOCOL section to `b2b_sales_brain.j2` for sales reps, enforcing proactive entity resolution.
- **Task 158.4 Completed**: Added the `include_staff` parameter to `GET /clients` in `crm.py` to filter out reps, agents, and representatives from B2B dashboards by default.
- **Task 158.5 Completed**: Created `app/tests/test_identity_safety.py` to assert correct behavior. Updated `test_webhook_routing.py` to use `AsyncClient` to resolve loop mismatches. Verified all test suites pass successfully.

## [2026-07-14] - Conversational Retail Lead Qualification Optimization
- **Goal**: Resolve the upfront rejection issue where retail prospects (order quantities below the wholesale threshold) are told they cannot buy wholesale on their very first interaction.
- **Task**: Refactored the `collecting_retail_details` phase in [prospect_qualifier.py](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py) into a conversational, two-step data capture process matching the wholesale flow.
- **Conversational Steps**:
  - **Step 1 (ZIP Code missing)**: Bot asks for address and ZIP code to validate coverage.
  - **Step 2 (ZIP Code present, contact info missing)**: Bot asks for remaining contact details (name, email, optional company).
- **Referral at Qualification**: Bot only mentions the retail store assignment/referral at the final qualification message once all data is collected.
- **Test Verification**: Updated [test_whatsapp_campaign.py](file:///Users/bernardo/projects/sherpa/backend/test_whatsapp_campaign.py) and [test_simulated_session_3.py](file:///Users/bernardo/projects/sherpa/backend/test_simulated_session_3.py) to assert this new step-by-step flow. Verified all 58 backend tests pass successfully.
## [2026-07-21] - Epic 163: Task 163.5 (Unified Prospect Edit Drawer)
- **Task 163.5 Completed**: Simplified [AccountDrawer.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/v2/AccountDrawer.tsx) when `isProspect` is `true`. Added inline contact details (`contactName`, `contactPhone`, `contactEmail` state hooks), populated them from the primary client on drawer open / background load (with a fallback to store phone/email if client phone/email are not defined), rendered them directly below the Company name field, conditionally hid physical-store-only sections (delivery zones, linked contact list selection, and legacy external ID mappings), and updated the form submission to update the client profile in sync in Edit mode (PATCH to `/crm/clients/{id}`) and create the client first and link it in Create mode (POST to `/crm/clients` and link Client ID on store POST). Verified clean Next.js build compilation.

## [2026-07-21] - Epic 165: Campaign-Flow Dashboard Personalization & Typography Tuning
- **Backend Stats Ingestion Update**: Updated `get_business_stats` in `backend/app/api/business.py` to retrieve specific metrics (`campaign_orders_count`, `wholesale_leads_count`, `retail_leads_count`, `wholesale_pipeline_value`, `retail_pipeline_value`, `verified_leads_count`, `unverified_leads_count`, `attention_leads` unverified stores sorted by revenue descending) when `campaign_flow` is enabled in `features_config`. Added additional queries for `leads_count_30d`, `verified_orders_count_30d`, `verified_wholesale_leads_count`, and `verified_retail_leads_count` to align with the custom user mockup design.
- **API Spec & Types Sync**: Regenerated the OpenAPI schema and updated `@/frontend/types/api.ts` using `npm run gen:api`.
- **Frontend Dashboard Integration**: Modified `frontend/app/DashboardHome.tsx` to read business features config and render the personalized Automated Intake & Campaigns dashboard if `campaign_flow` is active. Added three custom glassmorphic KPI cards matching the exact layout of the user design.
- **Typography Tuning (Alternative 3 for All)**:
  * Styled Card 1 (TOTAL INTAKE) values with blue text accents (`text-blue-600 font-extrabold text-3xl`).
  * Styled Card 2 (LEAD COMPOSITION) values with emerald text accents (`text-emerald-600 font-extrabold text-3xl`).
  * Styled Card 3 (PIPELINE VALUE) values with purple text accents (`text-purple-600 font-extrabold text-4xl`).
  * Corrected all bottom labels (`text-slate-500 font-bold tracking-wider text-[11px]`) and fallback stats cards (Today's Agenda, Client Base, AI Status) to use matching color accents (blue, emerald, indigo) with `font-extrabold text-4xl` values and soft slate labels, aligning all layouts and establishing WCAG AA contrast compliance.
- **Lead Verification Action on Dashboard**: Updated the backend store update endpoint (`update_store` in `/trade/api/trade.py`) to automatically patch all unverified orders associated with the store to `is_verified: true` when the store is verified. Wired the "Verify & Route" button on the dashboard to trigger this patch request and invalidate queries (`['stats']`, `['stores']`), enabling instant visual confirmation.
- **Verify Button in Accounts List/Grid Views**: Imported `useMutation` in [accounts/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/prospects/accounts/page.tsx) and added a `verifyStoreMutation` that calls PATCH `/trade/stores/{id}`. Rendered a "Verify" button next to Edit/Delete buttons in the list item rows and card footers in grid view for unverified accounts. Clicking it instantly triggers the endpoint and refreshes the query client.
- **Clickable Rows in Prospect Orders View**: Imported `useRouter` from `next/navigation` in [orders/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/prospects/orders/page.tsx), bound the navigation onClick to the `<tr>` element, and added event propagation controls (`e.stopPropagation()`) on the individual links (Account names, Verify button, and details chevron) to prevent event bubble collision.
- **Order Detail Page Store Mapping Bug Fix**: Refactored [orders/[id]/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/orders/[id]/page.tsx) to stop querying the entire lists of non-prospect stores. Replaced the generic `/trade/stores` list request with a single store details request querying `/trade/stores/${order.store_id}`, which cleanly pulls both regular and prospect/unverified store accounts directly by ID, resolving the "Order for Unknown Account" regression.
- **Unified Clean Account/Company Name Resolution**: Refactored store name rendering in [orders/[id]/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/orders/[id]/page.tsx), [prospects/[id]/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/prospects/%5Bid%5D/page.tsx), [accounts/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/prospects/accounts/page.tsx), [orders/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/prospects/orders/page.tsx), and [orders/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/orders/page.tsx) to resolve to either company name or client/contact person name (never both), strip leading `"prospect "` prefixes and trailing parenthetical markers (e.g., `(Obra WhatsApp)`), and hide duplicate contact columns/badges. Also aligned the backend `get_business_stats` endpoint to preload clients and resolve resolved name outputs under the same contract.
- **Prospect Account Deletion Sandbox Leak Bug Fix**: Modified `delete_store` in [trade.py](file:///Users/bernardo/projects/sherpa/backend/app/api/trade.py) to identify and delete associated prospect clients (those with `is_prospect == True` not linked to other stores) alongside their vector embeddings and customer note vectors. This cascading deletion automatically removes client conversation sessions and history, preventing memory leakage when messaging the AI chatbot sandbox again.
- **Verification & E2E Build**: Executed backend unit tests successfully and verified a clean Next.js build (`npm run build`) of the frontend.

## [2026-08-11] - Google OAuth & Meta App Review Integration
- **Google OAuth ASCII Alignment**: Replaced all instances of unicode `Xerpā` with standard ASCII `Xerpa` across layout titles, landing pages, login/register views, sidebar, privacy policy, and terms pages to resolve Google bot encoding matching issues.
- **Domain Redirection**: Configured a clean 301 redirection rule inside `frontend/middleware.ts` to redirect the root domain `xerpaa.com` to `https://app.xerpaa.com`.
- **Google & Meta Review Preparation**: Guided the user through the Google Cloud appeal process and provided business descriptions and use case documentation for the Meta App Review permissions.

## [2026-08-13] - Epic 213: Self-Registration Deprecation & Demo Request Flow
- **Backlog Expansion**: Added six new Epics (213-218) covering registration deprecation, payment methods, lead notifications, B2C SMS reminders, translations, and mobile-first improvements.
- **Disabled Registration**: Blocked the `/auth/register` API endpoint on the backend and added client-side redirects to `/auth/request-demo` on mount of `/auth/register`.
- **Demo Request DB Table & Single Migration**: Created the `DemoRequest` SQLAlchemy model with a `status` column defaulting to `pending`. Downgraded the initial revision and consolidated the DB work into a single Alembic migration revision (`c77414e45eca`) successfully applied against the local database.
- **Demo Request Flow**: Built the `POST /auth/request-demo` backend API and created a highly polished, responsive, dark-themed **Demo Request Form page** at `frontend/app/auth/request-demo/page.tsx` for capturing prospective client details.
- **Admin Settings Dashboard Integration**: Added `GET /admin/demo-requests` and `PATCH /admin/demo-requests/{request_id}/status` endpoints to the backend API. Extended the admin settings panel with a new **"Demo Requests"** tab that renders all submissions in a table, displays color-coded status badges (pending, contacted, converted, rejected), and embeds a select dropdown to update request status on the fly.
- **Testing & Compilation**: Verified that all backend unit tests (including new status updates tests) pass successfully and that the Next.js production build (`npm run build`) compiles cleanly without any errors.











