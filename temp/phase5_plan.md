# Phase 5: Backend Architecture — Execution Plan

> **Status**: 3/5 tasks complete. This plan covers the remaining two epics.
> **Estimated Total**: 7–10 hours dev time · ~250K tokens (≈2.5% of 10M weekly quota)

---

## Summary

| Epic | Task | Current State | Target State | Effort |
|------|------|---------------|--------------|--------|
| 202.1 | Split `api/trade.py` into sub-routers | 1,278 lines, single file | 5 files in `api/trade/` package, each ≤450 lines | 4–6 hrs |
| 202.2 | Split `models/trade.py` into domain modules | 703 lines, single file | 4 files in `models/trade/` package, each ≤370 lines | 3–4 hrs |

---

## Epic 202.1 — Split `api/trade.py` into Sub-routers

### Problem

`api/trade.py` is 1,278 lines — more than double the 600-line backend limit set in `AGENTS.md`. It mixes 7 unrelated domain areas (stores, postal codes, products, orders, competitors, AI briefs, and the Strategy Desk action system) in a single file.

### Target Architecture

```
backend/app/api/trade/
├── __init__.py      # Combined router + re-exports for test backward compat
├── helpers.py       # Shared helpers: get_business(), get_b2b_business()
├── stores.py        # Stores, Store Notes, Postal Codes, Competitors, AI Briefs (~450 lines)
├── products.py      # Categories & Products CRUD (~140 lines)
├── orders.py        # Orders & Prospect Orders CRUD (~140 lines)
└── actions.py       # Action Templates, Store Actions, Objectives (~400 lines)
```

### File-by-File Breakdown

#### 1. `helpers.py` (~25 lines)
- `get_business(db, user_id)` — shared multi-tenant lookup
- `get_b2b_business(db, current_user)` — B2B feature gate check
- Shared imports: `AsyncSession`, `select`, `HTTPException`, `BusinessProfile`, `User`

#### 2. `stores.py` (~450 lines)
Endpoints moved here:
- `GET /stores` — list stores
- `POST /stores` — create store (with client assignment + history logging)
- `GET /stores/{store_id}` — get single store
- `PATCH /stores/{store_id}` — update store (with auto-verify orders cascade)
- `DELETE /stores/{store_id}` — delete store (complex cascade: orders, notes, competitors, clients, vectors)
- `POST /stores/{store_id}/notes` — create store note
- `GET /postal-codes` — list postal codes
- `GET /postal-codes/states` — list states
- `GET /postal-codes/municipalities` — list municipalities by state
- `GET /postal-codes/zip-codes` — list zip codes by state+municipality
- `GET /postal-codes/{zip_code}` — lookup postal code
- `GET /competitors` — list competitors
- `POST /competitors` — create competitor
- `GET /stores/{store_id}/brief` — GraphRAG strategic brief
- `POST /clients/{client_id}/brief` — AI visit brief
- `POST /clients/{client_id}/qualify` — lead qualification

> **Note**: Competitors and AI briefs are placed here (not in `actions.py`) because they are scoped to the store/account intelligence domain, not the Strategy Desk action system.

#### 3. `products.py` (~140 lines)
Endpoints moved here:
- `GET /categories` — list categories
- `POST /categories` — create category
- `GET /products` — list products
- `POST /products` — create product
- `GET /products/{product_id}` — get product
- `PATCH /products/{product_id}` — update product
- `DELETE /products/{product_id}` — delete product

#### 4. `orders.py` (~140 lines)
Endpoints moved here:
- `GET /prospects/orders` — list prospect orders (unverified)
- `GET /orders` — list orders
- `POST /orders` — create order with items
- `GET /orders/{order_id}` — get order
- `PATCH /orders/{order_id}` — update order

#### 5. `actions.py` (~400 lines)
Endpoints moved here:
- `GET /action-templates` — list action templates
- `POST /action-templates` — create action template
- `PATCH /action-templates/{template_id}` — update action template
- `DELETE /action-templates/{template_id}` — delete action template
- `GET /actions` — list store actions (with filters + joinedload enrichment)
- `GET /actions/{action_id}` — get single store action
- `POST /actions` — create store action (with template resolution + objective validation)
- `PATCH /actions/{action_id}` — update store action (strict completion validation)
- `DELETE /actions/{action_id}` — delete store action
- `GET /objectives` — list objectives
- `POST /objectives` — create objective
- `DELETE /objectives/{obj_id}` — delete objective

#### 6. `__init__.py` (~40 lines)
This is the **backward-compatibility shim** that keeps all existing imports and test mocks working:

```python
"""
Trade & Accounts Router package.
Split from monolithic trade.py into domain sub-routers.
"""
from fastapi import APIRouter

from app.api.trade.helpers import get_business, get_b2b_business
from app.api.trade.stores import router as stores_router
from app.api.trade.products import router as products_router
from app.api.trade.orders import router as orders_router
from app.api.trade.actions import router as actions_router

# Re-export all endpoint functions for test backward compatibility
from app.api.trade.stores import (
    list_stores, create_store, get_store, update_store, delete_store,
    create_store_note, list_postal_codes, list_states, list_municipalities,
    list_zip_codes, lookup_postal_code, list_competitors, create_competitor,
    get_strategic_brief, generate_visit_brief, qualify_lead,
)
from app.api.trade.products import (
    list_categories, create_category, list_products, create_product,
    get_product, update_product, delete_product,
)
from app.api.trade.orders import (
    list_prospect_orders, list_orders, create_order, get_order, update_order,
)
from app.api.trade.actions import (
    list_action_templates, create_action_template, update_action_template,
    delete_action_template, list_store_actions, get_store_action,
    create_store_action, update_store_action, delete_store_action,
    list_objectives, create_objective, delete_objective,
)

# Re-export Celery tasks so @patch("app.api.trade.sync_vector_task") keeps working
from app.tasks.knowledge import sync_vector_task, delete_vector_task

# Combined router
router = APIRouter()
router.include_router(stores_router)
router.include_router(products_router)
router.include_router(orders_router)
router.include_router(actions_router)
```

### Latent Bug Fix

> **WARNING — `datetime` NameError in `update_store_action`** (current line 1185):
> `action.resolved_at = datetime.utcnow()` — but `datetime` is never imported at module level. This causes a runtime crash when a user marks an action as `COMPLETED`. Fixed during the split by adding `from datetime import datetime` to `actions.py`.

### Test Impact Analysis

| Test File | Imports From `app.api.trade` | Impact |
|-----------|------------------------------|--------|
| `test_dynamic_objectives.py` | `create_store_action`, `update_store_action`, `list_objectives`, `create_objective`, `delete_objective` + patches `app.api.trade.get_business` | ✅ No changes needed — `__init__.py` re-exports all symbols |
| `test_vector_sync_fixes.py` | `delete_store`, `create_competitor` + patches `app.api.trade.get_business`, `sync_vector_task`, `delete_vector_task` | ✅ No changes needed — `__init__.py` re-exports all symbols |
| `test_actions.py` | Only imports from `app.schemas.trade` | ✅ No changes needed |
| `test_prospect_classification.py` (manual) | `from app.api.trade import list_stores` | ✅ No changes needed |

> **IMPORTANT**: The `@patch` mock target resolution is the critical constraint. When test code does `@patch("app.api.trade.get_business")`, Python resolves this against the `app.api.trade` **package** `__init__.py`. As long as `get_business` is imported and re-exported there, the patch target remains valid. Each sub-module must import `get_business` from `app.api.trade.helpers` directly (not from the package) to avoid circular imports.

### Router Registration

`router.py` currently has:
```python
from app.api.trade import router as trade_router
```
This import path stays **exactly the same** — the package `__init__.py` exports `router`.

### Execution Steps

1. **Create `backend/app/api/trade/` directory**
2. **Write `helpers.py`** — extract `get_business` + `get_b2b_business`
3. **Write `stores.py`** — move store/postal/competitor/AI brief endpoints
4. **Write `products.py`** — move category + product endpoints
5. **Write `orders.py`** — move order endpoints
6. **Write `actions.py`** — move action/template/objective endpoints + fix `datetime` import
7. **Write `__init__.py`** — combined router + all re-exports
8. **Delete original `backend/app/api/trade.py`** (now replaced by package)
9. **Run `./venv/bin/pytest`** — verify all 58 tests pass
10. **Verify line counts** — confirm no file exceeds 600 lines

---

## Epic 202.2 — Split `models/trade.py` into Domain Modules

> **IMPORTANT**: Must be done **after** 202.1 — the API split depends on importing models from `app.models.trade`. Changing the models import path simultaneously would double the blast radius.

### Problem

`models/trade.py` is 703 lines — over the 600-line backend limit. It contains 15 classes spanning 5 different domain areas (catalog, accounts, orders, actions, and intelligence).

### Target Architecture

```
backend/app/models/trade/
├── __init__.py       # Re-exports everything for backward compat
├── catalog.py        # Category, Product, PostalCode (~130 lines)
├── accounts.py       # Store, StoreNote, Competitor, CustomerNote, store_clients, ClientStoreHistory (~370 lines)
├── orders.py         # Order, OrderItem, OrderStatus (~80 lines)
└── actions.py        # ActionCategory, ActionStatus, ActionTemplate, StoreAction, StoreActionObjective, AccountIntelligence (~220 lines)
```

### File-by-File Breakdown

#### 1. `catalog.py` (~130 lines)
- Enums: (none)
- Models: `Category`, `Product`, `PostalCode`
- These are standalone product/catalog models with no cross-domain FK dependencies

#### 2. `accounts.py` (~370 lines)
- Enums: `StoreNoteType`, `DataSourceType`
- Tables: `store_clients` (M2M association)
- Models: `Store`, `StoreNote`, `Competitor`, `CustomerNote`, `ClientStoreHistory`
- This is the largest file because `Store` has complex address parsing, semantic summaries, and multiple relationships
- `DataSourceType` is shared across `StoreNote`, `Competitor`, `CustomerNote`, and `Order` — it lives here since 3 of 4 consumers are in this file

#### 3. `orders.py` (~80 lines)
- Enums: `OrderStatus`
- Models: `Order`, `OrderItem`
- Imports `DataSourceType` from `accounts.py`

#### 4. `actions.py` (~220 lines)
- Enums: `ActionCategory`, `ActionStatus`
- Models: `StoreActionObjective`, `ActionTemplate`, `StoreAction`, `AccountIntelligence`
- `AccountIntelligence` is placed here rather than in `accounts.py` to avoid circular relationship definitions — it has a `back_populates="intelligence"` on `Store` which is forward-declared

#### 5. `__init__.py` (~35 lines)
Re-exports **every** class, enum, and table so that all 40+ existing import sites (`from app.models.trade import Store, ...`) continue working with zero changes:

```python
"""
Trade Domain Models package.
Split from monolithic trade.py into domain sub-modules.
"""
# Enums
from app.models.trade.accounts import StoreNoteType, DataSourceType
from app.models.trade.orders import OrderStatus
from app.models.trade.actions import ActionCategory, ActionStatus

# Association tables
from app.models.trade.accounts import store_clients

# Models
from app.models.trade.catalog import Category, Product, PostalCode
from app.models.trade.accounts import Store, StoreNote, Competitor, CustomerNote, ClientStoreHistory
from app.models.trade.orders import Order, OrderItem
from app.models.trade.actions import StoreActionObjective, ActionTemplate, StoreAction, AccountIntelligence
```

### Dependency Graph

SQLAlchemy relationship strings (e.g., `relationship("Store")`) resolve by class name at runtime, not by import path. This means cross-file relationships work automatically as long as all models are registered on `Base.metadata` before engine creation — which `models/__init__.py` already guarantees.

### Consumer Impact Analysis

There are **40+ files** importing from `app.models.trade`. All continue working unchanged thanks to the `__init__.py` re-export shim:

| Consumer Category | Files | Example Import | Impact |
|-------------------|-------|----------------|--------|
| API routers | 4 | `from app.models.trade import Store, Order` | ✅ No changes |
| Services | 6 | `from app.models.trade import Store, StoreNote` | ✅ No changes |
| Tasks | 2 | `from app.models.trade import Store, Competitor` | ✅ No changes |
| Tests | 9 | `from app.models.trade import Store, StoreAction` | ✅ No changes |
| Scripts | 8 | `from app.models.trade import PostalCode` | ✅ No changes |
| Schemas | 1 | `from app.models.trade import ActionCategory` | ✅ No changes |
| Migrations | 1 | `from app.models.trade import Store, ...` | ✅ No changes |
| models/__init__ | 1 | `from app.models.trade import Store, ...` | ✅ No changes |

### Alembic Migration Safety

> **CAUTION**: After splitting models into sub-files, running `alembic revision --autogenerate` might detect phantom table drops/creates if the models aren't properly registered. **Verification step**: After the split, run `alembic check` (or `alembic revision --autogenerate -m "test"`) and confirm it produces an empty migration with "No changes detected."

### Execution Steps

1. **Create `backend/app/models/trade/` directory**
2. **Write `catalog.py`** — move `Category`, `Product`, `PostalCode`
3. **Write `accounts.py`** — move `store_clients`, `Store`, `StoreNote`, `Competitor`, `CustomerNote`, `ClientStoreHistory`, and shared enums
4. **Write `orders.py`** — move `Order`, `OrderItem`, `OrderStatus`
5. **Write `actions.py`** — move action-related models + `AccountIntelligence`
6. **Write `__init__.py`** — re-export all symbols
7. **Delete original `backend/app/models/trade.py`**
8. **Run `./venv/bin/pytest`** — verify all 58 tests pass
9. **Run `alembic check`** — verify no phantom migrations generated

---

## Execution Order & Risk Mitigation

### Sequence

```
202.1 (API split) ──> pytest green ──> 202.2 (models split) ──> pytest green + alembic check
```

**Why this order?** 202.1 is higher risk (1,278 lines, test mocks) and higher reward (largest file in the codebase). Completing it first gives a green test baseline before touching the model layer. If 202.2 breaks something, we can easily isolate the cause.

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Test mock targets break (`@patch("app.api.trade.xyz")`) | Medium | High | `__init__.py` re-exports all functions and tasks at package level |
| Circular imports between sub-modules | Low | High | Sub-modules import from `helpers.py` directly, never from the package `__init__.py` |
| SQLAlchemy relationship strings fail after model split | Very Low | High | Relationships use class name strings, not import paths; all models registered via `models/__init__.py` |
| Alembic generates phantom migration | Low | Medium | Run `alembic check` immediately after 202.2; empty migration = safe |
| `datetime.utcnow()` NameError exposed | Already broken | High | Fixed during 202.1 by adding proper import in `actions.py` |

---

## Token Budget Breakdown

| Phase | Activity | Estimated Tokens |
|-------|----------|-----------------|
| 202.1 | Context loading (read files, search imports) | ~20K |
| 202.1 | Write 5 new files + `__init__.py` | ~60K |
| 202.1 | Delete old file + run tests + iterate | ~30K |
| 202.2 | Context loading (reuse from 202.1) | ~10K |
| 202.2 | Write 4 new files + `__init__.py` | ~50K |
| 202.2 | Delete old file + run tests + alembic check | ~30K |
| **Buffer** | Unexpected test failures, edge cases | ~50K |
| **Total** | | **~250K tokens** |

### Quota Impact

| Quota Plan | Tokens Used | Percentage |
|------------|-------------|------------|
| 10M weekly | ~250K | **~2.5%** |
| 5M weekly | ~250K | **~5.0%** |

---

## Definition of Done

- [ ] `backend/app/api/trade.py` replaced by `backend/app/api/trade/` package (5 files)
- [ ] `backend/app/models/trade.py` replaced by `backend/app/models/trade/` package (4 files)
- [ ] No file exceeds 600 lines
- [ ] All 58 pytest tests pass
- [ ] No existing test files were modified
- [ ] `router.py` import path unchanged (`from app.api.trade import router`)
- [ ] `models/__init__.py` import path unchanged (`from app.models.trade import Store, ...`)
- [ ] `datetime` NameError in `update_store_action` fixed
- [ ] Alembic detects no phantom schema changes
- [ ] `prioritized_tasks.md` updated: 202.1 and 202.2 marked `[x]`
