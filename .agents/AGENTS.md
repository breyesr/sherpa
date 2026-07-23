# Project Rules

## Merging & Branching
- **Staging Merge Protocol**: ALWAYS ask for explicit user permission and confirmation before initiating any merge operations into the `staging` branch. This is a non-negotiable safety guardrail.

## UI & Terminology Standards
- **Simplified Naming Conventions**: Avoid abstract or technical jargon (like "Blueprint") when designing tasks and playbooks for B2B Trade CRM flows. Prioritize obvious terms understood by trade business reps (e.g., **Action Template**, **Task Objective**, **Select Action**).
- **Dynamic Objective Mappings**: When working with the standard set of 8 store action objectives, ensure the following simplified labels are used consistently on the UI:
  * `THREAT_RESPONSE` -> `Competitive Response`
  * `SHARE_OF_SHELF` -> `Shelf Presence Check`
  * `NEW_PRODUCT_INTRODUCTION` -> `Launch New Product`
  * `INVENTORY_VELOCITY_OOS_PREVENTION` -> `Prevent Stockouts`
  * `PERFECT_STORE_ASSORTMENT_COMPLIANCE` -> `Store Standards Check`
  * `SEASONAL_EVENT_ACTIVATION` -> `Seasonal Promotion`
  * `TRADE_LOYALTY_VOLUME_PUSHING` -> `Drive Larger Orders`
  * `POSM_MAINTENANCE_ASSET_PURITY` -> `Maintain Promo Materials`
- **Client-Side Label Prioritization**: In frontend mapping arrays (e.g., `objectiveMap`), always spread the client-side friendly default map *last* (e.g., `...defaultObjectiveMap`). This ensures that client-side user-friendly labels override stale database values or raw system keys, preventing raw keys from leaking into the UI.

## RAM Optimization Guardrails (DO NOT REGRESS)
These 5 techniques together reduced Railway billing from **$10/mo → $1.50/mo** (85% reduction). Any PR touching these files MUST preserve these specific patterns:
- **NullPool for Celery**: `backend/app/core/database.py` — Celery workers must use `poolclass=NullPool`. Prevents idle connection pool RAM accumulation.
- **Capped DB Pool**: `backend/app/core/database.py` — API server must use `pool_size=5, max_overflow=10, pool_recycle=1800`. Prevents connection bloat.
- **max-tasks-per-child**: `backend/Procfile` — Workers must set `--max-tasks-per-child=50` (slow) / `100` (fast). Recycles leaked memory.
- **Low Concurrency**: `backend/Procfile` — Workers must use `--concurrency=1` (default/slow) / `--concurrency=4` (fast) with `--prefetch-multiplier=1`.
- **Redis ltrim Bounding**: `backend/app/core/memory.py` — Conversation history must be capped at 20 messages via `ltrim`.

## Security Non-Negotiables
- **No default SECRET_KEY**: `config.py` must NOT have a fallback value for `SECRET_KEY`. It must crash at startup if the env var is unset.
- **No unauthenticated endpoints**: Every data-mutating route must use `Depends(get_current_user)` or API key auth. No exceptions.
- **No wildcard CORS**: Do not use regex patterns like `.*\.up\.railway\.app`. Use explicit origin lists only.
- **No bare except blocks**: Always specify the exception type. `except: pass` is banned across the entire codebase.

## Code Quality Standards
- **Backend file size limit**: No single `.py` file should exceed 600 lines. Split into sub-modules when approaching this limit.
- **Frontend file size limit**: No single `.tsx` file should exceed 800 lines. Extract sub-components and custom hooks.
- **Frontend API calls**: Use the centralized API client (`lib/apiClient.ts`) for all fetch calls once it exists. Do not construct raw `fetch()` with inline Authorization headers.
- **Frontend types**: Do not use `: any` type annotations. Import types from `@/types/api.ts` or define local interfaces.
- **Logging**: Use Python's `logging` module, never `print()`, for any operational or debug output in backend code.
