# 🔍 Sherpa Project — Comprehensive Code Audit

**Date**: July 22, 2026 · **Scope**: Full codebase · **Auditor**: Senior Developer Review

> **Summary**: Sherpa is a well-architected B2B Sales Intelligence platform with solid foundations (async FastAPI, pgvector, Celery queue separation, Contract-First types). However, it has accumulated significant technical debt across all areas: critical security gaps in configuration and CORS, performance bottlenecks in sequential async calls, monolithic files blocking maintainability, and a frontend suffering from absent abstractions. This report prioritizes **19 critical/high findings** and **24 medium/low improvements** across 4 domains.

---

## Project Scale Overview

| Metric | Value |
|---|---|
| Backend Python files (excl. venv, migrations) | 132 |
| Frontend TS/TSX files (excl. node_modules) | 68 |
| Backend total LOC (key modules) | ~6,000 (api+services+core) |
| Frontend total LOC | ~19,800 |
| Alembic migrations | 68 versions |
| One-off backend scripts | 34+ |
| Test files | 21 (backend only) |

---

## 1. 🔒 Security

### CRITICAL

#### SEC-01: Hardcoded Default `SECRET_KEY` in Config
- **File**: [config.py](file:///Users/bernardo/projects/sherpa/backend/app/core/config.py)
- **Issue**: `SECRET_KEY` defaults to `"supersecretkey_please_change_in_production"`. If the production `.env` is missing this variable, **all JWTs are signed with a publicly known key**, allowing trivial token forgery.
- **Fix**: Remove the default entirely. Make `SECRET_KEY` a required field that crashes at startup if unset:
  ```python
  SECRET_KEY: str  # No default — forces explicit configuration
  ```

#### SEC-02: Unauthenticated Data Sync Endpoint
- **File**: [data_gateway.py:92-100](file:///Users/bernardo/projects/sherpa/backend/app/api/data_gateway.py#L92-L100)
- **Issue**: The `POST /sync` endpoint has a literal `# TODO: Add API Key or Internal Auth` comment. It's deployed with **no authentication**.
- **Fix**: Add `Depends(get_current_user)` or implement API key authentication before the next deployment.

#### SEC-03: Overly Permissive CORS Regex
- **File**: [main.py](file:///Users/bernardo/projects/sherpa/backend/app/main.py)
- **Issue**: `allow_origin_regex=r"https://.*\.up\.railway\.app"` allows **any** Railway-hosted application to make authenticated requests. An attacker can deploy a malicious app on Railway to exploit this.
- **Fix**: Replace with explicit allowed domains:
  ```python
  allow_origins=[
      "https://sherpa-web.up.railway.app",
      "https://your-custom-domain.com",
      ...static_origins
  ]
  ```

### HIGH

#### SEC-04: Auth Cookie Missing `Secure` and `HttpOnly` Flags
- **File**: [authStore.ts:18](file:///Users/bernardo/projects/sherpa/frontend/store/authStore.ts#L18)
- **Issue**: The JWT token is stored via `document.cookie` with only `SameSite=Lax`. Missing:
  - `Secure` — token transmits over HTTP in non-HTTPS environments
  - `HttpOnly` — token is accessible to any JavaScript (XSS attack vector)
- **Fix**: Set the cookie server-side via `Set-Cookie` header from the login API response with `HttpOnly; Secure; SameSite=Lax`.

#### SEC-05: Encryption Fails Silently, Returns Plaintext
- **File**: [encryption.py](file:///Users/bernardo/projects/sherpa/backend/app/core/encryption.py)
- **Issue**: `decrypt_value()` catches all exceptions and returns the original encrypted input as-is if it can't decrypt. This means corrupted or tampered tokens silently pass through as "valid" data.
- **Fix**: Raise an explicit `DecryptionError` on failure so callers can handle it.

#### SEC-06: Telegram Debug Endpoint Exposes Webhook Data
- **File**: [telegram.py](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py)
- **Issue**: A `/debug/info` route dumps webhook information for all configured bots. If this endpoint lacks proper admin-only protection, it leaks integration secrets.
- **Fix**: Gate behind `Depends(get_current_admin_user)` or remove in production builds.

### MEDIUM

#### SEC-07: JWT Token Has No Refresh Mechanism
- **File**: [auth.py](file:///Users/bernardo/projects/sherpa/backend/app/api/auth.py)
- **Issue**: Access tokens are issued with a fixed TTL and stored in `localStorage` + cookie (7-day `max-age`). There's no refresh token flow — when the token expires, the user must re-login.
- **Fix**: Implement a `/auth/refresh` endpoint with short-lived access tokens (15min) and longer-lived refresh tokens (7 days, rotated on use).

#### SEC-08: File Upload Path Traversal Risk
- **File**: [data_gateway.py:65-67](file:///Users/bernardo/projects/sherpa/backend/app/api/data_gateway.py#L65-L67)
- **Issue**: `file.filename` is used to extract the extension via `os.path.splitext()`. While the filename itself isn't used for the path (a UUID is generated), the extension is taken directly from user input without validation. A crafted filename could inject unexpected extensions.
- **Fix**: Whitelist allowed extensions: `if file_ext.lower() not in {'.csv', '.xlsx', '.json'}: raise HTTPException(400, "Unsupported file type")`.

#### SEC-09: `print()` Statements Instead of Structured Logging
- **Files**: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py), [telegram.py](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py), [encryption.py](file:///Users/bernardo/projects/sherpa/backend/app/core/encryption.py)
- **Issue**: Security-sensitive operations (webhook verification, encryption failures) use `print()` which goes to stdout without timestamps, levels, or correlation IDs. In production, these are hard to filter and may leak to container logs.
- **Fix**: Replace with `import logging; logger = logging.getLogger(__name__)` across all modules.

---

## 2. ⚡ Performance & Scalability

### HIGH

#### PERF-01: Sequential Async Queries in GraphRAG Hybrid Search
- **File**: [graphrag.py](file:///Users/bernardo/projects/sherpa/backend/app/services/graphrag.py)
- **Issue**: Semantic search and keyword search are executed sequentially with separate `await` calls. Each query hits the database independently.
- **Fix**: Use `asyncio.gather()` for parallel execution:
  ```python
  semantic_results, keyword_results = await asyncio.gather(
      self.semantic_search(query, business_id),
      self.keyword_search(query, business_id),
  )
  ```
- **Impact**: ~50% latency reduction on every GraphRAG query at any scale.

#### PERF-02: AI Service Missing Timeouts
- **File**: [ai_service.py](file:///Users/bernardo/projects/sherpa/backend/app/core/ai_service.py)
- **Issue**: LLM calls via `litellm.acompletion` lack explicit `timeout` parameters, unlike `graphrag.py` which sets `timeout=45.0`. If the LLM provider stalls, the request hangs indefinitely.
- **Impact**: At 1,000+ concurrent users, a single OpenAI outage could exhaust all Celery workers.
- **Fix**: Add `timeout=30` to all `acompletion` calls. Implement circuit-breaker pattern for external API calls.

#### PERF-03: Context Assembler Synchronous Summarization in Critical Path
- **File**: [context_assembler.py](file:///Users/bernardo/projects/sherpa/backend/app/core/context_assembler.py)
- **Issue**: When chat history exceeds 12 turns, it triggers a synchronous LLM call to `gpt-4o-mini` to generate a summary — adding 1-3 seconds of latency to the user's response.
- **Fix**: Pre-compute summaries asynchronously after each message, caching the result in Redis. The critical path then reads the cached summary instead of generating it on-demand.

### MEDIUM

#### PERF-04: Unpinned Dependencies Risk Production Breakage
- **File**: [requirements.txt](file:///Users/bernardo/projects/sherpa/backend/requirements.txt)
- **Issue**: 38 of 39 dependencies use `>=` bounds. Only `bcrypt==4.0.1` is pinned. A `pip install` on a fresh deploy could pull breaking changes in `litellm`, `langchain`, or `fastapi`.
- **Fix**: Generate a `requirements.lock` via `pip freeze` and deploy from it. Keep `requirements.txt` with `>=` for development only.

#### PERF-05: Frontend Build Ignores TypeScript and ESLint Errors
- **File**: [next.config.mjs](file:///Users/bernardo/projects/sherpa/frontend/next.config.mjs)
- **Issue**: `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` suppress all compile-time checks. Runtime errors from type mismatches or undefined variables will only be caught in production.
- **Impact**: Every deployment is a gamble — bugs that TypeScript was designed to catch are silently shipped.
- **Fix**: Remove both flags. Fix existing type errors iteratively. The CI pipeline (`ci.yml`) already runs `tsc --noEmit` — this flag **contradicts your own CI checks**.

#### PERF-06: Docker Compose Lacks Resource Limits
- **File**: [docker-compose.yml](file:///Users/bernardo/projects/sherpa/docker-compose.yml)
- **Issue**: No `mem_limit`, `cpus`, or `deploy.resources` on any service. Local development with heavy AI/vector workloads could consume all host resources.
- **Fix**: Add resource constraints:
  ```yaml
  services:
    db:
      deploy:
        resources:
          limits:
            memory: 1G
  ```

#### PERF-07: Celery Workers Use `asyncio.run()` Inside Sync Tasks
- **Files**: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py), [ingestion.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/ingestion.py)
- **Issue**: Celery tasks call `asyncio.run()` to bridge sync→async. If any nested code attempts to use a running event loop, this will crash with `RuntimeError: This event loop is already running`.
- **Fix**: Use `asgiref.sync.async_to_sync` or configure Celery with an async-compatible pool (e.g., `celery[gevent]`).

---

## 3. 🏗️ Architecture & Code Organization

### HIGH

#### ARCH-01: God Files — 5 Backend Files Exceed 600 Lines
| File | Lines | Concern |
|---|---|---|
| [trade.py (api)](file:///Users/bernardo/projects/sherpa/backend/app/api/trade.py) | 1,271 | All trade endpoints in one router |
| [prospect_qualifier.py](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py) | 1,010 | LangGraph state, tools, LLM logic, DB all mixed |
| [ai_service.py](file:///Users/bernardo/projects/sherpa/backend/app/core/ai_service.py) | 792 | All AI functions in a single service |
| [trade.py (models)](file:///Users/bernardo/projects/sherpa/backend/app/models/trade.py) | 697 | 15+ model classes spanning multiple domains |
| [telegram.py](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py) | 731 | Webhook + bot commands + message handling |

- **Impact**: These files are the #1 maintainability risk. New developers face 1,000+ line files with mixed concerns. AI agents saturate context windows reading them.
- **Fix (Phased)**:
  1. Split `api/trade.py` → `api/trade/stores.py`, `api/trade/orders.py`, `api/trade/actions.py`
  2. Split `models/trade.py` → `models/store.py`, `models/order.py`, `models/product.py`
  3. Extract LangGraph tools from `prospect_qualifier.py` into `services/qualifier_tools.py`

#### ARCH-02: God Files — 6 Frontend Files Exceed 500 Lines
| File | Lines | Concern |
|---|---|---|
| [trade/actions/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/actions/page.tsx) | 1,364 | Entire actions management page |
| [AccountDrawer.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/v2/AccountDrawer.tsx) | 1,226 | Account drawer component |
| [admin/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/(admin)/admin/page.tsx) | 1,088 | Admin panel page |
| [ClientDrawer.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/v2/ClientDrawer.tsx) | 837 | Client drawer component |
| [stores/[id]/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/stores/%5Bid%5D/page.tsx) | 764 | Store detail page |
| [DashboardHome.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/DashboardHome.tsx) | 660 | Dashboard home |

- **Fix**: Extract reusable sub-components (e.g., `StatCard`, `AgendaCard`, form sections), use custom hooks for data fetching, adopt `react-hook-form` for form management.

#### ARCH-03: 34+ One-Off Scripts at Backend Root
- **Files**: `diagnose_*.py`, `migrate_*.py`, `repair_*.py`, `seed_*.py`, `fix_*.py`, `surgical_rebuild.py`, etc.
- **Issue**: The `backend/` root is cluttered with operational scripts that have no clear organization, versioning, or documentation.
- **Fix**: Create `backend/scripts/` with subdirectories:
  ```
  scripts/
  ├── diagnostics/   # diagnose_*.py
  ├── migrations/    # migrate_*.py (one-off data migrations)
  ├── repairs/       # repair_*.py, fix_*.py
  └── seeders/       # seed_*.py
  ```

#### ARCH-04: No Centralized Frontend API Client
- **Files**: All page components under [frontend/app/](file:///Users/bernardo/projects/sherpa/frontend/app)
- **Issue**: Client components manually construct `fetch()` calls with inline `Authorization` headers, JSON parsing, and `res.ok` checks. This leads to:
  - ~65+ instances of `: any` type annotations across the frontend
  - Inconsistent error handling (some show toast, some silently fail)
  - No centralized token refresh or retry logic
- **Fix**: Create `lib/apiClient.ts` with a typed `fetcher` function:
  ```typescript
  export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options?.headers },
    });
    if (!res.ok) throw new ApiError(res.status, await res.json());
    return res.json();
  }
  ```

### MEDIUM

#### ARCH-05: v1 Modal / v2 Drawer Component Duplication
- **Files**: [components/ClientModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/ClientModal.tsx) (550L) vs [components/v2/ClientDrawer.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/v2/ClientDrawer.tsx) (837L)
- **Issue**: The migration from modals to drawers has left duplicate logic across both patterns. Both exist simultaneously in the codebase.
- **Fix**: Complete the v2 migration, then delete v1 components. Extract shared form logic into custom hooks.

#### ARCH-06: Missing `conftest.py` — No Shared Test Fixtures
- **File**: [backend/app/tests/](file:///Users/bernardo/projects/sherpa/backend/app/tests)
- **Issue**: 21 test files exist but there is no `conftest.py` for shared fixtures (database sessions, test users, mock services). Each test likely reinitializes its own context.
- **Fix**: Create `tests/conftest.py` with shared async DB session, mock user, and mock business fixtures.

#### ARCH-07: Business Logic in API Routes
- **Files**: [business.py](file:///Users/bernardo/projects/sherpa/backend/app/api/business.py) (650L), [trade.py](file:///Users/bernardo/projects/sherpa/backend/app/api/trade.py) (1271L)
- **Issue**: API route handlers contain complex business logic (stats calculations, JSON filtering, multi-step database operations) rather than delegating to the service layer.
- **Fix**: Move business logic to dedicated service functions; routes should only handle request parsing, calling services, and returning responses.

#### ARCH-08: Circular Import Workarounds
- **File**: [auth.py](file:///Users/bernardo/projects/sherpa/backend/app/api/auth.py)
- **Issue**: Uses local imports inside functions (e.g., `from app.api.business import DEFAULT_FEATURES_CONFIG` inside `require_feature()`) to avoid circular imports. This signals tight coupling between the auth and business modules.
- **Fix**: Extract shared constants and configuration to a neutral module (e.g., `core/constants.py`).

---

## 4. 🧹 Code Quality

### HIGH

#### CQ-01: 12 Bare `except:` Blocks Swallow All Errors
- **Files & Lines**:
  - [telegram.py:400, 727](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py#L400)
  - [ai_service.py:492, 494, 508, 556, 724](file:///Users/bernardo/projects/sherpa/backend/app/core/ai_service.py#L492)
  - [calendar_tools.py:82, 97, 119, 191, 201](file:///Users/bernardo/projects/sherpa/backend/app/services/calendar_tools.py#L82)
- **Issue**: `except: pass` catches **everything** including `SystemExit`, `KeyboardInterrupt`, and memory errors. Bugs are silently swallowed, making production debugging nearly impossible.
- **Fix**: Replace every instance with specific exception types:
  ```python
  except (ValueError, KeyError) as e:
      logger.warning(f"Non-critical parse error: {e}")
  ```

#### CQ-02: 65+ `any` Type Annotations in Frontend
- **Files**: Concentrated in [trade/actions/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/actions/page.tsx), [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx), [retailers/[id]/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/retailers/%5Bid%5D/page.tsx), [notes/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/trade/notes/page.tsx)
- **Issue**: Despite having a 116KB auto-generated types file from OpenAPI, components cast to `any` extensively — negating the benefit of the Contract-First approach.
- **Fix**: Import generated types from `@/types/api.ts` and use them explicitly. Start with the most-used types: `Store`, `Client`, `Order`, `Note`.

### MEDIUM

#### CQ-03: Manual Form State Management Instead of Form Libraries
- **Files**: [ClientModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/ClientModal.tsx), [StoreModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/StoreModal.tsx), all v2 Drawer components
- **Issue**: Components use 10-15+ individual `useState` hooks for form fields. This causes:
  - Re-renders on every keystroke (no controlled/uncontrolled optimization)
  - No validation framework (manual `if` checks)
  - Bloated component code
- **Fix**: Adopt `react-hook-form` + `zod` for all forms. This is the single largest DX improvement available.

#### CQ-04: Celery Task Idempotency
- **Files**: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py), [ingestion.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/ingestion.py)
- **Issue**: Tasks process messages without deduplication checks. If Celery retries a task (e.g., worker crash), the same message may be processed twice — sending duplicate WhatsApp messages or double-charging usage limits.
- **Fix**: Add idempotency keys:
  ```python
  @celery_app.task(bind=True, max_retries=3)
  def process_message(self, message_id):
      if redis.get(f"processed:{message_id}"):
          return  # Already processed
      redis.setex(f"processed:{message_id}", 3600, "1")
      # ... process
  ```

#### CQ-05: Brittle Celery Detection via `sys.argv`
- **File**: [database.py](file:///Users/bernardo/projects/sherpa/backend/app/core/database.py)
- **Issue**: `is_celery = any("celery" in arg for arg in sys.argv)` detects Celery workers by inspecting command-line arguments. This is fragile and breaks if the invocation pattern changes.
- **Fix**: Use an environment variable: `IS_CELERY_WORKER=true` in the Procfile/docker-compose command.

#### CQ-06: Two Active TODO Comments Mark Missing Functionality
- [data_gateway.py:96](file:///Users/bernardo/projects/sherpa/backend/app/api/data_gateway.py#L96): `# TODO: Add API Key or Internal Auth` — **this is SEC-02**
- [ingestion.py:14](file:///Users/bernardo/projects/sherpa/backend/app/tasks/ingestion.py#L14): `# TODO: Send confirmation message back` — missing user feedback loop

#### CQ-07: CI/CD Contradicts Build Config
- **Files**: [ci.yml](file:///Users/bernardo/projects/sherpa/.github/workflows/ci.yml) vs [next.config.mjs](file:///Users/bernardo/projects/sherpa/frontend/next.config.mjs)
- **Issue**: CI runs `npx tsc --noEmit` and `npm run lint` (which will catch errors), but the production build config ignores those same errors. The CI gate is effectively meaningless if deploys bypass it.
- **Fix**: Remove `ignoreBuildErrors` from `next.config.mjs` and fix all type errors. CI and deploy should enforce the same standard.

#### CQ-08: No Frontend Tests
- **File**: No `__tests__/`, `*.test.tsx`, or `*.spec.tsx` files found
- **Issue**: Zero frontend test coverage. Combined with `ignoreBuildErrors: true`, this means the frontend has no automated quality gates.
- **Fix**: Start with integration tests for critical flows (login, dashboard data loading, appointment creation) using React Testing Library + Vitest.

---

## 5. ✅ Strengths to Preserve

> [!CAUTION]
> ### 🛡️ RAM Optimization Suite — DO NOT REGRESS ($10/mo → $1.50/mo)
> The following 4 techniques work **together** to achieve an 85% reduction in Railway memory costs. Any refactor that touches these files must preserve these specific patterns:
>
> | Technique | File | What It Does |
> |---|---|---|
> | **NullPool for Celery** | [database.py:11-16](file:///Users/bernardo/projects/sherpa/backend/app/core/database.py#L11-L16) | Disables connection pooling in workers — each task opens/closes its own connection, preventing idle pool RAM accumulation across 3 worker processes. |
> | **max-tasks-per-child** | [Procfile:2-4](file:///Users/bernardo/projects/sherpa/backend/Procfile#L2-L4) | Workers recycle after 50-100 tasks (`--max-tasks-per-child=50/100`), releasing any leaked memory from LLM/vector operations. |
> | **Redis `ltrim` bounding** | [memory.py:34](file:///Users/bernardo/projects/sherpa/backend/app/core/memory.py#L34) | Caps conversation history at 20 messages per session via `ltrim`, preventing unbounded Redis memory growth. |
> | **Capped DB pool** | [database.py:21-24](file:///Users/bernardo/projects/sherpa/backend/app/core/database.py#L21-L24) | API server uses `pool_size=5, max_overflow=10, pool_recycle=1800` — tight bounds that prevent connection bloat while allowing burst traffic. |
> | **Low concurrency** | [Procfile:2-4](file:///Users/bernardo/projects/sherpa/backend/Procfile#L2-L4) | Workers use `concurrency=1` (slow) / `concurrency=4` (fast) with `prefetch-multiplier=1` — minimizes per-worker memory footprint. |
>
> **Rule**: When reviewing PRs that touch `database.py`, `Procfile`, `celery_app.py`, or `memory.py` — verify these RAM constraints are intact.

| Strength | Where | Why It Matters |
|---|---|---|
| **Contract-First Types** | [types/api.ts](file:///Users/bernardo/projects/sherpa/frontend/types/api.ts) (auto-generated from OpenAPI) | Eliminates frontend/backend type drift. This is a best practice many teams never implement. |
| **Async-First Backend** | All API routes use `async/await` with `AsyncSession` | Ready for high concurrency from day one. No blocking I/O in the event loop. |
| **Celery Queue Separation** | [Procfile](file:///Users/bernardo/projects/sherpa/backend/Procfile) — `fast_queue` + `slow_queue` | ML/vector tasks can't block calendar sync or message processing. Excellent isolation. |
| **Robust Database Indexing** | [models/trade.py](file:///Users/bernardo/projects/sherpa/backend/app/models/trade.py), [models/crm.py](file:///Users/bernardo/projects/sherpa/backend/app/models/crm.py) | Compound indexes on high-query columns (phone, telegram_id_hash, business_id+start_time). |
| **Zustand Auth + Cookie Sync** | [authStore.ts](file:///Users/bernardo/projects/sherpa/frontend/store/authStore.ts) | Clever dual-sync (localStorage for client + cookie for SSR/middleware). Simple and effective. |
| **Feature-Gated RBAC** | [auth.py](file:///Users/bernardo/projects/sherpa/backend/app/api/auth.py) — `require_feature()` | Clean dependency-injection pattern for feature access control on routes. |
| **WhatsApp Quota Tracking** | [limiter.py](file:///Users/bernardo/projects/sherpa/backend/app/core/limiter.py) | Redis-backed monthly usage with 80%/100% alerts. Production-grade billing infrastructure. |
| **pgvector with Hybrid Search** | [graphrag.py](file:///Users/bernardo/projects/sherpa/backend/app/services/graphrag.py) | RRF-based fusion of semantic + keyword search. Sophisticated RAG architecture. |

---

## 6. 📋 Prioritized Action Plan

### 🔴 Immediate (Before Next Deploy)
1. **SEC-01**: Remove default `SECRET_KEY` — 5 min fix, critical impact
2. **SEC-02**: Add auth to `/sync` endpoint — 10 min fix
3. **SEC-03**: Replace CORS regex with explicit origins — 10 min fix
4. **PERF-04**: Pin all Python dependencies — Run `pip freeze > requirements.lock`

### 🟠 This Sprint (High-Impact, Low-Effort)
5. **CQ-01**: Replace all 12 bare `except:` blocks — 1-2 hours
6. **PERF-01**: Add `asyncio.gather()` to GraphRAG — 30 min, ~50% latency win
7. **PERF-02**: Add timeouts to all LLM calls — 1 hour
8. **PERF-05**: Remove `ignoreBuildErrors` from Next.js config — then fix type errors iteratively
9. **SEC-04**: Move cookie to server-side `Set-Cookie` with `HttpOnly; Secure` — 2-3 hours

### 🟡 Next Sprint (Structural Improvements)
10. **ARCH-01**: Split `api/trade.py` into sub-routers — 4-6 hours
11. **ARCH-04**: Create centralized `apiClient.ts` — 4-6 hours
12. **CQ-03**: Adopt `react-hook-form` + `zod` — 1 day (start with v2 Drawers)
13. **ARCH-03**: Organize backend scripts into `scripts/` — 2 hours
14. **ARCH-06**: Create `conftest.py` with shared fixtures — 3-4 hours

### 🟢 Backlog (Ongoing Tech Debt Reduction)
15. **ARCH-02**: Break down frontend God files — ongoing, per-sprint budget
16. **CQ-02**: Eliminate `any` types — tackle per page as each is touched
17. **ARCH-05**: Complete v1→v2 component migration — remove old modals
18. **CQ-08**: Add frontend test infrastructure — set up Vitest + RTL
19. **PERF-03**: Async context summarization — move to post-response Redis cache

---

> [!IMPORTANT]
> **SEC-01 (default SECRET_KEY) and SEC-02 (unauthenticated `/sync` endpoint) should be fixed before any production deployment.** These are trivially exploitable if exposed.

> [!TIP]
> The biggest single improvement for developer velocity is **ARCH-04 (centralized API client)**. It would eliminate the root cause of both the `any` type pollution (CQ-02) and the inconsistent error handling across ~50+ `fetch()` calls in the frontend.
