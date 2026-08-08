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
