# Pending Tasks from `prioritized_tasks.md` — Enriched Work Order

**Audit Date**: August 3, 2026
**Method**: Direct codebase `grep` verification against all 26 tasks. Backlog/handoff docs NOT trusted.

---

## Summary

| Phase | Total Tasks | ✅ Verified Done | ⚠️ Partially Done |
|:------|:-----------:|:----------------:|:------------------:|
| Phase 1: Critical Security | 3 | 3 | 0 |
| Phase 2: Token Optimization | 6 | **6** | **0** |
| Phase 3: Remaining Security | 4 | **4** | **0** |
| Phase 4: Performance & Reliability | 8 | 8 | 0 |
| Phase 5: Backend Architecture | 5 | 5 | 0 |
| Phase 6: Frontend Architecture | 5 | **5** | **0** |
| **Total** | **31** | **31** | **0** |

---

## Task 1: Replace `print()` with `logging` across backend ✅ COMPLETE

**Task ID**: 200.7 · **Priority**: 🟡 Medium · **Status**: Completed (August 3, 2026)

### Problem
110 `print()` calls remain across 18 backend files. The task originally scoped to `whatsapp.py` and `telegram.py` (both clean), but the project rule mandates: *"Use Python's `logging` module, never `print()`, for any operational or debug output in backend code."*

### Files to Fix (sorted by count)

| # | File | `print()` count | Has `import logging`? | Has `logger =`? |
|:--|:-----|:---------------:|:---------------------:|:---------------:|
| 1 | `backend/app/core/ai_service.py` | 22 | ❌ | ❌ |
| 2 | `backend/app/tasks/messages.py` | 11 | ❌ | ❌ |
| 3 | `backend/app/services/graphrag.py` | 10 | ❌ | ❌ |
| 4 | `backend/app/core/google_calendar.py` | 9 | ❌ | ❌ |
| 5 | `backend/app/core/telegram_service.py` | 8 | ❌ | ❌ |
| 6 | `backend/app/core/integrity.py` | 8 | ❌ | ❌ |
| 7 | `backend/app/api/integrations.py` | 7 | ❌ | ❌ |
| 8 | `backend/app/api/business.py` | 7 | ❌ | ❌ |
| 9 | `backend/app/tasks/ingestion.py` | 6 | ❌ | ❌ |
| 10 | `backend/app/tasks/reminders.py` | 5 | ❌ | ❌ |
| 11 | `backend/app/api/crm.py` | 5 | ❌ | ❌ |
| 12 | `backend/app/services/messaging/twilio_engine.py` | 3 | ❌ | ❌ |
| 13 | `backend/app/tasks/calendar_sync.py` | 2 | ❌ | ❌ |
| 14 | `backend/app/services/prospect_qualifier.py` | 2 | ✅ | ✅ |
| 15 | `backend/app/core/postal_seeder.py` | 2 | ✅ | ✅ |
| 16 | `backend/app/services/ingestion.py` | 1 | ❌ | ❌ |
| 17 | `backend/app/core/system_config.py` | 1 | ❌ | ❌ |
| 18 | `backend/app/core/embeddings.py` | 1 | ❌ | ❌ |

### Implementation Instructions

**Step 1**: For each file that lacks `import logging` and `logger =`, add these two lines near the top imports:

```python
import logging

logger = logging.getLogger(__name__)
```

This follows the existing pattern in `whatsapp.py:27`, `telegram.py:27`, `context_assembler.py:4`, `prospect_qualifier.py`.

**Step 2**: Replace each `print()` call with the appropriate log level. Use the prefix in the print message as the guide:

| Print prefix | Replace with | Example |
|:-------------|:-------------|:--------|
| `print(f"CRITICAL: ...")` | `logger.critical(...)` | `logger.critical("Prompt Construction Stage (Jinja2) Failed: %s", e)` |
| `print(f"ERROR: ...")` | `logger.error(...)` | `logger.error("LLM generation failed: %s", e)` |
| `print(f"WARNING: ...")` | `logger.warning(...)` | `logger.warning("Google Reschedule failed: %s", e)` |
| `print(f"DEBUG ...")` or `print(f"DIAGNOSTIC: ...")` | `logger.debug(...)` | `logger.debug("AI calling tool: %s", tool_call.function.name)` |
| `print(f"Error in ...")` (no prefix) | `logger.error(...)` | `logger.error("Error in _get_available_slots_tool: %s", e)` |
| Generic info/status | `logger.info(...)` | `logger.info("Creating NEW conversation for client %s", client_id)` |

**Step 3**: Use `%s` lazy formatting instead of f-strings in logger calls for performance:
```python
# ❌ Bad
logger.error(f"Tool {tool_call.function.name} failed: {te}")
# ✅ Good
logger.error("Tool %s failed: %s", tool_call.function.name, te)
```

**Step 4**: Verify with: `grep -rn 'print(' backend/app/ --include='*.py' | grep -v '__pycache__' | grep -v 'test_' | wc -l` — should return `0`.

---

## Task 2: Eliminate `: any` type annotations in frontend ✅ COMPLETE

**Task ID**: 203.4 · **Priority**: 🟡 Medium · **Status**: Completed (August 3, 2026)

### Problem
45 total `: any` annotations remain. ~15 are `catch (err: any)` blocks, ~20 are type-unsafe annotations on variables, parameters, and props. Project rule: *"Do not use `: any` type annotations."*

### Available Types (in `frontend/types/models.ts`)

The following types are already defined and should be used instead of `any`:

```typescript
import { Store, Client, Product, Order, StoreAction, AttentionLead, DashboardStats } from '@/types/models';
```

### Files to Fix with Specific Replacements

#### Group A: Catch blocks — Replace `err: any` → `err: unknown`

These are TypeScript best practice. Replace and add type narrowing:

```typescript
// ❌ Before
} catch (err: any) {
  setError(err.message);
}

// ✅ After
} catch (err: unknown) {
  setError(err instanceof Error ? err.message : 'An unexpected error occurred');
}
```

| File | Line(s) |
|:-----|:--------|
| `frontend/app/settings/components/AssistantSettings.tsx` | 89 |
| `frontend/app/trade/prospects/[id]/page.tsx` | 101 |
| `frontend/app/trade/orders/[id]/page.tsx` | 104 |
| `frontend/app/DashboardHome.tsx` | 101 |
| `frontend/app/(admin)/admin/page.tsx` | 78, 200 |
| `frontend/components/AddAppointmentModal.tsx` | 72 |
| `frontend/components/RescheduleAppointmentModal.tsx` | 55 |
| `frontend/components/WhatsAppModal.tsx` | 37 |
| `frontend/components/TelegramModal.tsx` | 32, 92 |
| `frontend/components/v2/ManageFieldsDrawer.tsx` | 50, 70 |
| `frontend/components/v2/ContactDrawer.tsx` | 148 |
| `frontend/components/v2/ServiceDrawer.tsx` | 129, 162, 180 |

#### Group B: Drawer state — Replace `initialData?: any` → proper interface

```typescript
// ❌ Before
const [contactDrawer, setContactDrawer] = useState<{isOpen: boolean, clientId: string | null, initialData?: any}>({...});

// ✅ After
const [contactDrawer, setContactDrawer] = useState<{isOpen: boolean, clientId: string | null, initialData?: Partial<Client>}>({...});
```

| File | Line | Replace `any` with |
|:-----|:-----|:--------------------|
| `frontend/app/trade/prospects/contacts/page.tsx` | 35 | `Partial<Client>` |
| `frontend/app/trade/prospects/accounts/page.tsx` | 33 | `Partial<Store>` |
| `frontend/app/trade/stores/page.tsx` | 30 | `Partial<Store>` |
| `frontend/app/trade/retailers/page.tsx` | 32 | `Partial<Client>` |
| `frontend/components/v2/ContactDrawer.tsx` | 25 | `Partial<Client>` |
| `frontend/components/v2/CatalogDrawer.tsx` | 25 | `Partial<Product>` |

#### Group C: Component props — Define local interfaces

```typescript
// ❌ Before (prospects/[id]/page.tsx:402)
function InfoItem({ label, value, icon: Icon }: any) {

// ✅ After
interface InfoItemProps {
  label: string;
  value: string | number | null;
  icon: React.ComponentType<{ className?: string }>;
}
function InfoItem({ label, value, icon: Icon }: InfoItemProps) {
```

```typescript
// ❌ Before (Sidebar.tsx:341)
function SidebarLink({ href, icon: Icon, name, active }: any) {

// ✅ After
interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  active: boolean;
}
function SidebarLink({ href, icon: Icon, name, active }: SidebarLinkProps) {
```

#### Group D: Callback/iterator params — Use the domain type

| File | Line | Current | Replace with |
|:-----|:-----|:--------|:-------------|
| `DashboardHome.tsx` | 288 | `(lead: any)` | `(lead: AttentionLead)` |
| `OrderDrawer.tsx` | 65 | `(s: any)` | `(s: Store)` |
| `OrderDrawer.tsx` | 69, 268 | `(p: any)` / `(product: any)` | `(p: Product)` / `(product: Product)` |
| `OrderDrawer.tsx` | 79 | `(product: any)` | `(product: Product)` |
| `OrderDrawer.tsx` | 199, 214 | `(s: any)` / `(c: any)` | `(s: Store)` / `(c: Client)` |
| `ServiceDrawer.tsx` | 70 | `value: any` | `value: string \| number \| boolean` |
| `ServiceDrawer.tsx` | 88, 413 | `(f: any)` | `(f: CRMField)` |
| `ServiceDrawer.tsx` | 97 | `newField: any` | `newField: CRMField` |
| `TelegramModal.tsx` | 53 | `intervalId: any` | `intervalId: ReturnType<typeof setInterval> \| null` |

### Verification Command
```bash
grep -rn ': any' frontend/app/ frontend/components/ --include='*.tsx' --include='*.ts' | grep -v node_modules | grep -v '.test.' | grep -v '__tests__' | wc -l
# Target: 0
```

---

## Task 3: Add module-level docstrings to large files ✅ COMPLETE

**Task ID**: 204.4 · **Priority**: 🟢 Low · **Status**: Completed (August 3, 2026)

### Problem
Two files >200 lines lack module-level docstrings. The existing pattern (from `ai_service.py`) is a 3-line triple-quote docstring at line 1.

### Implementation

**File 1**: `backend/app/services/graphrag.py` (634 lines)
Add at line 1, before the `from typing import...` import:
```python
"""
GraphRAG Hybrid Search and Retrieval Engine.
Implements parallelized semantic + keyword search with RRF ranking over the KnowledgeCorpus for context-aware AI responses.
"""
```

**File 2**: `backend/app/services/agentic_orchestrator.py` (331 lines)
Add at line 1, before the `import os` import:
```python
"""
B2B Agentic Orchestrator for Trade Intelligence.
Routes inbound messages through the LangGraph-based multi-agent pipeline for store visit notes, action extraction, and GraphRAG-enriched responses.
"""
```

### Verification Command
```bash
head -3 backend/app/services/graphrag.py backend/app/services/agentic_orchestrator.py
# Both should show triple-quote docstrings
```

---

## All Other Tasks — Verified ✅

Every other task from `prioritized_tasks.md` was verified directly against the codebase and confirmed complete:

- **Phase 1**: SECRET_KEY validator crashes on prod/staging if weak/default ✅ · Auth on /sync ✅ · Explicit CORS origins ✅
- **Phase 2**: .geminiignore optimized ✅ · Rule files consolidated ✅ · ARCHITECTURE.md (74 lines) ✅ · IMPORT_MAP.md (507 lines) ✅ · BACKLOG.md compact (147 lines) ✅
- **Phase 3**: Telegram debug auth ✅ · File upload whitelist ✅ · HttpOnly cookies ✅
- **Phase 4**: All 8 tasks confirmed in Epic 201 audit ✅ (see `temp/epic_201_audit.md`)
- **Phase 5**: constants.py ✅ · scripts/ organized ✅ · conftest.py ✅ · api/trade/ split ✅ · models/trade/ split ✅
- **Phase 6**: apiClient.ts ✅ · Modals deleted → Drawers ✅ · react-hook-form+zod ✅ · Vitest ✅
