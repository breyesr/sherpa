# Defense-in-Depth Evaluation: AI Safety Orchestration

## The Core Idea

Instead of trusting a single prompt fence to enforce safety, implement **three independent validation layers** so that even if one layer fails, the others catch the violation before any real damage occurs.

## Layer-by-Layer Evaluation

---

### Layer 1: Save-Time Instruction Validator

**The Idea:** When a business owner clicks "Save" on their custom instructions, validate them *before* they ever reach the database.

**Verdict: ✅ High value, low complexity**

**Strengths:**
- Zero runtime latency — customer conversations stay fast
- Instant feedback loop — users learn what's allowed immediately
- Prevents bad instructions from ever polluting a prompt
- Infrequent operation (users edit settings rarely), so cost per LLM validation call is negligible

**Implementation Recommendation: Hybrid Approach**

| Check | Type | Example |
|---|---|---|
| Character limit (1000 chars) | Deterministic | Reject if `len > 1000` |
| Obvious injection patterns | Deterministic (regex) | `"ignore.*previous.*instructions"`, `"you are now"`, `"disregard.*rules"` |
| Semantic rule violation | Lightweight LLM call | *"Does this instruction conflict with any of these 9 rules? Answer YES/NO and cite the rule."* |

The deterministic checks run first (free, instant). Only if they pass does the LLM check run (~$0.001 per validation).

**What to return on rejection:**
```
❌ "This instruction conflicts with Safety Rule #2: 'Do not skip identity verification 
before booking.' Please adjust your instructions and try again."
```

---

### Layer 2: Deterministic Backend Tool Locks (Hard Enforcement)

**The Idea:** Even if the AI *wanted* to break a rule, the Python code physically prevents it.

**Verdict: ✅ Most critical layer — and currently has significant gaps**

**Current State Audit:**

| Tool | Has `business_id` Scoping? | Has Input Validation? | Gap |
|---|---|---|---|
| [`create_appointment`](file:///Users/bernardo/projects/sherpa/backend/app/core/ai_service.py#L628) | ✅ Yes | ⚠️ Partial — no identity check | **Can book for unknown clients** — `_check_client_direct` auto-creates clients, so the AI can book even if the client has no name/email |
| [`update_client_identity`](file:///Users/bernardo/projects/sherpa/backend/app/core/ai_service.py#L747) | ✅ Yes (via identifier) | ⚠️ No validation | **Overwrites blindly** — `name` is overwritten unconditionally. No confirmation or diff check. |
| [`update_client_metadata`](file:///Users/bernardo/projects/sherpa/backend/app/core/ai_service.py#L804) | ✅ Yes | ⚠️ Minimal — key sanitization only | **No key allowlist** — AI could write arbitrary keys like `is_admin: true` or `password: ...` into `custom_fields` |
| [`log_field_report`](file:///Users/bernardo/projects/sherpa/backend/app/services/agentic_orchestrator.py#L106) | ✅ Yes | ❌ None | **No store_id validation** — if `active_store_id` is None and AI passes None, it could create orphaned reports |
| [`flag_for_review`](file:///Users/bernardo/projects/sherpa/backend/app/core/ai_service.py#L788) | ✅ Yes | ✅ Safe | Low risk — only sets a review flag |

**Key Gaps to Fix:**
1. **`create_appointment` should reject if client has no `name`** — This is the "identity verification" rule enforced in code, not just in the prompt.
2. **`update_client_metadata` needs a key allowlist** — Only allow known CRM keys (e.g., `pet_name`, `preferred_day`, `notes`). Reject system-reserved keys.
3. **`log_field_report` should require a valid `store_id`** — Reject if None instead of creating orphaned data.

---

### Layer 3: Runtime Message Interceptor

**The Idea:** Filter incoming messages from end-users (WhatsApp/Telegram) for prompt injection attempts before they reach the LLM.

**Verdict: ⚠️ Moderate value — keep it lightweight**

**Why "moderate":**
- Prompt injection detection is an **arms race** — pattern matching is easily bypassed with unicode tricks, encoding, etc.
- An LLM-based detector would add latency and cost to *every single message* (thousands/day)
- The real protection comes from Layers 1 & 2 — if tools have hard validation and the prompt fence is solid, even a successful injection has limited blast radius

**Recommendation: Lightweight deterministic scanner only**
- Scan for known injection signatures (maintained pattern list)
- Log flagged messages for audit (don't block — to avoid false positives silencing real customers)
- Cap input message length (prevent context stuffing)
- **Do NOT add an LLM-in-the-loop here** — the latency/cost tradeoff isn't worth it for messaging flows

---

## What's Missing from the Original Proposal

### Gap A: Output Guardrails (Post-Response Check)

We've focused entirely on **input validation** but haven't considered what happens if the AI's *response* leaks PII or goes off-topic despite all the fences.

**Recommendation:** A lightweight post-processing scan on the AI's response text before it's sent to the customer:

| Check | Type | Action |
|---|---|---|
| Contains another client's phone/email from context | Regex pattern match | Redact and log |
| Response exceeds reasonable length (>2000 chars) | Deterministic | Truncate with "..." |
| Contains raw system error messages or stack traces | Regex | Replace with graceful fallback |

This is cheap (no LLM call, just regex) and catches the edge cases where the AI inadvertently leaks data it had in its system prompt.

### Gap B: Safety Event Audit Log

When any layer catches a violation, we should **log it** — not just silently reject. This gives business owners and Sherpa admins visibility into:
- How often the safety fence is triggered
- What kinds of instructions users are trying to set
- Whether end-users are attempting prompt injections

**Implementation:** A simple `safety_events` log table or structured log entries.

### Gap C: Graceful Degradation Policy

What happens when the save-time LLM validator is unavailable (API timeout, rate limit)?

| Strategy | Risk |
|---|---|
| **Fail-closed** (reject instruction, show error) | ✅ Safest — no unvalidated instructions enter the system |
| **Fail-open** (save but flag for review) | ⚠️ Allows potentially unsafe instructions temporarily |

**Recommendation:** Fail-closed. Custom instructions are a low-frequency operation — users can retry in a few seconds.

---

## Priority & Effort Matrix

| Layer | Impact | Effort | Priority |
|---|---|---|---|
| **Layer 2: Tool Hard Locks** | 🔴 Critical — prevents real data corruption | Small (add validation to 3 tool handlers) | **P0 — Do first** |
| **Layer 1: Save-Time Validator** | 🟡 High — prevents bad prompts from entering system | Medium (new endpoint + hybrid validator) | **P1 — Do second** |
| **Gap A: Output Guardrails** | 🟡 High — prevents PII leaks in responses | Small (regex post-processor) | **P1 — Do second** |
| **Gap B: Audit Log** | 🟢 Medium — observability and compliance | Small (structured logging) | **P2 — Do third** |
| **Layer 3: Input Interceptor** | 🟢 Low-Medium — arms race, limited incremental value | Medium (pattern library + scanner) | **P3 — Do last** |
| **Gap C: Fail-Closed Policy** | 🟢 Low — edge case for validator downtime | Tiny (try/except with reject default) | Bundled with Layer 1 |
