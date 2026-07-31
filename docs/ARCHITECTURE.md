# Sherpa Architecture Map

## Overview
Sherpa is a B2B Sales Intelligence platform monorepo (`/backend` + `/frontend`).

```
/sherpa
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers
│   │   ├── core/         # DB, Auth, Limiter, Memory, Config
│   │   ├── models/       # SQLAlchemy 2.x models
│   │   ├── schemas/      # Pydantic V2 response/request DTOs
│   │   ├── services/     # GraphRAG, AI Orchestration, Messaging Engine
│   │   └── tasks/        # Celery background tasks
│   └── tests/            # Pytest test suite
└── frontend/
    ├── app/              # Next.js 14 App Router pages
    ├── components/       # UI components & V2 Drawers
    ├── hooks/            # Custom React hooks
    ├── lib/              # API client and utilities
    └── types/            # TypeScript interfaces
```

## Backend Primary Modules
- **`app/api/trade/`**: Package containing B2B sub-routers (stores, products, orders, actions).
- **`app/models/trade/`**: Package containing B2B database models (catalog, accounts, orders, actions).
- **`app/api/business.py`**: Business profile, feature flags, stats & live test chat.
- **`app/api/whatsapp.py` / `telegram.py`**: Inbound webhook routing & messaging triggers.
- **`app/api/crm.py`**: B2C Client management & custom CRM fields.
- **`app/services/graphrag.py`**: Hybrid search (semantic + keyword + RRF ranking).
- **`app/services/agentic_orchestrator.py`**: LangGraph agent state machine.
- **`app/services/prospect_qualifier.py`**: Inbound prospect lead qualification engine.
- **`app/core/database.py`**: Async SQLAlchemy engine & Celery NullPool config.
- **`app/core/config.py`**: Pydantic BaseSettings & production secret validation.

## Frontend Primary Routes
- **`/app/(dashboard)/page.tsx`**: Main Sherpa dashboard home & intake funnel.
- **`/app/trade/stores/page.tsx`**: Accounts / Points of Sale management list.
- **`/app/trade/stores/[id]/page.tsx`**: Account intelligence dossier & details.
- **`/app/trade/prospects/page.tsx`**: Unified prospect lead list & verification.
- **`/app/crm/page.tsx`**: B2C Client CRM list & drawers.
