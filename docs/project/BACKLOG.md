# Sherpa B2B Sales Intelligence Pivot (PRIMARY)

## Epic 105: Audio Ingestion & Transcription (PAUSED)
- [ ] Task 105.1: Implement OpenAI Whisper API utility (`core/audio_service.py`) to transcribe voice notes.
- [ ] Task 105.2: Update WhatsApp Webhook to download and process `audio/ogg` media messages.
- [ ] Task 105.3: Update Telegram Webhook to download and process `voice` messages.
- [ ] Task 105.4: Route transcribed text automatically into the B2B Ingestion Agent.

## Epic 108: The Actionable Intelligence Ledger (Frictionless CRM)
**Objective**: Transition from purely narrative visit notes to a structured ledger of Marketing and Commercial actions, automatically extracted by AI to power management dashboards and future "Active AI" interventions.

- [x] Task 108.1: **Schema Implementation**: Create the `StoreAction` model with fields for `category` (MARKETING, COMMERCIAL), `objective` (THREAT_RESPONSE, ANNIVERSARY, etc.), `impact`, and `details` (JSONB).
- [x] Task 108.2: **AI Extraction Logic**: Update the `process_b2b_ingestion` pipeline to use a specialized LLM parsing step to identify and populate `StoreAction` records from raw chat notes.
- [x] Task 108.3: **Historical Backfill**: Re-process existing mock notes (from the last 60 days) into the new `StoreAction` table to ensure dashboards are populated.
- [ ] Task 108.4: **Dashboard API**: Create specialized endpoints for high-level reporting (e.g., actions by objective, visits per month, success rates).
- [ ] Task 108.5: **Opportunity Inbox**: Implement the AI-proposed action queue where the system surfaces recommended actions (e.g., from anniversary triggers or competitive threats) for Rep approval. *(Note: The Strategy Desk list view was delivered under Epic 121.4.)*
- [ ] Task 108.6: **Anniversary Trigger**: Implement a background job that automatically generates a `StoreAction` (PROPOSED) when a store's `opening_date` is approaching.

## Epic 113: Relational Graph-Enriched RAG (APPROVED)
**Objective**: Evolve the GraphRAG engine by adding a structured **"Identity Link"** layer in Postgres. This allows the AI to perform high-precision multi-hop reasoning (e.g., following a contact across multiple stores) without the latency or infrastructure cost of a dedicated GraphDB.

**Strategic Guardrails**:
1. **Strict Hop Limit**: Graph traversals via SQL are capped at **2 levels** (e.g., Store -> Client -> Other Stores).
2. **Confidence Threshold**: Any AI-extracted link with a confidence score **< 0.85** is hidden from the retriever until confirmed.
3. **Isolation First**: Global discovery is strictly toggled; multi-hop results are **suppressed** during active visit sessions unless explicitly requested.
- [x] Task 113.1: **RAG Delivery Coverage Fix**: Resolve RAG/AI invisibility for store delivery zip codes by propagating them to semantic summaries, metadata, and GraphRAG context.
- [ ] Task 113.2: **Polymorphic Link Schema**: Create the `knowledge_links` table with fields for `source_corpus_id`, `target_entity_type`, `target_entity_id`, `confidence_score`, and `link_provenance`.
- [ ] Task 113.3: **High-Confidence Enrichment Pipeline**: Implement a Celery task using Gemini Flash to parse `KnowledgeCorpus` chunks and identify exact relational entity IDs.
- [ ] Task 113.4: **Precision Context Injection**: Refactor the Retriever to perform "Hard-Coded Lookups" for exact entity names found in the query, bypassing vector similarity for known nodes.
- [ ] Task 113.5: **Multi-Hop SQL Traversal**: Implement SQL CTEs for neighboring account discovery (Max 2 Hops) to connect disparate intelligence nodes (e.g., shared competitors or managers).
- [ ] Task 113.6: **Dynamic RRF Weighting**: Update Hybrid Search ranking to prioritize Relational Hits (2.0 weight) over Keyword (1.5) and Semantic (1.0) hits.

---

## Epic 114: Modern Account Intelligence UI (V2)
**Objective**: Overhaul the account management experience with a modern, high-density interface that surfaces pre-calculated Dossiers and actionable intelligence.

- [x] Task 114.1: **V2 Scaffolding**: Implement the modernized Account (Store) and Contact (Retailer) List and Detail pages under `/trade/v2/`.
- [x] Task 114.2: **Content-Aware Intelligence**: Implement intelligence extraction and filtering that surfaces Risks/Opps regardless of the primary note label.
- [x] Task 114.3: **People V2 Redesign**: Implement the high-end "Intelligence Dossier" for Contacts, featuring a unified context grid and dark-themed AI sidebar.
- [ ] Task 114.5: **Mobile-First Ingestion**: Optimize the note-taking flow for mobile users (Quick Actions).

## Epic 119: The Sherpa Ingestion Engine (V2)
**Objective**: Transition from beta placeholders to a high-end, high-volume bulk ingestion system that powers the Trade intelligence corpus.

- [ ] Task 119.1: **Guided Bulk Wizard**: Implement the 3-step UI (Upload -> AI-Assisted Mapping -> Conflict Resolution) with real-time progress feedback.
- [ ] Task 119.2: **Association Ingestion Logic**: Enhance the `Data Gateway` backend to handle bulk linking of Stores and Clients via `external_id` mapping.
- [ ] Task 119.3: **Deduplication & Conflict UI**: Build a side-by-side comparison interface for manual resolution of data collisions during import.
- [ ] Task 119.4: **Incremental Knowledge Sync**: Implement post-import hooks to trigger vector re-embedding for all newly ingested or modified entities.

---

## Epic 125: Dynamic Strategy & Global Playbooks
**Objective**: Transition the static, hardcoded Action Objectives and local-only templates into a dynamic, superadmin-configurable system framework.

- [x] Task 125.1: **Database Schema Migration**: Create the `store_action_objectives` table, replace the Enum-based objective field in `StoreAction` with a String, and backfill existing businesses.
- [x] Task 125.2: **Backend CRUD & Scoping APIs**: Implement standard CRUD endpoints for `/trade/objectives`.
- [x] Task 125.3: **Dynamic AI Ingestion Classification**: Modify the background Celery extraction jobs to query active `action_objectives` from the DB.
- [ ] Task 125.4: **Admin Management Console (UI)**: Build a Superadmin control panel under `/admin` to manage Action Objectives and templates.
- [ ] Task 125.5: **Strategy Desk Integration (UI)**: Refactor the Objective select dropdown and Template selector to fetch dynamic values from the API.

---

## Epic 160: Data-Driven Qualification Funnel Engine (FUTURE)
**Objective**: Replace the hardcoded phase logic, system prompts, and field requirements in `prospect_qualifier.py` with a configurable, admin-managed qualification funnel.

- [ ] Task 160.1: **Schema Design**: Create `QualificationStep` model with `step_order`, `phase_name`, `required_fields` (JSONB), `prompt_template`, `transition_condition`, and `funnel_id` FK.
- [ ] Task 160.2: **Dynamic Prompt Engine**: Refactor the `call_model` node to load `prompt_template` from the DB.
- [ ] Task 160.3: **Generic Transition Logic**: Replace the nested `if/elif` phase transitions with a generic engine.
- [ ] Task 160.4: **Admin CRUD UI**: Build an admin panel page to create, reorder, and edit qualification funnel steps.
- [ ] Task 160.5: **Migration & Backfill**: Migrate the current hardcoded phases into seed `QualificationStep` rows.

---

## Epic 161: WhatsApp Provisioning Hardening & Meta Embedded Signup
**Objective**: Fix all critical defects in the WhatsApp provisioning pipeline before any live testing.
**Reference**: `temp/whatsapp_provisioning_audit.md`, `docs/research/whatsapp_embedded_signup.md`

### Phase 1: Safety Guards (Pre-Test Blockers)
- [ ] Task 161.1: **Connected Integration Guard**: Prevent duplicate subaccount creation.
- [ ] Task 161.2: **Admin Role Gate on Provision Endpoint**: Add admin/superadmin role check.
- [ ] Task 161.3: **Rate Limit on Provision Endpoint**: Add `@limiter.limit("3/hour")`.
- [ ] Task 161.4: **DB Unique Constraint**: Add `UniqueConstraint("business_id", "provider")` to Integration model.

### Phase 2: Retry & Cleanup Hardening
- [ ] Task 161.5: **Idempotent Retry Logic**: Persist subaccount SID after Step A succeeds.
- [ ] Task 161.6: **Atomic Disconnect Flow**: Confirm Twilio cleanup before deleting Integration DB row.
- [ ] Task 161.7: **Decryption Failure Handling**: Raise exception instead of silently returning.
- [ ] Task 161.8: **Webhook Failure Surfacing**: Mark integration as `status: "connected_no_webhook"` on failure.

### Phase 3: Meta Embedded Signup Integration
- [ ] Task 161.9: **Superseded**: Deprecated/superseded in favor of Epics 206, 207, and 208 for the full Meta WhatsApp Cloud API migration.

### Phase 4: Observability & Documentation
- [ ] Task 161.15: **Superadmin Alert Upgrade**: Replace file-based alerts with persistent notifications.
- [ ] Task 161.16: **Create `.env.example`**: Document all required environment variables.
- [ ] Task 161.17: **Update Deployment Guide**: Add WhatsApp/Twilio section.
- [ ] Task 161.18: **Input Validation Schema**: Replace raw `dict` with Pydantic model.

---


## Epic 205: Trade CRM & Messaging Feedback Actions (🔴 IMMEDIATE — Next Sprint)
**Objective**: Fix critical UX friction and functional gaps identified during active operations, including B2C audit visibility, order status regression, category editing, and product metadata.

- [ ] Task 205.1 (BE/FE): **Inbox Audit Tracing for All Use Cases**
  - **Acceptance Criteria**:
    - **Given** an admin is viewing a conversation in the Inbox,
    - **When** they toggle the "Audit: ON" mode,
    - **Then** they must see the "Brain Logic" block for both B2B (Trade) and B2C (Basic Scheduler) messaging turns.
    - **Given** a message is being processed through the B2C / Basic Scheduler flow,
    - **When** the AI Service runs Jinja template generation and tool-calling completions,
    - **Then** it must accumulate a structured log of thoughts (e.g., prompt selected, tool executions, and final text formulation) and persist it to the message's `reasoning_trace` field in the database.
- [ ] Task 205.2 (FE): **Orders Ledger Status Backwards Progression**
  - **Acceptance Criteria**:
    - **Given** a user is viewing an individual order details page at `/trade/orders/[id]`,
    - **When** the current status of the order is `CONFIRMED`, `SHIPPED`, or `DELIVERED`,
    - **Then** the page must present a secondary action button to revert the status to the previous step (e.g., "Revert to Pending" when `CONFIRMED`, "Revert to Confirmed" when `SHIPPED`, "Revert to Shipped" when `DELIVERED`).
    - **When** the user clicks this revert button,
    - **Then** the app must trigger a PATCH call to `/trade/orders/[id]` with the previous status, invalidate React Query caches, and update the status timeline accordingly.
- [ ] Task 205.3 (BE): **API Endpoint to Edit Categories**
  - **Acceptance Criteria**:
    - **Given** an authenticated user with active features for products,
    - **When** they perform a PATCH request to `/api/v1/trade/categories/{category_id}` with a JSON payload containing `name`, `description`, and/or `category_type`,
    - **Then** the backend must update the matching `Category` in the database and return the updated `CategoryResponse`.
- [ ] Task 205.4 (FE): **Edit Category Action and Form Integration**
  - **Acceptance Criteria**:
    - **Given** a user is on `/trade/products?tab=categories` viewing the categories list,
    - **When** they click the "Edit" action button next to a category,
    - **Then** the `CatalogDrawer` must slide open in category mode with the selected category's fields pre-populated.
    - **When** they click "Update Category",
    - **Then** it must perform a PATCH call to `/trade/categories/{id}` and refresh the active categories list upon success.
- [ ] Task 205.5 (FE): **Edit Product Unit of Measure in Catalog Drawer**
  - **Acceptance Criteria**:
    - **Given** a user is creating or editing a product using the `CatalogDrawer`,
    - **When** they view the form,
    - **Then** there must be an input field (text input or dropdown select with common options like `unit`, `case`, `kg`, `liter`, `box`, `pack`) for "Unit of Measure".
    - **When** they submit the form,
    - **Then** the `unit_of_measure` value must be sent as part of the payload to `POST /trade/products` or `PATCH /trade/products/{id}`, and correctly persist to the database.

---

## Epic 206: Meta WhatsApp Cloud API — Core Engine & Webhook Security (P0/P1)
**Objective**: Build the core integration engine with Meta WhatsApp Cloud API and secure incoming webhook endpoints using signature validation.
**Reference**: [meta_migration_plan.md](file:///Users/bernardo/projects/sherpa/temp/meta_migration_plan.md)

- [x] Task 206.1 (BE): **Webhook Signature Verification Middleware (`X-Hub-Signature-256`)**
  - **Acceptance Criteria**:
    - **Given** a request to `POST /webhook` at [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py),
    - **When** the `X-Hub-Signature-256` header is missing or does not start with `sha256=`,
    - **Then** the backend must raise an HTTP 403 Forbidden exception.
    - **Given** the `X-Hub-Signature-256` header is present,
    - **When** the signature computed using HMAC-SHA256 with `META_APP_SECRET` and the raw body does not match the header,
    - **Then** the backend must raise an HTTP 403 Forbidden exception.
    - **When** the signature matches,
    - **Then** it must proceed with the request and return the raw body bytes.
  - **Files to Modify/Create**:
    - Create: `backend/app/core/webhook_security.py`
    - Edit: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)

- [x] Task 206.2 (BE): **Meta WhatsApp Cloud API Engine**
  - **Acceptance Criteria**:
    - **Given** the abstract [BaseMessagingEngine](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/base.py),
    - **When** defining its methods,
    - **Then** add `send_template()` and `mark_as_read()` abstract methods.
    - **Given** the new `MetaCloudEngine` in `meta_cloud_engine.py`,
    - **When** instantiated with a phone number ID, encrypted access token, and WABA ID,
    - **Then** it must implement `send_text`, `send_media`, `send_template`, and `mark_as_read` utilizing `httpx.AsyncClient` targeting Graph API `v22.0`.
    - **Given** a text message body exceeds 4096 characters,
    - **When** `send_text` is called,
    - **Then** the engine must safely chunk the text or raise an appropriate validation error.
  - **Files to Modify/Create**:
    - Create: `backend/app/services/messaging/meta_cloud_engine.py`
    - Edit: [base.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/base.py)
    - Edit: [__init__.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/__init__.py) (factory registration)
    - Edit: [config.py](file:///Users/bernardo/projects/sherpa/backend/app/core/config.py) (add Meta environment variables)

- [x] Task 206.3 (BE): **Webhook Overhaul & Celery Payload Normalization**
  - **Acceptance Criteria**:
    - **Given** the webhook endpoint at [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py),
    - **When** an inbound message webhook is received from Meta,
    - **Then** the endpoint must validate the signature, parse the message payload, extract sender phone and `phone_number_id`, map the `phone_number_id` to an active `Integration` to find the `business_id`, resolve the sender's identity, format the payload into a normalized dictionary, and immediately return `200 OK`.
    - **Given** a message is successfully parsed,
    - **When** dispatching to Celery tasks in [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py),
    - **Then** it must pass the normalized message structure to the queue and adapt Celery workers to use the provider-agnostic `send_whatsapp_reply` resolving the engine dynamically via `MessagingService.get_engine`.
  - **Files to Modify**:
    - Edit: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)
    - Edit: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py)


## Epic 207: Meta WhatsApp Cloud API — 24h Window & Provisioning (P1/P2)
**Objective**: Build compliance logic for the 24-hour service window and implement the Embedded Signup token-exchange provisioning flow.
**Reference**: [meta_migration_plan.md](file:///Users/bernardo/projects/sherpa/temp/meta_migration_plan.md)

- [x] Task 207.1 (BE): **Redis-based 24-Hour Window Gating**
  - **Acceptance Criteria**:
    - **Given** an inbound message is received from a client,
    - **When** processed by the webhook,
    - **Then** set a Redis key `wa:window:{business_id}:{sender_phone}` with the current timestamp and a TTL of 86400 seconds. *(Implemented using database-stored `Conversation.extra_data["whatsapp_24h_window_start"]` to avoid adding unapproved database columns while fully enforcing compliance).*
    - **Given** a business is sending a free-form message via `send_text`,
    - **When** checked against database,
    - **Then** if the key does not exist or has expired, block the outbound text and raise a compliance exception / fall back to template sending.
  - **Files to Modify**:
    - Edit: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)
    - Edit: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py)

- [x] Task 207.2 (BE): **Embedded Signup Provisioner & API Endpoint**
  - **Acceptance Criteria**:
    - **Given** a client has authenticated with Facebook and received an authorization code,
    - **When** calling `POST /api/v1/integrations/whatsapp/connect-meta` at [integrations.py](file:///Users/bernardo/projects/sherpa/backend/app/api/integrations.py) with the code,
    - **Then** the backend must exchange the code for a long-lived access token, retrieve the WABA ID and registered phone numbers, subscribe the WABA to receive webhooks under the App, encrypt and store the credentials in `Integration.access_token`, and save the configuration with `provider_type="meta_cloud_api"`. *(Implemented via improved `POST /whatsapp/meta-onboard` which supports both OAuth authorization code exchange and manual inputs).*
  - **Files to Modify/Create**:
    - Create: `backend/app/services/messaging/meta_provisioner.py`
    - Edit: [integrations.py](file:///Users/bernardo/projects/sherpa/backend/app/api/integrations.py)


## Epic 208: Meta WhatsApp Cloud API — Frontend Integration & Twilio Deprecation (P2/P3)
**Objective**: Reconstruct the client onboarding interface, update dashboards for Meta statistics, and completely clean up Twilio code after migration.
**Reference**: [meta_migration_plan.md](file:///Users/bernardo/projects/sherpa/temp/meta_migration_plan.md)

- [x] Task 208.1 (FE): **Embedded Signup wizard in WhatsAppModal**
  - **Acceptance Criteria**:
    - **Given** a user is on the WhatsApp connection modal at [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx),
    - **When** clicking "Connect WhatsApp",
    - **Then** initiate the Meta Embedded Signup Facebook login flow, intercept the authorization code, and POST it to `/api/v1/integrations/whatsapp/connect-meta`.
    - **When** the connection completes,
    - **Then** display a success state and the connected phone number.
  - **Files to Modify**:
    - Edit: [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx)

- [x] Task 208.2 (FE): **Admin settings and status updates**
  - **Acceptance Criteria**:
    - **Given** an admin is viewing [admin/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/(admin)/admin/page.tsx) or [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx),
    - **When** configuring WhatsApp settings,
    - **Then** replace Twilio field configurations with Meta App ID, Secret, and System User Token input controls.
    - **When** viewing the active connection status on the settings panel,
    - **Then** show Meta-specific status details including WABA quality rating (GREEN/YELLOW/RED) and messaging tier.
  - **Files to Modify**:
    - Edit: [admin/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/(admin)/admin/page.tsx)
    - Edit: [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx)

- [ ] Task 208.3 (BE): **Twilio Cleanup, Deprecation & Version Upgrade**
  - **Acceptance Criteria**:
    - **Given** all client migration is finished,
    - **When** deleting deprecated code,
    - **Then** completely remove `twilio_engine.py`, legacy Twilio provisioner, TwiML references in webhook rejections, and the `POST /webhook/twilio` routes.
    - **Then** rename the Celery background task `send_twilio_reply` to a provider-agnostic name (e.g., `send_whatsapp_reply`) across the entire codebase.
    - **When** upgrading Graph API versions,
    - **Then** modify all Graph API references to target `v22.0` (using centralized `META_GRAPH_API_VERSION` settings).
  - **Files to Modify/Delete**:
    - Delete: `backend/app/services/messaging/twilio_engine.py`
    - Delete: `backend/app/services/messaging/provisioner.py`
    - Edit: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)
    - Edit: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py)
    - Edit: [config.py](file:///Users/bernardo/projects/sherpa/backend/app/core/config.py)
    - Edit: `backend/requirements.txt`


## Epic 209: Meta Pixel & Conversions API Integration (Ad Tracking & Compliance) (FUTURE)
**Objective**: Enable marketing event tracking, conversion attribution, and ad optimization using Meta Pixel and Conversions API (CAPI), while fully complying with Meta's Business Tools Terms (cookie consent, user notifications, and hash-based contact matching).

- [ ] Task 209.1 (FE): **Cookie Consent Banner & Compliance Notices**
  - **Acceptance Criteria**:
    - **Given** a new or un-consented user lands on the website or mobile app,
    - **When** the page loads,
    - **Then** display a clear, accessible cookie consent banner prompting for "Marketing & Tracking" preferences.
    - **Given** the user accepts or rejects cookies,
    - **When** checking the Privacy Policy,
    - **Then** ensure it includes explicit notice of Meta Pixel/CAPI tracking, options to opt-out, and direct links to consumer choice opt-out portals (e.g., http://www.aboutads.info/choices and http://www.youronlinechoices.eu/).
  
- [ ] Task 209.2 (FE): **Meta Pixel SDK & Event Tracking**
  - **Acceptance Criteria**:
    - **Given** a user has granted marketing cookie consent,
    - **When** navigating the web dashboard,
    - **Then** load the Meta Pixel script dynamically and trigger standard event tracking (e.g., `PageView`, `Lead`, `CompleteRegistration` on onboarding success).
    - **When** cookie consent is denied or not yet answered,
    - **Then** suppress the Meta Pixel SDK entirely.

- [ ] Task 209.3 (BE): **Meta Conversions API (CAPI) Server-Side Ingestion**
  - **Acceptance Criteria**:
    - **Given** a critical transaction event occurs on the server (e.g., successful subscription or store onboarding completed),
    - **When** CAPI logging is active,
    - **Then** securely hash the user's contact information (email, phone number) via SHA-256 and dispatch a Conversions API payload to Meta's endpoints to achieve high-precision attribution matching.

---

## Epic 210: WhatsApp 24h Window & Template Fallback Fix
**Objective**: Fix critical bugs in the WhatsApp message delivery pipeline where AI-generated responses are silently discarded when the system believes the conversation is outside Meta's 24-hour window, and the template fallback fails due to missing/misconfigured templates.

**Source**: [WhatsApp Flow Audit (2026-08-07)](file:///Users/bernardo/projects/sherpa/temp/whatsapp_flow_audit.md) — Findings C1, C2.

- [x] Task 210.1: **Fix Response Discard on Outside-Window** (`tasks/messages.py`): Remove the early `return` in `send_twilio_reply` after template send attempt. When outside the 24h window, send the template but do NOT discard the AI-generated `body`. Log the body as a pending message so it is not permanently lost.
- [x] Task 210.2: **Fix Template Fallback Default** (`tasks/messages.py`): Change the hardcoded default template from `hello_communication` to `hello_world` (Meta's built-in default), or make it configurable per-integration with proper `components` support.
- [x] Task 210.3: **Fix 24h Window Tracking in ProspectQualifier** (`services/prospect_qualifier.py`): Ensure `whatsapp_24h_window_start` is saved to `conv.extra_data` on every incoming WhatsApp message. *(Fix already applied, pending push.)*

## Epic 211: WhatsApp Webhook Robustness
**Objective**: Harden the WhatsApp webhook entry point against edge-case crashes, batch message loss, and security bypass.

**Source**: [WhatsApp Flow Audit (2026-08-07)](file:///Users/bernardo/projects/sherpa/temp/whatsapp_flow_audit.md) — Findings C3, H1, H2, H3.

- [x] Task 211.1: **Safe `client.id` Access** (`api/whatsapp.py`): Add null-check guard (`client.id if client else None`) on the `sales_rep` and `distributor_retailer` Celery dispatch branches (L199, L203) to prevent `AttributeError` crashes.
- [ ] Task 211.2: **Process All Messages in Batch** (`api/whatsapp.py`): Replace `messages[0]` with a loop over all messages in the Meta webhook payload to prevent message loss when Meta bundles multiple messages.
- [ ] Task 211.3: **SQL-Level Integration Lookup** (`api/whatsapp.py`, `tasks/messages.py`): Replace in-memory Python filtering of all WhatsApp integrations with a direct SQL filter on `phone_number_id` / `phone_number` to improve scalability.
- [ ] Task 211.4: **Enforce `META_APP_SECRET` in Production** (`core/webhook_security.py`): Crash at startup (not just warn) if `META_APP_SECRET` is unset and `ENVIRONMENT != "testing"`, consistent with the `SECRET_KEY` security rule in AGENTS.md.

## Epic 212: Twilio→Meta Naming & Import Cleanup
**Objective**: Clean up legacy Twilio naming conventions and dead imports across the WhatsApp messaging pipeline now that Meta Cloud API is the primary provider. Twilio engine code remains functional for legacy integrations but naming in shared code paths should be provider-agnostic.

**Source**: [WhatsApp Flow Audit (2026-08-07)](file:///Users/bernardo/projects/sherpa/temp/whatsapp_flow_audit.md) — Findings L1, L3, L4.

- [ ] Task 212.1: **Rename `send_twilio_reply`** (`tasks/messages.py`): Rename to `send_whatsapp_reply` (or `deliver_message`) to accurately reflect that it handles both Twilio and Meta Cloud API providers.
- [ ] Task 212.2: **Remove Dead Twilio Import** (`tasks/messages.py`): Remove unused `from twilio.rest import Client` on L7.
- [ ] Task 212.3: **Standardize `To` Cleaning** (`tasks/messages.py`): Apply `clean_num` to `payload.get("To")` in `run_prospect_message` to match the pattern used by all other task runners.
- [ ] Task 212.4: **Rename `/debug/twilio` Endpoint** (`api/whatsapp.py`): Rename to `/debug/whatsapp` and update log messages to remove Twilio references.
- [ ] Task 212.5: **Audit & Update Internal Log Messages**: Replace all log strings referencing "Twilio" in the Meta Cloud API code paths with provider-agnostic or "WhatsApp" terminology.

---

## Epic 220: Zero-Friction Embedded Signup (Auto-fill Meta SDK) [COMPLETED ✅]
**Objective**: Pre-fill the Meta Embedded Signup popup with business data from Xerpa's DB so users never have to manually type their website or company name. Detailed plan: [`temp/onboarding-optimization-plan.md`](file:///Users/bernardo/projects/sherpa/temp/onboarding-optimization-plan.md).

- [x] Task 220.1 (BE): **Prefill Data in Config Endpoint**: Extend `GET /whatsapp/config` to return `prefill` object with `business_name` and `category` from `BusinessProfile`.
- [x] Task 220.2 (FE): **Inject setup.business in FB.login()**: Populate `extras.setup.business` and `extras.setup.phone` with prefill data and hardcode `website: "https://xerpaa.com"` as fallback. Also set `phone.displayName`.

## Epic 219: Xerpa-Provisioned WhatsApp Virtual Numbers (1-Click Onboarding) [REFINED 📌]
**Objective**: Allow non-technical users ("Marco") to activate an AI WhatsApp number in 1 click without Facebook Login, by purchasing Twilio numbers and binding them to Xerpa's central WABA. Detailed plan: [`temp/onboarding-optimization-plan.md`](file:///Users/bernardo/projects/sherpa/temp/onboarding-optimization-plan.md).

- [ ] Task 219.1 (BE): **Meta WABA Binding + SMS Verification**: After Twilio purchase, call Meta Graph API to add number to Xerpa's WABA, intercept SMS verification code via Twilio webhook, and auto-complete registration.
- [ ] Task 219.2 (BE): **Unified 1-Click Provision Endpoint**: `POST /whatsapp/provision-virtual` orchestrating Twilio purchase + Meta binding + webhook subscription in a single call.
- [ ] Task 219.3 (FE): **Dual-Path WhatsApp Modal**: Redesign Step 1 with two clear options: "⚡ Activar Número Nuevo" (1-click) and "🔗 Usar Mi Número Actual" (Embedded Signup).
- [ ] Task 219.4 (BE): **Multi-Tenant Webhook Router**: Route incoming Meta webhook messages to the correct business by matching `phone_number_id` against `Integration` records.
- [ ] Task 219.5 (Billing): **Number Lifecycle & Recycling**: Release Twilio numbers on account cancellation; Celery beat task to recycle numbers inactive >30 days.


## Epic 214: Stripe & PayPal Subscription Integration
**Objective**: Implement subscription billing with monthly and yearly options, integrating Stripe and PayPal to charge users based on their tier.
*Note: Antigravity will guide the user step-by-step through configuring Stripe Webhooks, API keys, and PayPal Developer portal settings.*

- [ ] Task 214.1 (BE): **Payment Gateway Setup & Schemas**
  - **Acceptance Criteria**:
    - Define a `Subscription` model in SQLAlchemy tracking `status`, `tier`, `provider` (stripe/paypal), `provider_subscription_id`, and `expiration_date`.
- [ ] Task 214.2 (BE/FE): **Stripe Checkout & Webhook Integration**
  - **Acceptance Criteria**:
    - Build backend routes to initiate Stripe Checkout sessions for monthly/yearly plans and handle webhook events (`customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_succeeded`).
- [ ] Task 214.3 (BE/FE): **PayPal Subscription Integration**
  - **Acceptance Criteria**:
    - Integrate PayPal Javascript SDK on the frontend for monthly/yearly subscription buttons and handle PayPal webhook notifications for payment capture and lifecycle changes.

## Epic 215: Qualified Lead Alert Routing (Automated Intake & Campaigns)
**Objective**: Automatically alert the business owner/admin via WhatsApp when a qualified wholesale lead has completed the intake funnel.

- [ ] Task 215.1 (BE): **Owner Notification Trigger**
  - **Acceptance Criteria**:
    - **Given** a prospect completes the wholesale qualification campaign flow in `prospect_qualifier.py` and is marked as qualified/verified,
    - **When** the qualification database transaction commits,
    - **Then** trigger a Celery task that retrieves the business owner's registered WhatsApp/phone contact info and sends a WhatsApp template notification (e.g., "New qualified wholesale lead from {prospect_name} has arrived! Please check your dashboard.").

## Epic 216: B2C SMS Appointment Reminders
**Objective**: Expand the B2C basic scheduler module to send automated SMS reminders before scheduled appointments.

- [ ] Task 216.1 (BE): **SMS Reminder Cron Task**
  - **Acceptance Criteria**:
    - **Given** a scheduled B2C appointment in the database,
    - **When** a background cron runner checks for appointments starting in exactly 24 hours (and again at 1 hour),
    - **Then** check if the client has opted into SMS reminders, and dispatch a reminder SMS using Twilio SMS or Meta Cloud API.

## Epic 217: Internationalization (i18n) Support
**Objective**: Implement full translation capability for Spanish and English languages across the landing page, auth screens, and main dashboards.

- [ ] Task 217.1 (FE): **Setup next-intl or i18next**
  - **Acceptance Criteria**:
    - Configure translation middleware and locale routing (e.g., `/en/trade` and `/es/trade`), with automatic browser language detection.
- [ ] Task 217.2 (FE): **Translate Layouts & Dictionary Files**
  - **Acceptance Criteria**:
    - Extract hardcoded strings across marketing and dashboard files into structured JSON translation dictionaries (`es.json`, `en.json`). Render a clean language switcher in the header.

## Epic 218: Mobile-First Overhaul & Native App Roadmap
**Objective**: Optimize the entire web dashboard layout to be exceptionally fast and easy to use on mobile devices, preparing the ground for native apps.

- [ ] Task 218.1 (FE): **Mobile Responsive Audit & UI Adjustments (PRIORITY)**
  - **Acceptance Criteria**:
    - **Given** a sales rep is using the dashboard on a smartphone,
    - **When** viewing lists, drawers, charts, and tables,
    - **Then** they must be easily scrollable and fully legible with no horizontal overflow, utilizing bottom-sheets instead of heavy desktop drawers.
- [ ] Task 218.2 (FE): **Progressive Web App (PWA) Configuration**
  - **Acceptance Criteria**:
    - Implement a service worker and manifest to allow "Add to Home Screen" on iOS and Android with offline caching capability for active field routes.
- [ ] Task 218.3 (Architecture): **Android & iOS Native Apps Planning (Long Term)**
  - **Acceptance Criteria**:
    - Draft the native app integration architecture (e.g., utilizing Capacitor to wrap the Next.js bundle or React Native integration leveraging existing APIs).

## Epic 219: Extensible Product Catalog Fields
**Objective**: Allow business admins to define custom product attributes (e.g., Material, Dimensions, Certifications) — mirroring the existing `Client.custom_fields` + `BusinessProfile.crm_config` pattern — so the AI and dashboard can leverage rich, business-specific product data without schema changes.

- [x] Task 219.1 (BE): **Add `custom_fields` to Product Model & `catalog_config` to BusinessProfile**
  - **Acceptance Criteria**:
    - **Given** the existing `Client.custom_fields` + `BusinessProfile.crm_config` pattern,
    - **When** the migration runs,
    - **Then** `products` table has a new `custom_fields JSON` column (nullable, default `{}`), and `business_profiles` table has a new `catalog_config JSON` column (nullable, default `[]`) that stores the admin-defined field schema.
    - Update `ProductBase`, `ProductCreate`, `ProductUpdate`, and `ProductResponse` schemas in `schemas/trade.py` to include `custom_fields: Optional[Dict[str, Any]]`.
    - Update `Product.get_semantic_summary()` and `Product.get_knowledge_metadata()` in `models/trade/catalog.py` to incorporate custom field values.
- [x] Task 219.2 (BE): **API Endpoints for Catalog Config**
  - **Acceptance Criteria**:
    - **Given** a business admin hits `GET /business/me`,
    - **When** the response is returned,
    - **Then** `catalog_config` is included in the `BusinessProfileResponse` schema.
    - **Given** an admin sends `PATCH /business/me` with a `catalog_config` array,
    - **When** the request is valid,
    - **Then** the field definitions are persisted and available for the product drawer to render dynamic form inputs.
- [x] Task 219.3 (FE): **Dynamic Custom Fields in CatalogDrawer**
  - **Acceptance Criteria**:
    - **Given** the admin has defined `catalog_config` fields (e.g., Material, Origin, Certifications),
    - **When** a user opens the Product Drawer (`CatalogDrawer.tsx`) to create or edit a product,
    - **Then** the drawer renders dynamic input fields matching the defined schema below the standard product fields (name, price, SKU, etc.), with correct input types (`text`, `number`, `select`) and values saved to `Product.custom_fields`.
    - **Given** no `catalog_config` is defined,
    - **When** the drawer opens,
    - **Then** no custom fields section appears (graceful fallback).
- [x] Task 219.4 (FE): **Catalog Config Editor in Settings**
  - **Acceptance Criteria**:
    - **Given** a business admin navigates to Settings,
    - **When** they view the General Settings tab,
    - **Then** they can add, edit, and remove custom field definitions (key, label, type) for their product catalog, and save them via `PATCH /business/me`.

## Epic 220: AI Pricing Guardrails & Disclosure Control
**Objective**: Give business admins a toggle to control whether the AI discloses product prices to prospects/customers, and enforce an unconditional hard guardrail that the AI never negotiates, debates, or modifies pricing under any circumstances.

- [x] Task 220.1 (BE): **Add `allow_price_disclosure` Toggle to Agent Model**
  - **Acceptance Criteria**:
    - **Given** an Alembic migration,
    - **When** the migration runs,
    - **Then** the `agents` table has a new `allow_price_disclosure Boolean` column (default `True`, non-nullable).
    - Update the `AgentResponse` / assistant config serialization in `schemas/business.py` to include the new field.
    - The `PATCH /business/me/assistant` endpoint accepts and persists `allow_price_disclosure`.
- [x] Task 220.2 (FE): **Price Disclosure Checkbox in AssistantSettings**
  - **Acceptance Criteria**:
    - **Given** the admin opens the AI Assistant settings panel (`AssistantSettings.tsx`),
    - **When** viewing the behavioral toggles section,
    - **Then** a new checkbox labeled "Disclose Product Pricing" is visible with helper text: *"When enabled, the AI assistant can state catalog prices when asked. When disabled, the assistant will direct users to contact your sales team for pricing."*
    - The toggle's state is read from and saved to `business.assistant_config.allow_price_disclosure`.
- [ ] Task 220.3 (BE/AI): **Hard Non-Negotiation Guardrail in System Prompts**
  - **Acceptance Criteria**:
    - **Given** the `allow_price_disclosure` flag is `true`,
    - **When** a prospect or client asks about the price of a product,
    - **Then** the AI states the catalog price factually but immediately refuses any follow-up negotiation, discount requests, or price modification attempts with a firm but polite boundary.
    - **Given** the `allow_price_disclosure` flag is `false`,
    - **When** a prospect or client asks about pricing,
    - **Then** the AI responds with *"Para información sobre precios, por favor contacta a nuestro equipo de ventas"* and does not reveal any price data.
    - **Regardless** of the toggle value, the AI must NEVER enter a negotiation thread, offer discounts, suggest alternative pricing, or imply prices are flexible.

## Epic 221: Intelligent Catalog Context for AI Flows
**Objective**: Replace the current raw catalog dump in AI system prompts with a structured, token-efficient product knowledge layer that enables the LLM to answer product questions, compare products side-by-side, and make needs-based recommendations across all messaging flows.

- [ ] Task 221.1 (BE): **CatalogContextBuilder Utility**
  - **Acceptance Criteria**:
    - **Given** a new utility module `services/catalog_context.py`,
    - **When** called with `(db, business_id, allow_price_disclosure, user_message=None)`,
    - **Then** it returns a formatted Markdown block with structured product specs and conditional pricing.
- [ ] Task 221.2 (BE/AI): **Integrate CatalogContextBuilder into ProspectQualifier**
- [ ] Task 221.3 (BE/AI): **Integrate CatalogContextBuilder into AIService Prompts**
- [ ] Task 221.4 (BE): **Product Data Sheet Attachment Model (Architecture Only)**
