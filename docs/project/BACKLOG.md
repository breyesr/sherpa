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

## Epic 119: The Sherpa Ingestion Engine (V2)
**Objective**: Transition from beta placeholders to a high-end, high-volume bulk ingestion system that powers the Trade intelligence corpus.

- [ ] Task 119.1: **Guided Bulk Wizard**: Implement the 3-step UI (Upload -> AI-Assisted Mapping -> Conflict Resolution) with real-time progress feedback.
- [ ] Task 119.2: **Association Ingestion Logic**: Enhance the `Data Gateway` backend to handle bulk linking of Stores and Clients via `external_id` mapping.
- [ ] Task 119.3: **Deduplication & Conflict UI**: Build a side-by-side comparison interface for manual resolution of data collisions during import.
- [ ] Task 119.4: **Incremental Knowledge Sync**: Implement post-import hooks to trigger vector re-embedding for all newly ingested or modified entities.

---

## Epic 114: Modern Account Intelligence UI (V2)
**Objective**: Overhaul the account management experience with a modern, high-density interface that surfaces pre-calculated Dossiers and actionable intelligence.

- [x] Task 114.1: **V2 Scaffolding**: Implement the modernized Account (Store) and Contact (Retailer) List and Detail pages under `/trade/v2/`.
- [x] Task 114.2: **Content-Aware Intelligence**: Implement intelligence extraction and filtering that surfaces Risks/Opps regardless of the primary note label.
- [x] Task 114.3: **People V2 Redesign**: Implement the high-end "Intelligence Dossier" for Contacts, featuring a unified context grid and dark-themed AI sidebar.
- [ ] Task 114.5: **Mobile-First Ingestion**: Optimize the note-taking flow for mobile users (Quick Actions).

## Epic 125: Dynamic Strategy & Global Playbooks
**Objective**: Transition the static, hardcoded Action Objectives and local-only templates into a dynamic, superadmin-configurable system framework. Allow the creation of global templates available system-wide, and dynamically adapt the AI classification engine to custom objectives.

- [x] Task 125.1: **Database Schema Migration**: Create the `store_action_objectives` table, replace the Enum-based objective field in `StoreAction` with a String, and backfill existing businesses. Implement Alembic migration script.
- [x] Task 125.2: **Backend CRUD & Scoping APIs**: Implement standard CRUD endpoints for `/trade/objectives` and validate action objectives on create/update.
- [x] Task 125.3: **Dynamic AI Ingestion Classification**: Modify the background Celery extraction jobs to query active `action_objectives` from the DB and dynamically compile the Pydantic schema passed to the Instructor client.
- [ ] Task 125.4: **Admin Management Console (UI)**: Build a Superadmin control panel under `/admin` in the frontend to manage Action Objectives (create, edit, toggle active status) and templates (set global/local scope).
- [ ] Task 125.5: **Strategy Desk Integration (UI)**: Refactor the Objective select dropdown and Template selector in the create action drawer to fetch dynamic values from the API and visually badge global templates with a "System" lock status.
---

## Epic 153: Multi-Tenant Dedicated WhatsApp Senders & Usage Control
**Objective**: Replace the shared Twilio Sandbox proxy with automated per-tenant dedicated WhatsApp numbers. Each business gets its own Twilio subaccount (+52 MX number), provisioned programmatically. Implement a 200-message/month free-tier usage cap with manual credit purchasing, and abstract the messaging layer for future Meta Cloud API coexistence.

**Dependencies**: Epic 2 (Auth & Business Profile — completed), Epic 22 (Modular Architecture — completed).
**Reference**: [Implementation Plan](file:///Users/bernardo/projects/sherpa/temp/multitenant-whatsapp-implementation-plan.md)

### Phase 1: Foundation (DB + Encryption + Adapter Pattern)
- [x] Task 153.1: **Encryption Utility**: Investigate existing CRM model encryption listeners (`crm.py`). Extract or create a reusable `encrypt_value()`/`decrypt_value()` utility in `backend/app/core/encryption.py` using Fernet with `ENCRYPTION_KEY` env var.
- [x] Task 153.2: **JSONB Migration**: Migrate Integration model's `settings` column from `JSON` to `JSONB` to enable indexed phone number lookups. Create Alembic migration in `backend/migrations/versions/`.
- [x] Task 153.3: **Abstract Messaging Layer**: Create `BaseMessagingEngine` (abstract) with `send_text()`, `send_media()`, `register_webhook()` methods. Implement `TwilioSubaccountEngine` as the concrete WhatsApp adapter. Create `MessagingService` factory to resolve engines by provider type. All in `backend/app/services/messaging/`.
- [x] Task 153.4: **Twilio Provisioning Service**: Build automated provisioning (`create_subaccount()`, `provision_number(country="MX")`, `register_webhook()`) with exponential backoff retry (3 attempts). On failure, mark integration status as `error` and alert Superadmin. Create `POST /api/integrations/whatsapp/provision` endpoint.
- [x] Task 153.5: **Tenant Isolation Tests**: Write tests asserting two separate tenant credential blocks have zero data leakage across subaccounts.


### Phase 2: Inbound Routing Overhaul
- [x] Task 153.6: **Destination-Driven Routing**: Refactor `backend/app/api/whatsapp.py` to route inbound webhooks by the `To` phone number via JSONB index lookup on `settings["phone_number"]`. Remove the shared Twilio Sandbox flow ("join flower-leaf") entirely.
- [x] Task 153.7: **Per-Tenant Webhook Validation**: Implement Twilio signature validation using each tenant's subaccount auth token. Return 404 for unmapped numbers without crashing.
- [x] Task 153.8: **LangGraph Context Binding**: Pass the resolved `business_id` from the matched integration directly into the LangGraph state machine context.
- [x] Task 153.9: **Routing Tests**: Mock inbound webhooks from two separate tenant phone numbers. Assert each routes to the correct business with isolated LangGraph state tracking.


### Phase 3: Usage Control & Credit System
- [x] Task 153.10: **Redis Usage Counter**: Create `backend/app/core/limiter.py` with atomic `INCR` on key `usage:whatsapp:{biz_id}:YYYY-MM` (TTL = end of calendar month). Count ALL messages (inbound + outbound).
- [x] Task 153.11: **Pre-LangGraph Usage Gate**: Check `used < 200 + purchased_credits` BEFORE entering LangGraph loop. If over limit: store inbound message in DB (visible in conversations UI) but skip AI processing and outbound delivery.
- [x] Task 153.12: **Purchased Credits Model**: Add `purchased_credits` (integer, default 0) to `BusinessProfile` model. Resets monthly on the 1st. Create Alembic migration.
- [x] Task 153.13: **Usage Alerts**: At 80% (160 msgs): send in-app banner + WhatsApp notification to tenant's business number. At 100%: same + in-app alert to Superadmin. Alert messages count toward cap.
- [x] Task 153.14: **Admin Credit Endpoint**: Create `PATCH /admin/business/{id}/credits` for Superadmin to manually set `purchased_credits`. Also expose `GET /api/usage/{business_id}` returning `{ used, free_limit, purchased, remaining, percent_used }`.
- [x] Task 153.15: **Capping Tests**: Simulate 200 consecutive messages → assert 201st outbound is blocked. Verify 80% and 100% alert triggers. Verify inbound passthrough when capped.

### Phase 4: Frontend Integration UI
- [x] Task 153.16: **WhatsApp Setup Wizard Redesign**: Replace current Sandbox wizard in `WhatsAppModal.tsx` with a multi-step configuration flow (explanation → area code preference + business display name → provisioning spinner → success with assigned number). Spanish UI.
- [x] Task 153.17: **Connection Status & Usage Display**: Update `IntegrationsPanel.tsx` to show assigned number, connection health, provider status, and usage indicator ("145 / 200 mensajes usados" progress bar). Red error indicator if provisioning failed.
- [x] Task 153.18: **Disconnect Flow**: Add disconnect confirmation modal warning that the number is released permanently. On confirm: release Twilio number + clean up integration record.
- [x] Task 153.19: **Admin Tenant Management**: Extend `/app/(admin)/admin/page.tsx` with tenant WhatsApp overview table (status, usage metrics) and `purchased_credits` input field.
- [x] Task 153.20: **Onboarding Cleanup**: Remove WhatsApp from onboarding Step 4. WhatsApp enablement is now post-onboarding via Settings → Integrations only.

---

## Epic 154: Telegram Multi-Tenant Data Isolation Fix
**Objective**: Fix the critical cross-tenant data leak where Telegram bots for different accounts loaded/shared the same conversational state due to un-scoped LangGraph thread IDs, and optimize the webhook route.

- [x] Task 154.1: **Thread ID Scoping**: Scope the LangGraph `thread_id` with `business_id` in `prospect_qualifier.py`.
- [x] Task 154.2: **State Purge Scoping**: Ensure the reset/delete SQL queries in `prospect_qualifier.py` are scoped to the business-scoped thread ID.
- [x] Task 154.3: **Webhook Query Optimization**: Optimize the webhook integration lookup in `telegram.py` to query directly by `webhook_id` using PostgreSQL JSONB operators instead of pulling all rows.

## Epic 155: Hybrid Sidebar Modularity & Lower-Tier Orders Integration
**Objective**: Decouple the nested sidebar categories so they adapt dynamically to any hybrid capability configuration. Specifically, ensure that users with Campaigns enabled but B2B Solutions disabled can access the Prospecting leads menu, the Point of Sale manager, and wholesale Orders, and satisfy WCAG 2.1 contrast rules.

- [x] Task 155.1: **Decouple Sidebar Groups**: Refactor `frontend/components/Sidebar.tsx` to separate CRM, B2B, Prospecting, and Catalog blocks into standalone conditional structures.
- [x] Task 155.2: **Integrate Lower-Tier Orders**: Expose the Orders link (`/trade/orders`) alongside Point of Sale (`/trade/stores`) in the fallback block when Campaigns are enabled but B2B Solutions is disabled.
- [x] Task 155.3: **WCAG Contrast Compliance**: Darken the uppercase category headers in `Sidebar.tsx` from `text-slate-400` to `text-slate-500` for accessibility.
- [x] Task 155.4: **UI & Layout Verification**: Verify correct sidebar rendering across all key user tier configurations.

## Epic 156: Automated Order Generation & Segmented Prospecting Orders UI
**Objective**: Automatically generate a pending, unverified wholesale Order and OrderItem in the database during the final stage of inbound prospect qualification, and implement the frontend list views partitioned by pipeline segment (Wholesale vs. Retail) under the Prospecting sidebar menu.

- [x] Task 156.1: **Order Integration in Qualifier**: Update the `qualify_lead` node in `prospect_qualifier.py` to instantiate and add `Order` and `OrderItem` records upon successful qualification, setting `source_type` to `INTEGRATION` and `is_verified` to `False`.
- [x] Task 156.2: **Segmented Orders API**: Implement `GET /api/v1/trade/prospects/orders` supporting a `segment` filter (`wholesale` or `retail`) to return orders linked to prospect stores matching the segment.
- [x] Task 156.3: **Prospecting Orders Sidebar Links**: Update `frontend/components/Sidebar.tsx` to render "Orders" under both the Wholesale and Retail Prospecting submenus, linking to `/trade/prospects/orders?segment=wholesale` and `/trade/prospects/orders?segment=retail` respectively.
- [x] Task 156.4: **Segmented Orders Dashboard View**: Create the frontend view for `/trade/prospects/orders` that renders a list of pending orders filtered by the segment query parameter.
- [x] Task 156.5: **Ingestion & UI Integration Tests**: Add integration tests verifying that qualifying a lead over WhatsApp correctly creates a pending Order, and that the segmented API returns correct results.

## Epic 157: Webhook Routing Gating & Custom Administrative Message
**Objective**: Fix the Telegram/WhatsApp webhook routing gating for users with `campaign_flow` active but custom routing configurations disabled, and implement a friendly informative reply for internal team members when `sales_intelligence` is disabled.

- [x] Task 157.1: **Campaign Flow Fallback**: Update the webhook routes in `telegram.py` and `whatsapp.py` to bypass the `prospective_clients` routing check if the `campaign_flow` feature is enabled.
- [x] Task 157.2: **Friendly Admin Notification**: Add a custom response in the webhook routes for team members (`sales_rep`) who write to a bot where `sales_intelligence` is disabled, explaining the active campaign status.
- [x] Task 157.3: **Routing Integration Tests**: Extend the test suite in `test_webhook_routing.py` and `test_sandbox_gates.py` to assert correct routing behavior for both prospects and team members under this configuration.

## Epic 158: Identity Resolution & Operator Context Safety
**Objective**: Fix two critical routing bugs: (1) saved prospects being locked out by B2B feature gates after their first qualification session, and (2) internal sales reps having their CRM operations applied to their own profile instead of the target customer account. No database migrations required.

**Dependencies**: Epic 153 (Multi-Tenant WhatsApp — completed), Epic 154 (Telegram Data Isolation — completed).
**Reference**: [Case Analysis](file:///Users/bernardo/projects/sherpa/temp/case_analysis_prospect_lockout_and_rep_decoupling.md)

### Case 1: Prospect Flow Continuity
- [x] Task 158.1: **Prospect Flag Guard in IdentityResolver**: Add an `is_prospect` check in `identity_resolver.py` `resolve_sender()` before the `client.stores` association check. If `client.is_prospect == True`, return `"prospective_client"` regardless of store links, preventing misclassification as `distributor_retailer`.

### Case 2: Sales Rep Target Decoupling
- [x] Task 158.2: **Sales Rep State Decoupling**: In `agentic_orchestrator.py`, nullify `active_store_id` for senders with `sales_rep` / `representative` / `agent` roles before graph initialization, forcing `discovery_scope = "GLOBAL"` and requiring explicit entity resolution per session.
- [x] Task 158.3: **Prompt Reinforcement for Internal Operators**: Add an OPERATIONAL PROTOCOL directive block to `b2b_sales_brain.j2` inside the `sales_rep` branch, instructing the LLM to call `resolve_entities` before any operational tool and to never apply CRM updates to the rep's own profile.
- [x] Task 158.4: **CRM Dashboard Role Filtering**: Exclude `sales_rep` / `representative` / `agent` roles from the `GET /clients` endpoint in `crm.py` to prevent internal staff from polluting CRM dashboard views.

### Verification
- [x] Task 158.5: **Integration Tests**: Validate the full prospect re-engagement flow (Turn 1 → qualification → Turn 2 still routes to ProspectQualifier) and the sales rep isolation flow (rep message → `store_id=None` → must resolve entity first). Assert CRM endpoint excludes staff records.

## Epic 159: Conversational Retail Lead Qualification Optimization
**Objective**: Optimize the inbound qualification flow for retail prospects (quantities below the wholesale threshold) by converting the abrupt upfront rejection message and 5-item bulk input collection into a conversational, step-by-step 2-phase process that mirrors the wholesale flow.

- [x] Task 159.1: **Conversational Refactoring**: Refactor the `collecting_retail_details` phase in `prospect_qualifier.py` to prompt for address/ZIP first, followed by contact details, avoiding rejection text during collection.
- [x] Task 159.2: **Dialogue Verification & Assertion Updates**: Update `test_whatsapp_campaign.py` and `test_simulated_session_3.py` to assert the non-rejecting step-by-step retail qualification dialogue.
