# Audit Implementation Plan

## Overview

Operationalize the 32 findings from [sherpa_code_audit.md](file:///Users/bernardo/projects/sherpa/temp/sherpa_code_audit.md) into the AI dev team workflow using a 3-layer approach.

---

## Layer 1: AGENTS.md Guardrails (Permanent Rules)

Add these sections to [.agents/AGENTS.md](file:///Users/bernardo/projects/sherpa/.agents/AGENTS.md) so **every agent session** enforces them without needing to read the audit.

### New Section: "RAM Optimization Guardrails (DO NOT REGRESS)"

> These 5 techniques together reduced Railway billing from $10/mo → $1.50/mo.
> Any PR touching these files MUST preserve these specific patterns:

| File | Constraint | Why |
|---|---|---|
| `backend/app/core/database.py` | Celery workers must use `NullPool` | Prevents idle connection pool RAM |
| `backend/app/core/database.py` | API pool: `pool_size=5, max_overflow=10` | Caps connection memory |
| `backend/Procfile` | `--max-tasks-per-child=50/100` | Recycles worker memory after N tasks |
| `backend/Procfile` | `--concurrency=1` (slow) / `--concurrency=4` (fast) | Minimizes per-worker footprint |
| `backend/app/core/memory.py` | Redis `ltrim` to 20 messages | Prevents unbounded Redis growth |

### New Section: "Security Non-Negotiables"

> - **No default SECRET_KEY**: `config.py` must NOT have a fallback for `SECRET_KEY`. It must crash at startup if unset.
> - **No unauthenticated endpoints**: Every data-mutating route must use `Depends(get_current_user)` or API key auth.
> - **No wildcard CORS**: Do not use regex patterns like `.*\.up\.railway\.app`. Use explicit origin lists only.
> - **No bare except blocks**: Always specify the exception type. `except: pass` is banned.

### New Section: "Code Quality Standards"

> - **Backend files**: No single `.py` file should exceed 600 lines. Split into sub-modules when approaching this limit.
> - **Frontend files**: No single `.tsx` file should exceed 800 lines. Extract sub-components and custom hooks.
> - **Frontend API calls**: Use the centralized API client (`lib/apiClient.ts`) for all fetch calls. Do not construct raw `fetch()` with inline headers.
> - **Frontend types**: Do not use `: any`. Import types from `@/types/api.ts` or define local interfaces.

---

## Layer 2: BACKLOG.md — 4 New Epics

### Epic 200: Security Hardening (Sprint Priority: 🔴 Immediate)
> **Reference**: `temp/sherpa_code_audit.md` — SEC-01 through SEC-09.

- [ ] Task 200.1: **Remove Default SECRET_KEY** — Remove the fallback string `"supersecretkey_please_change_in_production"` from `backend/app/core/config.py`. Make `SECRET_KEY` a required field with no default.
- [ ] Task 200.2: **Authenticate Data Gateway Sync** — Add `Depends(get_current_user)` to `POST /sync` in `backend/app/api/data_gateway.py:92`.
- [ ] Task 200.3: **Lock Down CORS Origins** — Replace `allow_origin_regex=r"https://.*\.up\.railway\.app"` in `backend/app/main.py` with explicit allowed origins list.
- [ ] Task 200.4: **Server-Side Auth Cookie** — Move JWT cookie setting from client-side `document.cookie` (in `frontend/store/authStore.ts`) to server-side `Set-Cookie` header from the `/auth/login` response with `HttpOnly; Secure; SameSite=Lax` flags.
- [ ] Task 200.5: **Protect Telegram Debug Endpoint** — Gate `/debug/info` in `backend/app/api/telegram.py` behind admin-only auth or remove in production.
- [ ] Task 200.6: **File Upload Extension Whitelist** — Validate `file_ext` in `backend/app/api/data_gateway.py:65` against allowed types (`.csv`, `.xlsx`, `.json`).
- [ ] Task 200.7: **Replace print() with logging** — Replace all `print()` calls in `backend/app/api/whatsapp.py`, `telegram.py`, and `backend/app/core/encryption.py` with `logging.getLogger(__name__)`.

### Epic 201: Performance & Reliability (Sprint Priority: 🟠 This Sprint)
> **Reference**: `temp/sherpa_code_audit.md` — PERF-01 through PERF-07.

- [ ] Task 201.1: **Parallelize GraphRAG Hybrid Search** — Wrap semantic + keyword search in `asyncio.gather()` in `backend/app/services/graphrag.py`. Expected ~50% latency reduction.
- [ ] Task 201.2: **Add LLM Timeouts** — Add `timeout=30` to all `litellm.acompletion` calls in `backend/app/core/ai_service.py`.
- [ ] Task 201.3: **Pin Python Dependencies** — Generate `requirements.lock` via `pip freeze` from the current working environment. Deploy from lock file.
- [ ] Task 201.4: **Enable TypeScript Build Checks** — Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` from `frontend/next.config.mjs`. Fix resulting type errors iteratively.
- [ ] Task 201.5: **Fix Bare Except Blocks** — Replace all 12 bare `except:` blocks across `telegram.py`, `ai_service.py`, and `calendar_tools.py` with specific exception types + logging.
- [ ] Task 201.6: **Celery Task Idempotency** — Add Redis-backed deduplication keys to `backend/app/tasks/messages.py` and `ingestion.py` to prevent duplicate processing on retries.
- [ ] Task 201.7: **Async Context Summarization** — Move the synchronous LLM summarization call in `backend/app/core/context_assembler.py` to a post-response async task that caches the result in Redis.

### Epic 202: Backend Architecture Cleanup (Sprint Priority: 🟡 Next Sprint)
> **Reference**: `temp/sherpa_code_audit.md` — ARCH-01, ARCH-03, ARCH-06 through ARCH-08.

- [ ] Task 202.1: **Split trade.py API Router** — Break `backend/app/api/trade.py` (1,271 lines) into sub-routers: `api/trade/stores.py`, `api/trade/orders.py`, `api/trade/actions.py`, `api/trade/products.py`. Keep `api/trade/__init__.py` as the aggregator.
- [ ] Task 202.2: **Split trade.py Models** — Break `backend/app/models/trade.py` (697 lines) into `models/store.py`, `models/order.py`, `models/product.py`, `models/action.py`. Keep `models/trade.py` as re-export hub.
- [ ] Task 202.3: **Organize Backend Scripts** — Move the 34+ one-off scripts from `backend/` root into `backend/scripts/{diagnostics,migrations,repairs,seeders}/`.
- [ ] Task 202.4: **Create Test Fixtures** — Add `backend/app/tests/conftest.py` with shared async DB session, mock user, and mock business fixtures.
- [ ] Task 202.5: **Extract Shared Constants** — Move constants like `DEFAULT_FEATURES_CONFIG` from `api/business.py` to `core/constants.py` to eliminate circular import workarounds in `auth.py`.

### Epic 203: Frontend Architecture Cleanup (Sprint Priority: 🟡 Next Sprint)
> **Reference**: `temp/sherpa_code_audit.md` — ARCH-02, ARCH-04, ARCH-05, CQ-02, CQ-03, CQ-08.

- [ ] Task 203.1: **Create Centralized API Client** — Implement `frontend/lib/apiClient.ts` with typed `apiFetch<T>()` function handling auth headers, error parsing, and token refresh. Migrate 3 high-traffic pages to use it first.
- [ ] Task 203.2: **Adopt react-hook-form + zod** — Add `react-hook-form` and `zod` to `package.json`. Refactor v2 Drawer components (`AccountDrawer.tsx`, `ClientDrawer.tsx`, `ServiceDrawer.tsx`) to use form library instead of individual `useState` hooks.
- [ ] Task 203.3: **Complete v1→v2 Component Migration** — Delete v1 Modal components (`ClientModal.tsx`, `StoreModal.tsx`) after verifying all references point to v2 Drawer equivalents.
- [ ] Task 203.4: **Eliminate any Types** — Replace top-50 `: any` usages across `trade/actions/page.tsx`, `IntegrationsPanel.tsx`, `retailers/[id]/page.tsx`, `notes/page.tsx` with proper types from `@/types/api.ts`.
- [ ] Task 203.5: **Frontend Test Infrastructure** — Set up Vitest + React Testing Library. Write integration tests for login flow and dashboard data loading.

---

## Layer 3: Backlog Housekeeping

The backlog is at **455 lines** — exceeding the 400-line hygiene limit. The following **12 fully-completed epics** will be moved to `docs/project/ARCHIVE_BACKLOG.md`:

| Epic | Title | Status |
|---|---|---|
| 153 | Multi-Tenant Dedicated WhatsApp Senders | ✅ All 20 tasks complete |
| 154 | Telegram Multi-Tenant Data Isolation Fix | ✅ All 3 tasks complete |
| 155 | Hybrid Sidebar Modularity | ✅ All 4 tasks complete |
| 156 | Automated Order Generation | ✅ All 5 tasks complete |
| 157 | Webhook Routing Gating | ✅ All 3 tasks complete |
| 158 | Identity Resolution & Operator Context Safety | ✅ All 5 tasks complete |
| 159 | Conversational Retail Lead Qualification | ✅ All 3 tasks complete |
| 162 | Dynamic Module-Based UX/UI Personalization | ✅ All 3 tasks complete |
| 163 | Prospecting Flow Simplification | ✅ All 5 tasks complete |
| 164 | Prospect & Order Verification Flow | ✅ All 5 tasks complete |
| 165 | Campaign-Flow Dashboard Personalization | ✅ All 5 tasks complete |
| 166 | B2C CRM Drawer Migration | ✅ All 6 tasks complete |
| 167 | B2C Services Drawer Migration | ✅ All 4 tasks complete |

After archival + new epics, the backlog will be ~**200 lines** — well within limits.

---

## Execution Notes

- **Agents don't need to read the full audit**. The AGENTS.md guardrails cover "don't break this" rules. Each epic task has enough context to be self-contained.
- **The audit stays at `temp/sherpa_code_audit.md`** as a reference for rationale/tradeoffs if an agent or developer needs deeper context.
- **Epic 200 (Security)** should be the very first work item — several findings are trivially exploitable in production.
