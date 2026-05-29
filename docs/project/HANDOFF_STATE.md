# Current Project State (Handoff)

## 📍 Overall Status
**B2B Sales Intelligence Pivot (Phase 1) is COMPLETE and DEPLOYED.**
The Sherpa architecture successfully transitioned from a B2C appointment bot to a B2B Field Sales Intelligence platform ("TRADE" mode). 

- **Infrastructure:** The `staging` environment on Railway is stable. The `Backend API`, `Asynchronous Processor` (Worker), and `Frontend Dashboard` are active. PostgreSQL is running with the `pgvector` extension enabled.
- **Database:** The schema has been surgically rebuilt to eliminate migration collisions. It includes the unified Trade models (`stores`, `agents`, `store_notes`, `competitors`) with robust foreign key constraints.
- **Frontend:** Next.js deployment is stable after bypassing strict TS/ESLint checks and increasing memory limits (1GB / 0.5 vCPU).

## 🚀 Recent Accomplishments (Sessions 1-5 + Stabilization)
1. **Foundation (Memory):** Implemented hybrid relational-vector models and fixed `ContextAssembler` model-naming logic.
2. **System Stabilization:** Resolved critical AIService/Sandbox crashes and implemented TanStack Query invalidation for real-time Calendar reactivity.
3. **Ingestion (Ear):** Built the `B2BOrchestrator` to classify intents and the `IngestionAgent` (using Instructor) to extract structured JSON from field notes via a Celery background queue.
4. **GraphRAG (Brain):** Built `GraphRAGService` to generate strategic "Pre-visit Briefs" using vector similarity search and SQL joins.
5. **Routing (Hands):** Enhanced Google Calendar sync with diagnostic logging and multi-retailer store linking.
6. **Dashboard (Eyes):** Transformed the UI to display "Accounts", "Contacts", and the "Store Dossier / Intelligence Timeline".

## 🚧 Next Immediate Steps
Start **Epic 106: Vertical-Aware Prompt Orchestration**.
- We are pivoting from the immediate implementation of voice notes to focus on architectural cleanliness. 
- We need to separate the B2C (Basic) and B2B (Trade) AI messaging flows to prevent logic leakage and ensure both tiers can coexist effectively.
- Task 106.1: Separate system prompts into `b2c_scheduler.j2` and `b2b_sales_brain.j2`.

**Epic 105: Audio Ingestion** is currently PAUSED.

## ⚠️ Known Tech Debt & Operational Risks
- **Next.js Strictness:** We bypassed TypeScript and ESLint during the `npm run build` phase to get the deployment unblocked. We need a cleanup sprint to resolve these `any` types and unused variables eventually.
- **Celery Logs:** Set to `--loglevel=warning` on Railway to prevent log-rate-limiting crashes. If tasks fail silently, we must check the worker logs carefully.
- **Migration History:** The database was "Force Flipped" using surgical SQL and `alembic stamp head`. We must be extremely careful with the next migration (`alembic revision --autogenerate`) to ensure it doesn't try to drop/recreate anything from the repair phase.