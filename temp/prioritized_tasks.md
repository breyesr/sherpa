# Prioritized Task Execution Checklist

> Last verified: 2026-07-27 via raw grep against codebase.

## 🔴 Phase 1: Critical Security (Before Next Deploy — ~30 min) ✅ COMPLETE
- [x] 200.1 — Remove default `SECRET_KEY` from `config.py` *(5 min)* — Validator crashes on prod/staging if unset
- [x] 200.2 — Add auth to `POST /sync` in `data_gateway.py` *(10 min)* — `Depends(get_current_user)` present
- [x] 200.3 — Replace wildcard CORS regex in `main.py` with explicit origins *(10 min)* — Explicit origins only

## 🔴 Phase 2: Token Optimization (Immediately After — ~5 hrs) ⚠️ 5/6 DONE
- [x] 204.3 — Optimize `.geminiignore` exclusions *(15 min)*
- [x] 204.5 — Compress completed backlog tasks to one-liners *(15 min)* — BACKLOG.md at 161 lines
- [x] 204.1 — Consolidate rule files (`GEMINI.md` as single source) *(30 min)*
- [x] 204.2 — Create `docs/ARCHITECTURE.md` project map *(1 hour)* — 42 lines
- [x] 204.6 — Generate `docs/IMPORT_MAP.md` via script *(1 hour)* — 507 lines
- [x] 204.4 — Add module-level docstrings to files >200 lines *(2 hours)* — Added to all 7 flagged files

## 🟠 Phase 3: Remaining Security (This Sprint — ~4 hrs) ⚠️ 2/4 DONE
- [x] 200.5 — Protect Telegram `/debug/info` endpoint *(15 min)* — Has `Depends(get_current_user)`
- [x] 200.6 — Whitelist file upload extensions *(15 min)* — Validates against `.csv, .xlsx, .xls, .json`
- [x] 200.7 — Replace `print()` with `logging` across backend *(1 hour)* — 22 in whatsapp.py, 24 in telegram.py replaced with logger calls
- [x] 200.4 — Move auth cookie to server-side `Set-Cookie` with `HttpOnly; Secure` *(2-3 hours)* — Implemented server-side set/clear cookie on auth endpoints and updated frontend store / login page.

## 🟠 Phase 4: Performance & Reliability (This Sprint — ~7 hrs) ✅ COMPLETE
- [x] 201.1 — `asyncio.gather()` for GraphRAG hybrid search *(30 min)*
- [x] 201.3 — Pin Python dependencies via `requirements.lock` *(15 min)*
- [x] 201.5 — Fix all 12 bare `except:` blocks *(1-2 hours)*
- [x] 201.2 — Add `timeout=30` to all LLM calls *(1 hour)*
- [x] 201.6 — Add Redis-backed idempotency to Celery tasks *(2 hours)*
- [x] 201.4 — Remove `ignoreBuildErrors` from Next.js config + fix type errors *(2-4 hours)*
- [x] 201.7 — Async context summarization with Redis cache *(2-3 hours)*
- [x] 201.8 — Strict catalog validation before appointment scheduling in B2C calendar tools *(1-2 hours)*

## 🟡 Phase 5: Backend Architecture (Next Sprint)
- [x] 202.5 — Extract shared constants to `core/constants.py` *(1 hour)* — Created constants.py and centralized DEFAULT_FEATURES_CONFIG, DEFAULT_STORE_ACTION_OBJECTIVES, ALLOWED_FILE_EXTENSIONS, DEFAULT_WHATSAPP_LIMIT, and UPLOAD_DIR
- [x] 202.3 — Organize 34+ backend scripts into `scripts/` subdirs *(2 hours)* — Moved 34+ python root scripts into data_ops, diagnostics, dev_tools, and manual_tests subdirectories
- [x] 202.4 — Create `conftest.py` with shared test fixtures *(3-4 hours)* — Implemented core shared fixtures in conftest.py (mock_db, mock_business, mock_client, mock_integration, mock_config_service, anyio_backend) and refactored test_provisioner.py
- [x] 202.1 — Split `api/trade.py` into sub-routers *(4-6 hours)* — Split monolithic trade.py into sub-routers under api/trade/
- [x] 202.2 — Split `models/trade.py` into domain modules *(3-4 hours)* — Split monolithic trade.py model into domain modules under models/trade/

## 🟡 Phase 6: Frontend Architecture (Next Sprint)
- [ ] 203.1 — Create centralized `apiClient.ts` *(4-6 hours)*
- [ ] 203.3 — Complete v1→v2 Modal-to-Drawer migration *(3-4 hours)* — ClientModal.tsx & StoreModal.tsx still exist
- [ ] 203.4 — Eliminate top-50 `: any` type annotations *(3-4 hours)* — 120 instances remain
- [ ] 203.2 — Adopt `react-hook-form` + `zod` for Drawer forms *(1 day)*
- [ ] 203.5 — Set up Vitest + React Testing Library *(4-6 hours)*
