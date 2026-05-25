# Implementation Plan: Sherpa Modular Pivot (Trade Vertical Focus)

## Objective
Expand Sherpa's capabilities by introducing a modular "Plug & Play" architecture, starting with a high-fidelity **Trade** vertical. The current appointment-scheduling CRM will be preserved as the **Basic** tier. The Trade module will implement a specialized relational schema (Stores, Orders, Products), a "Universal Data Gateway" for external integrations (API/CSV), and a constellation of specialized AI Agents.

## Background & Motivation
The project is pivoting from a generic scheduler to a domain-aware operational hub. By implementing the user-provided Trade DB schema, we enable advanced features like store-level briefings, order tracking, and competitor analysis. The "Basic" tier remains the entry point for simple service businesses.

## Scope & Impact
- **Backend:** Implementation of the Trade-specific schema (8+ new tables). Creation of a generic "Data Gateway" service for bulk imports and API syncing. Refactoring to a 1:N `Agent` architecture.
- **Frontend:** Dynamic UI that switches between the "Basic" (Appointment-centric) and "Trade" (Store/Product-centric) views. New modules for Inventory, Orders, and Lead Scoring.
- **AI/Agents:** For Trade users, specialized agents (Pre-Visit Briefer, Sales Closer, Lead Qualifier) with access to the full relational context.

## 1. Relational Trade Schema (Per `tradeDB.jpg`)
We will implement the provided schema to support deep trade operations:
- **Core Entities:** `Store`, `Customer`, `Orders`, `Products`, `Categories`.
- **Dossier System:** `Store_notes` (Risks, Opportunities, Preferred Actions) and `Customer_Notes` (Comm Style, Visit Dates).
- **Competitor Tracking:** `Competitors` table linked to stores.
- **Integration:** These tables will coexist with the `Basic` tables, activated only when the `TRADE` module is enabled.

## 2. Universal Data Gateway (Ingestion)
To support diverse business needs, we will implement a two-pronged ingestion strategy:
- **Bulk Inporter (CSV/XLSX):** A background worker (Celery) that maps external files to the Trade schema.
- **API Connector (Webhook/REST):** A flexible endpoint that allows businesses to sync their existing CRM/Inventory tools (e.g., SAP, HubSpot) with Sherpa in real-time.

## 3. Specialized Multi-Channel AI Agent Constellation
The AI will transition from a general assistant to a team of experts, operating seamlessly across **WhatsApp and Telegram**:
- **Lead Qualifier:** Scans incoming chats (WhatsApp/Telegram) and updates `lead_score` based on admin-defined metrics.
- **Visit Briefer:** Queried by the user via their preferred app ("Tell me about Store X"). It pulls Risks, Recent Orders, and Notes and sends a briefing back to the chat.
- **Post-Visit Chronicler:** Summarizes conversations from both channels and automatically suggests updates for `Customer_Notes`.
- **Unified Router:** A core component that identifies the client across platforms (using Phone/Telegram ID) to maintain a single source of truth in the Trade CRM.

## 4. Token Guardrails & Optimization Strategy
To prevent exponential increases in token consumption, we will implement the following:
- **Lightweight Intent Routing:** A low-cost "Dispatcher" prompt to filter noise (greetings, thanks) before invoking specialized agents.
- **Surgical Context Injection:** Use keyword/vector search to inject ONLY the relevant store/product context (e.g., if asking about Store X, don't load the entire dossier).
- **Conversation Summarization:** Use Redis-backed sliding window summaries instead of sending full chat histories.
- **Strict Output Schema:** Enforce concise JSON or bulleted completions to eliminate LLM verbosity.
- **Deterministic-First Logic:** Handle standard queries (e.g., "Next Appointment") via DB queries before involving the LLM.

## Phased Implementation Plan

### Phase 1: Trade Schema & Data Gateway (Backend)
1.  **Migration:** Add `vertical_type` to `BusinessProfile`.
2.  **Schema:** Implement the full Trade relational schema (8 tables).
3.  **Gateway:** Build the CSV mapping UI and the REST API ingestion endpoint.
4.  **Messaging:** Ensure `telegram_id` and `whatsapp_id` in the `Client` model are correctly linked to the new Trade `Customer` table.

### Phase 2: Trade AI & Multi-Channel Routing (Backend/AI)
1.  **Multi-Agent Router:** Update both WhatsApp and Telegram webhook handlers to route messages to specialized agents for Trade users.
2.  **Lead Scoring:** Implement the adjustable scoring engine across all active messaging channels.
3.  **Context Injection:** Grant agents read/write access to the new Trade tables, allowing them to pull store-specific context regardless of where the message originated.

### Phase 3: Trade Dashboard & Modular UI (Frontend)
1.  **Dynamic Navigation:** Conditional sidebar based on the active vertical.
2.  **Trade Modules:** Build views for Store Management, Order History, and the Product Catalog.
3.  **Import Center:** Create the UI for bulk data uploads and API key management.

## Verification & Safety
-   **Strict Isolation:** Ensure `BASIC` users never see Trade tables or logic.
-   **Data Consistency:** Verify that API/CSV imports correctly populate relationships (e.g., linking Orders to the right Customers and Products).
-   **Agent Accuracy:** Test the "Pre-Visit" briefing agent against complex store data to ensure it surfaces "Risks" and "Opportunities" correctly.

## Migration & Rollback
-   Existing data is untouched. The Trade module is purely additive.
-   Rollback involves a simple `vertical_type` toggle to revert a business to the Basic configuration.
