# Multi-Tenant WhatsApp Epic — Finalized Implementation Plan

## All Design Decisions (Resolved)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | **Twilio account type** | Standard subaccounts (not ISV). Revisit ISV at 50+ tenants. |
| 2 | **Provisioning model** | Automated — Sherpa programmatically creates Twilio subaccounts and provisions numbers via API. |
| 3 | **Provisioning trigger** | Post-onboarding only, from Settings → Integrations. WhatsApp is optional. |
| 4 | **Webhook architecture** | Single shared endpoint (`POST /api/whatsapp/webhook`). Route by `To` phone number. |
| 5 | **Usage metering** | ALL messages count (inbound + outbound). Reflects Meta's per-message pricing model (service messages become paid Oct 2026). |
| 6 | **Free tier cap** | 200 messages/month total. Calendar month reset (1st of each month). |
| 7 | **Cap enforcement** | Hard block outbound. Inbound messages still received and stored silently (no AI reply). |
| 8 | **LangGraph gate** | Check usage BEFORE the LangGraph loop. If capped, skip LLM entirely (saves tokens + processing). |
| 9 | **Alert channels** | At 80% (160 msgs): in-app banner + WhatsApp message to tenant. At 100%: same + Superadmin in-app alert. WhatsApp alerts count toward cap. |
| 10 | **Monthly reset** | Calendar month (1st). Redis key: `usage:whatsapp:{biz_id}:YYYY-MM` with TTL. |
| 11 | **Credit purchase** | Manual — Superadmin bumps `purchased_credits` from admin panel. No Stripe for MVP. |
| 12 | **Credit expiry** | Monthly — purchased credits also reset on the 1st. Clean slate each month. |
| 13 | **Phone number geography** | Mexico only (+52). Simplifies provisioning and regulatory. |
| 14 | **Migration strategy** | None needed — pre-launch, no production tenants on sandbox. Rip out sandbox flow entirely. |
| 15 | **Setup UX** | Configuration wizard (multi-step): area code preference, business display name for WhatsApp profile. Spanish UI. |
| 16 | **Provisioning failure** | Retry with exponential backoff (3 attempts), then mark status `error`. Red indicator on UI + Superadmin alert. |
| 17 | **Number portability** | No changes post-provisioning. Disconnect releases number permanently; reconnecting provisions a new one. |
| 18 | **Disconnect flow** | Yes — confirmation modal warning that the number is released permanently. |
| 19 | **Adapter scope** | WhatsApp only. Telegram keeps current architecture. Abstract layer built but only `TwilioSubaccountEngine` implemented. |
| 20 | **Twilio credential storage** | `settings` JSONB column on Integration model. `access_token`/`refresh_token` columns reserved for OAuth. |
| 21 | **Encryption** | Investigate CRM model's existing pattern first. If not reusable, Fernet with `ENCRYPTION_KEY` env var. |
| 22 | **Branch strategy** | `feature/backend/multitenant-whatsapp` (Phases 1-3), `feature/frontend/whatsapp-ui` (Phase 4) → both target `staging`. |

---

## Codebase State Summary

### Backend — Integration Model ([integration.py](file:///Users/bernardo/projects/sherpa/backend/app/models/integration.py))
- 26-line model with `settings` JSON column (needs `JSONB` upgrade)
- `provider` is free-text String (e.g., `'whatsapp'`), no enum
- `access_token`/`refresh_token` columns exist (plaintext, reserved for OAuth)
- 1 Alembic migration exists. Migrations at `backend/migrations/versions/`
- FK references `business_profiles.id` (not `businesses`)

### Backend — Encryption
- No dedicated encryption utility exists
- [Client model (crm.py)](file:///Users/bernardo/projects/sherpa/backend/app/models/crm.py) has encryption event listeners for `whatsapp_id` — investigate for reuse

### Frontend — WhatsApp Components
- [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx) — 210 lines, 4-step Twilio Sandbox wizard (to be completely redesigned)
- [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx) — 13.8KB, manages WhatsApp + Telegram + Google Calendar connections
- Admin page at `/app/(admin)/admin/page.tsx` — already has WhatsApp config fields
- UI stack: hand-rolled Tailwind CSS, lucide-react icons, Sonner toasts, Zustand + React Query
- **No shadcn/ui. No chart libraries.**

---

## Implementation Plan

### Phase 1 — Foundation (DB + Encryption + Adapter Pattern)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 1.1 | Investigate existing CRM encryption pattern | `backend/app/models/crm.py` | Check if the `whatsapp_id` encrypt/hash listeners can be extracted into a reusable utility |
| 1.2 | Install `cryptography` package (if needed) | `requirements.txt` | Fernet for symmetric encryption |
| 1.3 | Create encryption utility | `backend/app/core/encryption.py` (new) | `encrypt_value()` / `decrypt_value()` with `ENCRYPTION_KEY` from env |
| 1.4 | Migrate `settings` from `JSON` → `JSONB` | `backend/migrations/versions/` | Enables indexing for phone number lookups |
| 1.5 | Define settings schema for WhatsApp | Documentation | `{ provider_type, subaccount_sid, auth_token_encrypted, phone_number }` |
| 1.6 | Create `BaseMessagingEngine` abstract class | `backend/app/services/messaging/base.py` (new) | `send_text()`, `send_media()`, `register_webhook()` |
| 1.7 | Create `TwilioSubaccountEngine` | `backend/app/services/messaging/twilio_engine.py` (new) | Reads per-tenant creds from Integration settings |
| 1.8 | Create `MessagingService` factory | `backend/app/services/messaging/__init__.py` (new) | Resolves engine by provider type |
| 1.9 | Create Twilio provisioning service | `backend/app/services/messaging/provisioner.py` (new) | `create_subaccount()`, `provision_number(country="MX")`, `register_webhook()` with retry logic (3 attempts, exponential backoff) |
| 1.10 | Add provisioning API endpoint | `backend/app/api/` | `POST /api/integrations/whatsapp/provision` — triggers automated setup |
| 1.11 | Write tenant isolation tests | `backend/tests/test_integration_isolation.py` (new) | Two tenants, verify zero data leakage |

### Phase 2 — Inbound Routing Overhaul

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 2.1 | Refactor webhook to route by `To` number | `backend/app/api/whatsapp.py` | Index lookup on `settings["phone_number"]` via JSONB query |
| 2.2 | Remove sandbox flow ("join flower-leaf") | Same | Rip out entirely — no production tenants |
| 2.3 | Add unmapped number fallback (404) | Same | Clean rejection, no crash |
| 2.4 | Per-subaccount Twilio signature validation | Same | Validate using each tenant's auth token |
| 2.5 | Pass resolved `business_id` into LangGraph | LangGraph integration | Bind to state machine context |
| 2.6 | Write routing tests | `backend/tests/test_webhook_routing.py` (new) | Mock 2 tenants, verify isolation |

> [!TIP]
> **PR #1 checkpoint** — After Phase 2, multi-tenant WhatsApp provisioning and routing are fully functional end-to-end.

### Phase 3 — Usage Control & Credits

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 3.1 | Create Redis usage counter module | `backend/app/core/limiter.py` (new) | Atomic `INCR`, key: `usage:whatsapp:{biz_id}:YYYY-MM`, TTL = end of month |
| 3.2 | Count ALL messages (inbound + outbound) | Limiter integration | Increment on every message processed, regardless of direction |
| 3.3 | Add `purchased_credits` to BusinessProfile | `backend/app/models/business.py` + migration | Integer, default 0, reset monthly |
| 3.4 | Add pre-LangGraph usage gate | Message processing pipeline | Check `used < 200 + purchased_credits` BEFORE calling LangGraph. If over: store message, skip AI, skip outbound |
| 3.5 | Implement inbound passthrough when capped | Webhook handler | Inbound messages still stored in DB and visible in conversations UI, but no AI reply triggered |
| 3.6 | Create usage query endpoint | `backend/app/api/` | Returns `{ used, free_limit: 200, purchased, remaining, percent_used }` |
| 3.7 | 80% threshold alert trigger | Limiter module | When `used >= 160`: push in-app notification + send WhatsApp message to tenant's business number |
| 3.8 | 100% threshold alert + Superadmin notification | Limiter module | When `used >= cap`: push in-app alert to tenant + in-app alert to Superadmin |
| 3.9 | Admin credit management endpoint | `backend/app/api/admin.py` | `PATCH /admin/business/{id}/credits` — sets `purchased_credits` |
| 3.10 | Write capping tests | `backend/tests/test_usage_limiter.py` (new) | Simulate 200 msgs → assert 201st blocked. Test 80% and 100% alerts. |

### Phase 4 — Frontend Integration UI

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 4.1 | Redesign `WhatsAppModal.tsx` as configuration wizard | [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx) | Multi-step: explanation → area code preference + business display name → provisioning spinner → success with assigned number. Spanish UI. |
| 4.2 | Add disconnect confirmation modal | Same or new component | Warning: "This will release your number permanently" with confirmation |
| 4.3 | Update `IntegrationsPanel.tsx` | [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx) | Show: assigned number, connection health, provider status, red error indicator if provisioning failed |
| 4.4 | Build `UsageIndicator` component | New component | "145 / 200 mensajes usados" progress bar. Hand-rolled Tailwind matching existing patterns. |
| 4.5 | Wire usage data with React Query | API hooks | `GET /api/usage/{business_id}` → display in IntegrationsPanel |
| 4.6 | Add usage warning banner | Dashboard component | Persistent banner when at 80%+. Dismissable but returns on next page load. |
| 4.7 | Extend admin page with tenant management | `/app/(admin)/admin/page.tsx` | Table of tenants: WhatsApp status, usage metrics, `purchased_credits` input field |
| 4.8 | Remove onboarding Step 4 WhatsApp setup | `app/onboarding/page.tsx` | WhatsApp is now post-onboarding only (Settings → Integrations) |
| 4.9 | Keep modal modular for future Meta button | Architecture | Component accepts `provider` prop for future extensibility |

> [!TIP]
> **PR #2 checkpoint** — After Phase 4, usage caps are enforced, tenants see their connection status + consumption, and Superadmin can manage credits.

---

## Meta Coexistence (Phase 5 — Future, No Work Now)

The adapter pattern from Phase 1 ensures that when the time comes:
1. Create `MetaCloudAPI` implementing `BaseMessagingEngine`
2. Add new provider type to Integration settings
3. Drop in a Meta OAuth button on the frontend modal
4. Handle Meta's "human fallback echo" by toggling `ai_enabled = False`

No structural rewrites needed.

---

## Key Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              Inbound Webhook Endpoint                │
│           POST /api/whatsapp/webhook                 │
│                                                      │
│  1. Parse `To` phone number                          │
│  2. Lookup Integration by settings["phone_number"]   │
│  3. Validate Twilio signature (per-tenant auth)      │
│  4. Resolve business_id                              │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│              Usage Limiter (Redis)                    │
│                                                      │
│  Key: usage:whatsapp:{biz_id}:2026-07                │
│  Check: used < 200 + purchased_credits               │
│                                                      │
│  ├─ UNDER LIMIT → increment counter, continue       │
│  ├─ AT 80% → trigger alert (in-app + WhatsApp)      │
│  └─ OVER LIMIT → store message, SKIP LangGraph      │
└───────────────┬─────────────────────────────────────┘
                │ (only if under limit)
                ▼
┌─────────────────────────────────────────────────────┐
│              LangGraph AI Loop                       │
│  (processes inbound, generates response)             │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│           MessagingService (Abstract Layer)           │
│                                                      │
│  ┌─────────────────────┐  ┌──────────────────────┐  │
│  │ TwilioSubaccountEng │  │ MetaCloudAPI (future)│  │
│  │ • send_text()       │  │ • send_text()        │  │
│  │ • send_media()      │  │ • send_media()       │  │
│  └─────────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Twilio provisioning API rate limits | Exponential backoff with 3 retries. Queue provisioning requests if needed. |
| JSONB migration on production | Pre-launch — no production data to worry about. |
| Tenant credential leakage | Fernet encryption for auth tokens. Zero-trust: never log secrets. |
| Redis counter drift (crash between INCR and message send) | Acceptable for MVP. Counter may over-count by 1 on failure. Not critical at 200-message scale. |
| Meta pricing changes (Oct 2026 service messages) | Already accounted for — counting all messages. Architecture ready. |
| WhatsApp number availability in Mexico | Twilio has good +52 inventory. Provisioning failure flow handles edge case. |
