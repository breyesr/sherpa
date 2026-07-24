# Prioritized Task Execution Checklist

## 🔴 Phase 1: Critical Security (Before Next Deploy — ~30 min)
- [x] 200.1 — Remove default `SECRET_KEY` from `config.py` *(5 min)*
- [x] 200.2 — Add auth to `POST /sync` in `data_gateway.py` *(10 min)*
- [x] 200.3 — Replace wildcard CORS regex in `main.py` with explicit origins *(10 min)*

## 🔴 Phase 2: Token Optimization (Immediately After — ~5 hrs)
- [x] 204.3 — Optimize `.geminiignore` exclusions *(15 min)*
- [x] 204.5 — Compress completed backlog tasks to one-liners *(15 min)*
- [x] 204.1 — Consolidate rule files (`.agents/AGENTS.md` single source) *(30 min)*
- [x] 204.2 — Create `docs/ARCHITECTURE.md` project map *(1 hour)*
- [x] 204.6 — Generate `docs/IMPORT_MAP.md` via script *(1 hour)*
- [x] 204.4 — Add module-level docstrings to files >200 lines *(2 hours)*

## 🟠 Phase 3: Remaining Security (This Sprint — ~4 hrs)
- [x] 200.7 — Replace `print()` with `logging` across backend *(1 hour)*
- [x] 200.5 — Protect Telegram `/debug/info` endpoint *(15 min)*
- [x] 200.6 — Whitelist file upload extensions *(15 min)*
- [x] 200.4 — Move auth cookie to server-side `Set-Cookie` with `HttpOnly; Secure` *(2-3 hours)*

## 🟠 Phase 4: Performance & Reliability (This Sprint — ~7 hrs)
- [x] 201.1 — `asyncio.gather()` for GraphRAG hybrid search *(30 min)*
- [x] 201.2 — Add `timeout=30` to all LLM calls *(1 hour)*
- [ ] 201.3 — Pin Python dependencies via `requirements.lock` *(15 min)*
- [x] 201.5 — Fix all 12 bare `except:` blocks *(1-2 hours)*
- [ ] 201.6 — Add Redis-backed idempotency to Celery tasks *(2 hours)*
- [ ] 201.4 — Remove `ignoreBuildErrors` from Next.js config + fix type errors *(2-4 hours)*
- [ ] 201.7 — Async context summarization with Redis cache *(2-3 hours)*
- [x] 201.8 — Strict catalog validation before appointment scheduling in B2C calendar tools *(1-2 hours)*

## 🟡 Phase 5: Backend Architecture (Next Sprint)
- [x] 202.5 — Extract shared constants to `core/constants.py` *(1 hour)*
- [x] 202.3 — Organize 34+ backend scripts into `scripts/` subdirs *(2 hours)*
- [x] 202.4 — Create `conftest.py` with shared test fixtures *(3-4 hours)*
- [x] 202.1 — Split `api/trade.py` into sub-routers *(4-6 hours)*
- [x] 202.2 — Split `models/trade.py` into domain modules *(3-4 hours)*

## 🟡 Phase 6: Frontend Architecture (Next Sprint)
- [ ] 203.1 — Create centralized `apiClient.ts` *(4-6 hours)*
- [ ] 203.3 — Complete v1→v2 Modal-to-Drawer migration *(3-4 hours)*
- [ ] 203.4 — Eliminate top-50 `: any` type annotations *(3-4 hours)*
- [ ] 203.2 — Adopt `react-hook-form` + `zod` for Drawer forms *(1 day)*
- [ ] 203.5 — Set up Vitest + React Testing Library *(4-6 hours)*
