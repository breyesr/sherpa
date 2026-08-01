# Epic 201: Performance & Reliability — Codebase Audit

**Audit Date**: July 31, 2026  
**Method**: Direct codebase verification (grep, file reads, config checks). Backlog status **not trusted**.

---

## Summary

| Task | Backlog Says | Codebase Reality | Verdict |
|:-----|:-------------|:-----------------|:--------|
| 201.1 | ✅ Done | ✅ Done | **Correct** |
| 201.2 | ✅ Done | ✅ Done | **Correct** |
| 201.3 | ❌ Pending | ⚠️ Partially Done | **Backlog outdated** |
| 201.4 | ❌ Pending | ✅ Done | **Backlog outdated** |
| 201.5 | ✅ Done | ✅ Done | **Correct** |
| 201.6 | ❌ Pending | ✅ Done | **Backlog outdated** |
| 201.7 | ❌ Pending | ✅ Done | **Backlog outdated** |
| 201.8 | ✅ Done | ✅ Done | **Correct** |

> [!IMPORTANT]
> **7 of 8 tasks are fully complete in the codebase.** Task 201.3 is the only one with a gap — the lock file exists but isn't wired into the deployment pipeline.

---

## Task-by-Task Evidence

### ✅ Task 201.1: Parallelize GraphRAG Hybrid Search
**Backlog**: Done · **Codebase**: Done

Found in [graphrag.py:383-384](file:///Users/bernardo/projects/sherpa/backend/app/services/graphrag.py#L383-L384):
```python
# Execute parallelized search via asyncio.gather (Task 201.1)
semantic_res, keyword_res = await asyncio.gather(...)
```

---

### ✅ Task 201.2: Add LLM Timeouts
**Backlog**: Done · **Codebase**: Done

`timeout=30.0` and `timeout=45.0` confirmed in both:
- [ai_service.py](file:///Users/bernardo/projects/sherpa/backend/app/core/ai_service.py#L113) — Lines 113, 138, 398
- [graphrag.py](file:///Users/bernardo/projects/sherpa/backend/app/services/graphrag.py#L295) — Lines 295, 313, 459, 629

---

### ⚠️ Task 201.3: Pin Python Dependencies
**Backlog**: Pending · **Codebase**: Partially Done

- `backend/requirements.lock` **exists** (159 pinned lines vs. 38 in `requirements.txt`).
- **However**, `requirements.lock` is **not referenced** by any deploy config (`Procfile`, `railway.json`, `Dockerfile`, `nixpacks.toml`, or any shell script). Nixpacks auto-detects `requirements.txt`, so the lock file is effectively **unused in production**.

> [!WARNING]
> The lock file was generated but never wired into the deploy. Production still installs from the unpinned `requirements.txt`. To close this task, either:
> - Rename `requirements.lock` → `requirements.txt` (replacing the original), or
> - Add a `nixpacks.toml` with `[phases.install] cmds = ["pip install -r requirements.lock"]`

---

### ✅ Task 201.4: Enable TypeScript Build Checks
**Backlog**: Pending · **Codebase**: **Done**

In [next.config.mjs](file:///Users/bernardo/projects/sherpa/frontend/next.config.mjs):
```js
eslint: {
  ignoreDuringBuilds: false,   // ← enforced
},
typescript: {
  ignoreBuildErrors: false,     // ← enforced
},
```
Both flags are set to `false`, meaning TypeScript and ESLint errors **will** fail production builds. Task is complete.

---

### ✅ Task 201.5: Fix Bare Except Blocks
**Backlog**: Done · **Codebase**: Done

Grep for `except:` across all `backend/app/**/*.py` returns **0 results**. All bare except blocks have been eliminated.

---

### ✅ Task 201.6: Celery Task Idempotency
**Backlog**: Pending · **Codebase**: **Done**

A full Redis-backed idempotency framework exists:
- [idempotency.py](file:///Users/bernardo/projects/sherpa/backend/app/core/idempotency.py) — 69-line module with SHA-256 payload hashing, Redis `SET NX` locking, and configurable TTLs.
- Applied via `@idempotent_task(ttl=...)` decorator to:
  - [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py) — 4 tasks (lines 161, 170, 179, 228)
  - [ingestion.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/ingestion.py) — 2 tasks (lines 20, 94)
  - [data_gateway.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/data_gateway.py) — 1 task (line 13)

---

### ✅ Task 201.7: Async Context Summarization
**Backlog**: Pending · **Codebase**: **Done**

The [context_assembler.py](file:///Users/bernardo/projects/sherpa/backend/app/core/context_assembler.py#L31-L32) fires summarization as a non-blocking background task:
```python
asyncio.create_task(self._async_update_summary(chat_id, to_summarize, summary))
```
Includes a SHA-256 hash cache to skip redundant re-summarizations. Result is cached in Redis via `memory.set_summary()`. The user response is **not blocked** by the LLM call.

---

### ✅ Task 201.8: Catalog Service Validation in B2C Scheduling Tool
**Backlog**: Done · **Codebase**: Done

In [calendar_tools.py:155-161](file:///Users/bernardo/projects/sherpa/backend/app/services/calendar_tools.py#L155-L161):
```python
if service_id:
    res_svc = await self.db.execute(select(Service).where(
        Service.id == service_id, Service.business_id == self.business.id))
    svc = res_svc.scalars().first()
    if not svc:
        return {"error": f"The requested service_id '{service_id}' is not in the active business service catalog..."}
```

---

## Recommended Backlog Update

```diff
 ## Epic 201: Performance & Reliability (🟠 THIS SPRINT)
-- [ ] Task 201.3: **Pin Python Dependencies**
-+ [~] Task 201.3: **Pin Python Dependencies** — Lock file generated but NOT wired to deploy pipeline. Needs nixpacks config or file rename.
-- [ ] Task 201.4: **Enable TypeScript Build Checks**
-+ [x] Task 201.4: **Enable TypeScript Build Checks** — Both `ignoreBuildErrors` and `ignoreDuringBuilds` set to `false`.
-- [ ] Task 201.6: **Celery Task Idempotency**
-+ [x] Task 201.6: **Celery Task Idempotency** — Redis-backed `@idempotent_task` decorator applied across messages, ingestion, and data_gateway tasks.
-- [ ] Task 201.7: **Async Context Summarization**
-+ [x] Task 201.7: **Async Context Summarization** — `asyncio.create_task()` fires background LLM summary with Redis hash-based dedup.
```

> [!TIP]
> If Task 201.3's lock file is wired into the deploy, Epic 201 is **100% complete** and can be archived.
