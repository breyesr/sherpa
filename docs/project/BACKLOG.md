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

## Epic 200: Security Hardening (🔴 IMMEDIATE — Before Next Deploy)
**Objective**: Address all critical and high-severity security findings from the July 2026 code audit.
**Reference**: `temp/sherpa_code_audit.md` — SEC-01 through SEC-09.

- [x] Task 200.1: **Remove Default SECRET_KEY** — Remove the fallback string `"supersecretkey_please_change_in_production"` from `backend/app/core/config.py`. Make `SECRET_KEY` a required field with no default. *(5 min fix, critical impact)*
- [x] Task 200.2: **Authenticate Data Gateway Sync** — Add `Depends(get_current_user)` to `POST /sync` in `backend/app/api/data_gateway.py:92`. *(10 min fix)*
- [x] Task 200.3: **Lock Down CORS Origins** — Replace `allow_origin_regex=r"https://.*\.up\.railway\.app"` in `backend/app/main.py` with explicit allowed origins list. *(10 min fix)*
- [x] Task 200.4: **Server-Side Auth Cookie** — Added `HttpOnly; Secure; SameSite=Lax` `Set-Cookie` header to `/auth/login` endpoint in `auth.py`.
- [x] Task 200.5: **Protect Telegram Debug Endpoint** — Added `Depends(get_current_user)` authentication guard to `/debug/info` in `telegram.py`.
- [x] Task 200.6: **File Upload Extension Whitelist** — Added allowed extension check (`.csv`, `.xlsx`, `.xls`, `.json`) in `data_gateway.py`.
- [x] Task 200.7: **Replace print() with logging** — Replaced direct `print()` statements with standard `logging` in `encryption.py` and `whatsapp.py`.

## Epic 204: AI Dev Team Token Optimization (🔴 IMMEDIATE — After E200.1-200.3)
**Objective**: Reduce token consumption per AI agent session by eliminating redundant context, providing pre-built navigation aids, and excluding noise from indexing. Every token saved compounds across all future sessions.

- [x] Task 204.1: **Consolidate Rule Files** — Deduplicate rule files. Keep `.agents/AGENTS.md` as single source of truth, reduced `GEMINI.md` to pointer, deleted root `AGENTS.md`. *(Saves ~1,500 tokens/session)*
- [x] Task 204.2: **Create Architecture Map** — Created `docs/ARCHITECTURE.md` mapping routes, modules, models, and frontend pages. *(Saves ~3,000-5,000 tokens/session)*
- [x] Task 204.3: **Optimize .geminiignore** — Excluded `migrations/`, `openapi.json`, `repomix-output.xml`, `*.sql`, `temp/`, etc.
- [x] Task 204.4: **Add Module-Level Docstrings** — Added 3-line docstrings to primary backend files.
- [x] Task 204.5: **Compress Completed Backlog Tasks** — Collapsed completed tasks in active epics to single line headers.
- [x] Task 204.6: **Generate Import Map** — Created `backend/scripts/gen_import_map.py` and generated `docs/IMPORT_MAP.md`.

## Epic 201: Performance & Reliability (🟠 THIS SPRINT)
**Objective**: Fix performance bottlenecks and reliability gaps identified in the code audit.
**Reference**: `temp/sherpa_code_audit.md` — PERF-01 through PERF-07, CQ-01.

- [x] Task 201.1: **Parallelize GraphRAG Hybrid Search** — Wrapped semantic + keyword search in `asyncio.gather()` in `backend/app/services/graphrag.py`.
- [x] Task 201.2: **Add LLM Timeouts** — Added `timeout=30` to all `litellm.acompletion` calls in `ai_service.py` and `graphrag.py`.
- [ ] Task 201.3: **Pin Python Dependencies** — Generate `requirements.lock` via `pip freeze` from the current production environment. Deploy from lock file. *(15 min)*
- [ ] Task 201.4: **Enable TypeScript Build Checks** — Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` from `frontend/next.config.mjs`. Fix resulting type errors iteratively.
- [x] Task 201.5: **Fix Bare Except Blocks** — Replaced bare `except:` blocks across `telegram.py` and `calendar_tools.py` with specific exception handling.
- [ ] Task 201.6: **Celery Task Idempotency** — Add Redis-backed deduplication keys to `backend/app/tasks/messages.py` and `ingestion.py` to prevent duplicate processing on retries.
- [ ] Task 201.7: **Async Context Summarization** — Move the synchronous LLM summarization call in `backend/app/core/context_assembler.py` to a post-response async task that caches the result in Redis.
- [x] Task 201.8: **Catalog Service Validation in B2C Scheduling Tool** — Updated `calendar_tools.py` `create_appointment` to strictly validate `service_id` against the business's active service catalog.

## Epic 202: Backend Architecture Cleanup (🟡 NEXT SPRINT)
**Objective**: Reduce technical debt and improve maintainability of the backend codebase.
**Reference**: `temp/sherpa_code_audit.md` — ARCH-01, ARCH-03, ARCH-06 through ARCH-08.

- [ ] Task 202.1: **Split trade.py API Router** — Break `backend/app/api/trade.py` (1,271 lines) into sub-routers: `api/trade/stores.py`, `api/trade/orders.py`, `api/trade/actions.py`, `api/trade/products.py`. Keep `api/trade/__init__.py` as the aggregator.
- [ ] Task 202.2: **Split trade.py Models** — Break `backend/app/models/trade.py` (697 lines) into `models/store.py`, `models/order.py`, `models/product.py`, `models/action.py`. Keep `models/trade.py` as re-export hub for backward compatibility.
- [ ] Task 202.3: **Organize Backend Scripts** — Move 34+ one-off scripts from `backend/` root into `backend/scripts/{diagnostics,migrations,repairs,seeders}/`.
- [ ] Task 202.4: **Create Test Fixtures** — Add `backend/app/tests/conftest.py` with shared async DB session, mock user, and mock business fixtures.
- [ ] Task 202.5: **Extract Shared Constants** — Move constants like `DEFAULT_FEATURES_CONFIG` from `api/business.py` to `core/constants.py` to eliminate circular import workarounds.

## Epic 203: Frontend Architecture Cleanup (🟡 NEXT SPRINT)
**Objective**: Reduce frontend technical debt and establish sustainable patterns.
**Reference**: `temp/sherpa_code_audit.md` — ARCH-02, ARCH-04, ARCH-05, CQ-02, CQ-03, CQ-08.

- [ ] Task 203.1: **Create Centralized API Client** — Implement `frontend/lib/apiClient.ts` with typed `apiFetch<T>()` function handling auth headers, error parsing, and token refresh. Migrate 3 high-traffic pages to use it first.
- [ ] Task 203.2: **Adopt react-hook-form + zod** — Add `react-hook-form` and `zod` to `package.json`. Refactor v2 Drawer components (`AccountDrawer.tsx`, `ClientDrawer.tsx`, `ServiceDrawer.tsx`) to use form library instead of individual `useState` hooks.
- [ ] Task 203.3: **Complete v1→v2 Component Migration** — Delete v1 Modal components (`ClientModal.tsx`, `StoreModal.tsx`) after verifying all references point to v2 Drawer equivalents.
- [ ] Task 203.4: **Eliminate any Types** — Replace top-50 `: any` usages across `trade/actions/page.tsx`, `IntegrationsPanel.tsx`, `retailers/[id]/page.tsx`, `notes/page.tsx` with proper types from `@/types/api.ts`.
- [ ] Task 203.5: **Frontend Test Infrastructure** — Set up Vitest + React Testing Library. Write integration tests for login flow and dashboard data loading.
