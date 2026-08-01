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
- [ ] Task 161.9: **Meta Tech Provider Registration**: Register Sherpa as a Meta Tech Provider (manual).
- [ ] Task 161.10: **Facebook JS SDK Integration**: Add Facebook JS SDK to Next.js frontend.
- [ ] Task 161.11: **Embedded Signup UI Step**: Insert new step in WhatsApp modal.
- [ ] Task 161.12: **Backend Token Exchange Endpoint**: Create `POST /api/v1/integrations/whatsapp/activate`.
- [ ] Task 161.13: **Fix Webhook Registration Target**: Configure webhook on WhatsApp Sender.
- [ ] Task 161.14: **End-to-End Provisioning Flow Test**.

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

