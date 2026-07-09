# 🚨 CRITICAL: Cross-Tenant Data Leak Diagnosis

**Severity**: P0 — Production data isolation failure  
**Symptom**: Telegram bot for `reyesrbernardo@gmail.com` returns products belonging to `agrivera@gmail.com`  
**Date**: 2026-07-09

---

## Root Cause Analysis

I found **3 bugs**, two of which are confirmed root causes and one is a latent risk:

### 🔴 BUG 1: Webhook handler queries ALL Telegram integrations without business_id filter (CRITICAL)

[telegram.py:62-66](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py#L62-L66)

```python
# CURRENT CODE — NO business_id filter!
result = await db.execute(
    select(Integration).where(Integration.provider == 'telegram')
)
all_tg = result.scalars().all()
integration = next((i for i in all_tg if i.settings.get("webhook_id") == webhook_id), None)
```

**Problem**: This fetches **every** Telegram integration from **every** account, then does a Python-level filter by `webhook_id`. While the `webhook_id` lookup itself is unique, the real danger is:

1. **Performance**: Loads all tenants' integrations into memory on every webhook call.
2. **Fragile uniqueness**: If `webhook_id` generation ever collides, you'd silently resolve the wrong business.

> [!NOTE]
> This query alone wouldn't cause the product cross-contamination directly, since `webhook_id` matching still resolves the correct integration. But it's a dangerous anti-pattern that should be fixed.

**Fix**: Add `webhook_id` as a direct database filter column or filter by it in SQL.

```diff
-result = await db.execute(
-    select(Integration).where(Integration.provider == 'telegram')
-)
-all_tg = result.scalars().all()
-integration = next((i for i in all_tg if i.settings.get("webhook_id") == webhook_id), None)
+# Use PostgreSQL JSONB operator for direct webhook_id lookup
+from sqlalchemy import cast
+from sqlalchemy.dialects.postgresql import JSONB
+result = await db.execute(
+    select(Integration).where(
+        Integration.provider == 'telegram',
+        Integration.settings['webhook_id'].astext == webhook_id
+    )
+)
+integration = result.scalars().first()
```

---

### 🔴 BUG 2: LangGraph `thread_id` is NOT scoped to business (ROOT CAUSE — CONFIRMED)

[prospect_qualifier.py:804](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L804)

```python
thread_id = f"prospect_{sender_phone}"
```

**This is the confirmed root cause of the data leak.**

The LangGraph checkpointer stores conversation state in a PostgreSQL `checkpoints` table, keyed by `thread_id`. The `thread_id` is constructed using ONLY the `sender_phone` (the Telegram `chat_id`), with **no `business_id` component**.

#### What happens:
1. Prospect with `chat_id = 123456` messages the bot for account `agrivera@gmail.com` → thread `prospect_123456` is created.
2. The graph runs, fetching `agrivera`'s products and baking them into the LLM system prompt. The entire LangGraph state (including `messages` with product lists) is checkpointed to PostgreSQL under `thread_id = "prospect_123456"`.
3. The same prospect (or a different person with the same `chat_id`, or testing from the same Telegram account) messages the bot for account `reyesrbernardo@gmail.com` → same thread `prospect_123456` is loaded.
4. **The checkpointed state from Step 2 is resumed**, which contains `agrivera`'s product catalog baked into the conversation history messages. Even though fresh products are fetched for `reyesrbernardo`, the LLM sees the old conversation with `agrivera`'s products and can reference them.

> [!CAUTION]
> This is not just a UI glitch — the **entire conversation state** including messages, phase, collected prospect data, and tool call results from **Account A** bleeds into **Account B** when the same Telegram user contacts both bots.

**Fix**: Scope the `thread_id` by `business_id`:

```diff
-thread_id = f"prospect_{sender_phone}"
+thread_id = f"prospect_{business_id}_{sender_phone}"
```

Additionally, the reset logic on lines 835-836 should also be scoped:

[prospect_qualifier.py:835-836](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L835-L836)

```python
# These DELETE statements use thread_id, so they'll be automatically
# fixed once thread_id includes business_id
await self.db.execute(text("DELETE FROM checkpoints WHERE thread_id = :tid"), {"tid": thread_id})
await self.db.execute(text("DELETE FROM checkpoint_writes WHERE thread_id = :tid"), {"tid": thread_id})
```

---

### 🟡 BUG 3 (Latent Risk): Product query via Category join has no direct business_id guard

[prospect_qualifier.py:798](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L798)

```python
stmt = select(Product).join(Category).where(Category.business_id == business_id)
```

**Assessment**: This query is **technically correct** — it filters through `Category.business_id`. However, it relies on the `Category → business_id` relationship being correct. A safer defensive pattern would add a direct business guard or an assertion.

> [!TIP]
> While this query is correct, consider adding a debug assertion that all returned products belong to the expected business for defense-in-depth.

---

## Summary of Bugs

| # | Bug | File | Severity | Impact |
|---|-----|------|----------|--------|
| 1 | Webhook fetches ALL tenant integrations | [telegram.py:62-66](file:///Users/bernardo/projects/sherpa/backend/app/api/telegram.py#L62-L66) | Medium | Performance + fragile isolation |
| 2 | **`thread_id` lacks `business_id` scope** | [prospect_qualifier.py:804](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L804) | **CRITICAL** | **Confirmed cross-tenant data leak** |
| 3 | Product query relies on indirect FK | [prospect_qualifier.py:798](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L798) | Low | Latent risk |

---

## Recommended Fix Plan

### Immediate (P0 — Deploy ASAP)

1. **Fix `thread_id` scoping** in `prospect_qualifier.py:804`:
   ```python
   thread_id = f"prospect_{business_id}_{sender_phone}"
   ```

2. **Purge all existing checkpoints** for prospect threads to clear any contaminated state:
   ```sql
   DELETE FROM checkpoints WHERE thread_id LIKE 'prospect_%';
   DELETE FROM checkpoint_writes WHERE thread_id LIKE 'prospect_%';
   ```

### Short-term (P1)

3. **Fix webhook integration lookup** in `telegram.py:62-66` to use JSONB operator instead of loading all rows.

4. **Audit all other `thread_id` constructions** across the codebase for similar scoping issues:
   ```bash
   grep -rn "thread_id" backend/app/
   ```

### Medium-term (P2)

5. Add **Row-Level Security (RLS)** or a SQLAlchemy `session.info["business_id"]` pattern to ensure all queries are tenant-scoped by default.

6. Add **integration tests** that simulate multi-tenant webhook scenarios to catch cross-contamination regressions.

---

## How to Reproduce

1. Register two businesses (Account A: `agrivera`, Account B: `reyesrbernardo`) each with different product catalogs
2. Connect a Telegram bot to each business
3. From the **same Telegram account**, message Account A's bot → ask about products → receive Account A's catalog
4. From the **same Telegram account**, message Account B's bot → the checkpointed state from Account A is loaded, leaking Account A's products into the conversation
