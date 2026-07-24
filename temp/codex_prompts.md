# Epic 201 — Remaining Tasks: AI-Ready Prompts

> Use these prompts with OpenAI Codex, Cursor, Claude, or any AI coding assistant.
> Each prompt is **self-contained** — paste it as-is and the AI should be able to complete the task.

> [!IMPORTANT]
> **201.3 (Pin Python dependencies)** is already done — `backend/requirements.lock` exists with 160 pinned deps.

---

## ⬜ Task 201.6 — Redis-Backed Idempotency for Celery Tasks (~2 hours)

### Prompt

```
PROJECT: Python/FastAPI backend at backend/
REDIS: Already configured via `redis.asyncio` in backend/app/core/memory.py
CELERY: Configured in backend/app/core/celery_app.py

TASK: Add Redis-backed idempotency to Celery tasks to prevent duplicate processing.

REQUIREMENTS:
1. Create a new file `backend/app/core/idempotency.py` with a decorator called `@idempotent_task` that:
   - Before task execution, checks Redis for key `idempotent:{task_name}:{arg_hash}` 
   - If key exists, skip execution and log "Task already processed"
   - If key doesn't exist, SET the key with a configurable TTL (default 3600s), then execute the task
   - The arg_hash should be a SHA-256 of the task arguments serialized to JSON
   - Use synchronous `redis.Redis` (not async) since Celery tasks run synchronously
   - Get Redis URL from: `from app.core.config import settings` → `settings.REDIS_URL`

2. Apply the decorator to these 14 Celery tasks (only the ones where idempotency makes sense):
   
   APPLY @idempotent_task TO (these process external messages and could be retried/duplicated):
   - backend/app/tasks/ingestion.py → process_b2b_ingestion(self, business_id, user_message)
   - backend/app/tasks/ingestion.py → process_whatsapp_prospect_message(self, business_id, payload)
   - backend/app/tasks/messages.py → process_sales_rep_message(self, business_id, client_id, payload)
   - backend/app/tasks/messages.py → process_distributor_message(self, business_id, client_id, payload)
   - backend/app/tasks/messages.py → process_prospect_message(self, business_id, client_id, payload)
   - backend/app/tasks/messages.py → process_customer_message(self, business_id, client_id, payload)
   - backend/app/tasks/data_gateway.py → process_data_import(import_id)
   
   DO NOT APPLY to (these are periodic/scheduled or already idempotent by nature):
   - sync_all_calendars, sync_single_calendar (periodic syncs)
   - sync_vector_task, delete_vector_task (already has autoretry, idempotent ops)
   - update_account_intelligence_task (already has autoretry)
   - send_upcoming_reminders, send_single_reminder (periodic tasks)

3. The decorator should be placed AFTER @celery_app.task but BEFORE the function def.
   Example:
   ```python
   @celery_app.task(bind=True, name="process_sales_rep_message", max_retries=3, default_retry_delay=5)
   @idempotent_task(ttl=1800)
   def process_sales_rep_message(self, business_id: str, client_id: str, payload: dict):
   ```

CONSTRAINTS (from AGENTS.md):
- Use Python's `logging` module, never `print()`
- No bare `except:` blocks — always specify exception type
- No single .py file should exceed 600 lines
- Preserve existing RAM guardrails: NullPool for Celery workers, max-tasks-per-child, low concurrency
```

---

## ⬜ Task 201.7 — Async Context Summarization with Redis Cache (~2-3 hours)

### Prompt

```
PROJECT: Python/FastAPI backend at backend/
FILE TO MODIFY: backend/app/core/context_assembler.py (99 lines)
RELATED FILE: backend/app/core/memory.py (ChatMemory class using redis.asyncio)

CURRENT STATE OF context_assembler.py:
- ContextAssembler.get_optimized_context() is already async
- _generate_summary() makes a BLOCKING LLM call via litellm.acompletion (which IS async)
- BUT: summarization happens IN the request path — the user waits for the summary LLM call to complete before getting their response
- _generate_summary() uses print() for error logging (violates project rules)

TASK: Make context summarization non-blocking so users don't wait for it.

REQUIREMENTS:

1. FIRE-AND-FORGET SUMMARIZATION:
   - In get_optimized_context(), when history >= 12 messages and summarization is needed:
     - Instead of `await`ing _generate_summary(), fire it as a background task using `asyncio.create_task()`
     - Return the OLD summary immediately (or None if first time) so the user isn't blocked
     - The background task should update Redis with the new summary when it completes
   - This means the summary will be 1 turn behind, which is acceptable

2. ADD REDIS CACHE FOR SUMMARIES with smart invalidation:
   - Before calling LLM for summarization, check if a cached summary already covers the current history
   - Cache key: `summary_hash:{chat_id}` storing a hash of the messages that were summarized
   - Only regenerate summary if new messages have been added since last summarization
   - This prevents redundant LLM calls if the same context is requested multiple times

3. FIX THE print() STATEMENT on line 67:
   - Replace `print(f"ERROR in context_assembler._generate_summary: {e}")` 
   - With `logger.error(f"Context summarization failed: {e}")` using Python's logging module
   - Add `import logging` and `logger = logging.getLogger(__name__)` at the top of the file

4. ADD timeout=30 TO THE litellm.acompletion CALL (line 59-64):
   - Add `timeout=30` parameter to the litellm.acompletion() call in _generate_summary()

HERE IS THE CURRENT FILE CONTENT FOR REFERENCE:
```python
import json
import litellm
from typing import List, Dict, Any, Optional
from app.core.memory import ChatMemory
from app.core.system_config import ConfigService

class ContextAssembler:
    def __init__(self, db: Any):
        self.db = db
        self.memory = ChatMemory()

    async def get_optimized_context(self, chat_id: str, history: List[Dict[str, str]], user_message: str) -> Dict[str, Any]:
        summary = await self.memory.get_summary(chat_id)
        
        if len(history) >= 12:
            to_summarize = history[:8]
            remaining_history = history[8:]
            
            # THIS IS THE BLOCKING CALL TO MAKE NON-BLOCKING:
            new_summary = await self._generate_summary(to_summarize, summary)
            await self.memory.set_summary(chat_id, new_summary)
            
            return {
                "history": remaining_history,
                "summary": new_summary,
                "intent": await self._detect_intent(user_message)
            }
            
        return {
            "history": history,
            "summary": summary,
            "intent": await self._detect_intent(user_message)
        }

    async def _generate_summary(self, messages, previous_summary):
        provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
        api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")
        
        model_name = "gpt-4o-mini"
        if provider == "gemini": model_name = "gemini-1.5-flash"
        elif provider == "anthropic": model_name = "claude-3-haiku-20240307"
        
        history_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        prompt = f"Summarize the following conversation concisely. "
        if previous_summary:
            prompt += f"Incorporate this existing summary: {previous_summary}\n\n"
        prompt += f"New turns:\n{history_text}\n\nFocus on key facts, user preferences, and pending tasks."

        try:
            response = await litellm.acompletion(
                model=f"{provider}/{model_name}" if "/" not in model_name else model_name,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key,
                max_tokens=200
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR in context_assembler._generate_summary: {e}")  # FIX THIS
            return previous_summary or "Conversation in progress."

    async def _detect_intent(self, message: str) -> str:
        m = message.lower().strip()
        if m in ["hi", "hello", "hola", "hey", "buenos dias", "buenas tardes"]:
            return "greeting"
        if m in ["thanks", "thank you", "gracias", "ok", "vale", "perfecto"]:
            return "acknowledgment"
        return "complex"

    def prune_services(self, services, user_message):
        if len(services) <= 3:
            return services
        keywords = user_message.lower().split()
        relevant = []
        for s in services:
            if any(k in s.name.lower() or k in (s.description or "").lower() for k in keywords):
                relevant.append(s)
        return relevant if relevant else services[:3]
```

CONSTRAINTS (from AGENTS.md):
- Use Python's `logging` module, never `print()`
- No bare `except:` blocks — always specify exception type
- No single .py file should exceed 600 lines
- Redis conversation history must stay capped at 20 messages via ltrim (RAM guardrail — DO NOT CHANGE memory.py's ltrim)
- Preserve all existing comments and docstrings unrelated to your changes
```

---

## Post-Completion: Commit & Push

After completing each task, run:

```bash
cd /Users/bernardo/projects/sherpa
git add -A
git commit -m "feat(201.X): <description>"
git push origin staging
```

---

## Epic 201 Status Summary

| Task | Description | Status |
|------|-------------|--------|
| 201.1 | asyncio.gather() for GraphRAG | ✅ Done |
| 201.2 | timeout=30 on LLM calls | ✅ Done |
| 201.3 | Pin Python dependencies | ✅ Done (requirements.lock exists) |
| 201.4 | Remove ignoreBuildErrors + fix types | ✅ Done |
| 201.5 | Fix bare except blocks | ✅ Done |
| 201.6 | Redis-backed Celery idempotency | ⬜ Use prompt above |
| 201.7 | Async context summarization | ⬜ Use prompt above |
| 201.8 | Catalog validation for B2C calendar | ✅ Done |
