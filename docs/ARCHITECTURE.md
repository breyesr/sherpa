# Sherpa Architecture Map

## Overview
Sherpa is a B2B Sales Intelligence platform organized as a monorepo (`/backend` + `/frontend`).

```
/sherpa
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (trade, auth, crm, integrations, webhooks)
│   │   │   └── trade/    # Modular B2B routers (stores, products, orders, actions, objectives)
│   │   ├── core/         # DB engine, NullPool, JWT auth, Limiter, Memory, Webhook Security
│   │   ├── models/       # SQLAlchemy 2.x declarative models
│   │   │   └── trade/    # Modular B2B models (catalog, accounts, orders, actions)
│   │   ├── schemas/      # Pydantic V2 response/request DTOs
│   │   ├── services/     # GraphRAG, AI Orchestration, Messaging Engine (Meta Cloud API / Twilio)
│   │   │   └── messaging/# Meta Cloud Engine, Twilio Engine, Provisioners
│   │   └── tasks/        # Celery background tasks (messages, ingestion, sync)
│   └── tests/            # Pytest test suite (unit, integration, e2e)
└── frontend/
    ├── app/              # Next.js 14 App Router pages (trade, crm, settings, admin, auth)
    ├── components/       # Reusable UI components & V2 Drawers
    ├── hooks/            # Custom React hooks
    ├── lib/              # Centralized API client (apiClient.ts) and utils
    └── types/            # TypeScript interfaces (synced via openapi.json)
```

---

## ⚙️ Backend Primary Modules

- **`app/api/trade/`**: Modular sub-routers handling B2B entities:
  - `stores.py`: Accounts, visit history, delivery zip code metadata.
  - `actions.py`: Actionable intelligence ledger (StoreAction CRUD).
  - `objectives.py`: Dynamic action objectives & superadmin playbook templates.
  - `products.py` & `orders.py`: Wholesale catalog and order pipeline.
- **`app/api/integrations.py`**: WhatsApp config endpoint, Meta Embedded Signup authorization code exchange, and provisioner triggers.
- **`app/api/whatsapp.py` / `telegram.py`**: Inbound webhook endpoints with HMAC-SHA256 signature verification.
- **`app/core/webhook_security.py`**: Webhook signature verification middleware (`X-Hub-Signature-256`).
- **`app/services/messaging/`**:
  - `meta_cloud_engine.py`: Asynchronous Meta WhatsApp Cloud API engine (Graph API `v22.0`).
  - `base.py`: Abstract `BaseMessagingEngine` interface (`send_text`, `send_media`, `send_template`, `mark_as_read`).
- **`app/services/graphrag.py`**: GraphRAG retrieval engine with hybrid search (pgvector cosine similarity + Postgres full-text search + Reciprocal Rank Fusion).
- **`app/services/agentic_orchestrator.py`**: LangGraph state machine orchestrating field rep visit briefs and note processing.
- **`app/services/prospect_qualifier.py`**: Inbound prospect lead qualification engine with 24-hour window compliance.
- **`app/tasks/messages.py`**: Celery asynchronous tasks for decoupled background message processing and AI responses.
- **`app/core/database.py`**: Async SQLAlchemy engine with dynamic connection pooling (`NullPool` for Celery, capped pool for API).

---

## 🖥 Frontend Primary Routes

- **`/app/(dashboard)/page.tsx`**: Main Sherpa dashboard home & intake metrics.
- **`/app/trade/stores/page.tsx`**: Accounts / Points of Sale management list.
- **`/app/trade/stores/[id]/page.tsx`**: Account intelligence dossier, visit notes, and marketing/commercial action history.
- **`/app/trade/prospects/page.tsx`**: Unified prospect lead list, verification status, and conversion triggers.
- **`/app/trade/orders/page.tsx`**: Wholesale orders ledger with status timeline progression.
- **`/app/crm/page.tsx`**: Client CRM list, custom CRM attributes, and drawer editors.
- **`/app/settings/page.tsx`**: Business profile, integrations (WhatsApp Embedded Signup modal), and team preferences.
- **`/app/(admin)/admin/page.tsx`**: Superadmin management console (demo requests, business tenant controls, objective templates).

