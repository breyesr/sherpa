# Sherpa → Meta WhatsApp Cloud API Migration Plan

> **Context**: Sherpa has achieved **Meta Tech Provider** status. This plan covers (A) what to set up inside Meta's platform, and (B) what to change inside Sherpa's codebase to fully replace Twilio with the direct Cloud API.

---

## Current State Summary

After a full codebase audit, Sherpa has a **hybrid architecture**:

| Layer | Current Provider | Files |
|---|---|---|
| **Inbound webhook** (Twilio path) | Twilio form-data + `X-Twilio-Signature` | [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L168-L335) `/webhook/twilio` |
| **Inbound webhook** (Cloud API path) | Meta Cloud API JSON (partial) | [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L50-L160) `/webhook` |
| **Outbound sending** (Twilio path) | Twilio Python SDK | [twilio_engine.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/twilio_engine.py), [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py#L20-L61) |
| **Outbound sending** (Cloud API path) | Direct Graph API `httpx` calls | [whatsapp.py L134-L154](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L134-L154), [reminders.py L79-L98](file:///Users/bernardo/projects/sherpa/backend/app/tasks/reminders.py#L79-L98) |
| **Number provisioning** | Twilio subaccounts + MX number purchase | [provisioner.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/provisioner.py) |
| **Engine abstraction** | `BaseMessagingEngine` → `TwilioSubaccountEngine` | [base.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/base.py), [\_\_init\_\_.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/__init__.py) |
| **Admin panel** | Twilio SID/Token/Number inputs | [admin/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/(admin)/admin/page.tsx) |
| **User onboarding** | Twilio provisioning wizard | [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx) |
| **Integration status** | Twilio API health check | [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx) |

> [!CAUTION]
> **Critical compliance gap**: The existing Cloud API webhook at `POST /webhook` has **NO `X-Hub-Signature-256` validation**. This MUST be fixed before going live — Meta requires it, and without it anyone can spoof webhook payloads.

---

# PART A — Meta Platform Setup

Everything you need to configure **inside Meta's ecosystem** before writing a single line of code.

## Phase A1: Meta App & Business Verification

| # | Step | Details | Owner |
|---|---|---|---|
| A1.1 | **Verify Meta Business Account** | Go to [business.facebook.com](https://business.facebook.com) → Settings → Business Verification. Submit legal docs (RFC, articles of incorporation). Approval: 1–5 business days. | Admin |
| A1.2 | **Create Meta App** | [developers.facebook.com/apps](https://developers.facebook.com/apps) → Create App → Type: **Business**. This is the central app that all Sherpa tenants will connect through. | DevOps |
| A1.3 | **Add WhatsApp product** | In the App Dashboard, click "Add Product" → WhatsApp. This unlocks the Cloud API and Embedded Signup features. | DevOps |
| A1.4 | **App Review submission** | Submit the app for review with screencasts showing: (1) Embedded Signup flow, (2) message sending, (3) opt-in collection. Required for production access and higher throughput. | PM / DevOps |

## Phase A2: System Users & Access Tokens

| # | Step | Details |
|---|---|---|
| A2.1 | **Create System User** | Business Settings → System Users → Add → Admin role. Name: `sherpa-platform`. |
| A2.2 | **Assign assets** | Assign the Sherpa Meta App to this system user with `whatsapp_business_management` + `whatsapp_business_messaging` permissions. |
| A2.3 | **Generate permanent token** | Generate a System User Access Token with scopes: `whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`. Store in Railway as `META_SYSTEM_USER_TOKEN`. |
| A2.4 | **Record App Secret** | From App Dashboard → Settings → Basic → App Secret. Store in Railway as `META_APP_SECRET`. This is used for webhook signature verification. |

> [!IMPORTANT]
> The **App Secret** is the HMAC key for `X-Hub-Signature-256`. Without it, webhook signature validation is impossible. This is a **security non-negotiable**.

## Phase A3: WhatsApp Business Account (WABA) Setup

| # | Step | Details |
|---|---|---|
| A3.1 | **Create platform WABA** | In WhatsApp Manager, create the primary WABA owned by Sherpa's Business Manager. This is the "host" WABA for the Tech Provider model. |
| A3.2 | **Configure webhook callback URL** | Set to: `https://<sherpa-api-domain>/api/v1/whatsapp/webhook`. Subscribe to field: `messages`. |
| A3.3 | **Set verify token** | Use the value stored in `WHATSAPP_VERIFY_TOKEN` env var (currently `"sherpa_v1"` or DB config). |
| A3.4 | **Register test phone number** | Use the sandbox number provided by Meta for initial testing. Or register a real +52 number (see A5). |

## Phase A4: Embedded Signup Configuration

As a Tech Provider, this replaces the Twilio subaccount provisioning model entirely.

| # | Step | Details |
|---|---|---|
| A4.1 | **Create Embedded Signup config** | In the App Dashboard → WhatsApp → Embedded Signup. Create a configuration with your callback URL. |
| A4.2 | **Configure Facebook Login** | App Dashboard → Facebook Login → Add Product. Set Valid OAuth Redirect URIs to your frontend domain. |
| A4.3 | **Set permissions scope** | Required scopes for the Embedded Signup OAuth: `whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`. |
| A4.4 | **Record config_id** | The Embedded Signup configuration ID. Store as `META_EMBEDDED_SIGNUP_CONFIG_ID` env var. |
| A4.5 | **Design onboarding UX** | Client clicks "Connect WhatsApp" → Facebook Login popup → Create/select WABA → Verify phone → OAuth code returned → Sherpa backend exchanges for client-scoped token. |

> [!NOTE]
> Embedded Signup replaces the manual Twilio subaccount provisioning. Instead of buying numbers programmatically, clients bring their own numbers and connect them through Meta's native flow. This is **faster** (minutes vs. days) and **cheaper** (no Twilio per-number fees).

## Phase A5: Phone Number Migration (Existing Tenants)

For each existing Sherpa tenant that has a Twilio-provisioned +52 number:

| # | Step | Risk |
|---|---|---|
| A5.1 | **Disable 2FA on Twilio** | Remove the two-step verification PIN for the number in Twilio Console. |
| A5.2 | **Release number from Twilio** | Delete the sender profile / release the number from the Twilio subaccount. |
| A5.3 | **Register number on Meta** | Use Embedded Signup or manual WABA registration to attach the number to a WABA under your Meta App. |
| A5.4 | **Verify number** | Complete SMS or voice call verification. |
| A5.5 | **Re-create message templates** | Templates **do NOT transfer**. All approved templates must be recreated and re-submitted for Meta approval. |

> [!WARNING]
> **Downtime risk**: The phone number will be briefly unavailable during migration (minutes to 24 hours). Plan migration during low-traffic hours. Notify affected tenants in advance. Consider doing a **rolling migration** — one tenant at a time.

## Phase A6: Message Templates

| # | Step | Details |
|---|---|---|
| A6.1 | **Audit existing templates** | Catalog all templates currently used in Sherpa (reminder templates, prospect qualification, etc.). |
| A6.2 | **Map to Meta categories** | Classify each as: `UTILITY` (reminders, confirmations), `MARKETING` (promos), or `AUTHENTICATION` (OTP). |
| A6.3 | **Submit templates for approval** | Use the Business Management API: `POST /{waba_id}/message_templates`. |
| A6.4 | **Subscribe to status webhooks** | Listen for `message_template_status_change` webhook events to track approval/rejection. |

### Meta Template Policy Compliance Checklist

- ☐ No variable-only templates (body must have static text)
- ☐ No URL shorteners in template URLs
- ☐ Templates correctly categorized (misuse = re-categorization or rejection)
- ☐ Marketing templates must include opt-out instruction
- ☐ No misleading, threatening, or discriminatory content
- ☐ Business name clearly identified

## Phase A7: Compliance & Policy Checklist

| Requirement | Status | Action Needed |
|---|---|---|
| **Explicit opt-in before messaging** | ✅ Exists (WhatsAppModal has opt-in checkbox) | Update copy to reference Meta instead of Twilio |
| **Opt-out mechanism** | ❌ Missing | Add "Reply STOP to unsubscribe" to marketing templates |
| **24-hour window enforcement** | ❌ Not enforced | Implement window tracking in backend (see Part B) |
| **Privacy policy** | ❓ Review | Must cover WhatsApp data handling per Meta's Platform Terms |
| **Data deletion on request** | ❓ Review | Must support user data deletion requests |
| **No wildcard CORS** | ✅ Already enforced | Per AGENTS.md security rules |
| **Webhook signature verification** | ❌ Missing | Implement `X-Hub-Signature-256` HMAC-SHA256 validation |

---

# PART B — Sherpa Codebase Integration Plan

Detailed, file-by-file changes organized into implementation phases.

## Phase B1: New Meta Cloud API Engine (Backend Core)

### B1.1 — Create `meta_cloud_engine.py`

**New file**: `backend/app/services/messaging/meta_cloud_engine.py`

Implements `BaseMessagingEngine` using Meta's Graph API instead of Twilio SDK.

```
class MetaCloudEngine(BaseMessagingEngine):
    """Direct Meta WhatsApp Cloud API engine — replaces TwilioSubaccountEngine."""
    
    def __init__(self, phone_number_id: str, access_token_encrypted: str, waba_id: str):
        ...
    
    async def send_text(to_number, text) -> bool:
        # POST https://graph.facebook.com/v22.0/{phone_number_id}/messages
        # Headers: Bearer {decrypted_access_token}
        # Body: {"messaging_product": "whatsapp", "to": ..., "type": "text", "text": {"body": ...}}
    
    async def send_media(to_number, media_url, caption) -> bool:
        # Same endpoint, type: "image"/"document"/"video"
    
    async def send_template(to_number, template_name, language, components) -> bool:
        # New method — not in base class yet, needs to be added
    
    async def send_interactive(to_number, interactive_body) -> bool:
        # New method for button/list messages
    
    async def mark_as_read(message_id) -> bool:
        # POST status: "read" to mark messages as read
    
    async def register_webhook(webhook_url) -> bool:
        # No-op for Cloud API — webhooks are configured at the App level, not per-number
        # Return True
```

**Key design decisions**:
- Use `httpx.AsyncClient` (already in the project) — no blocking SDK needed
- Use **API version v22.0** (upgrade from the current v18.0)
- Token decryption uses existing `decrypt_token()` from `app.core.security`
- Implement message chunking for >4096 char messages (WhatsApp limit)

### B1.2 — Extend `BaseMessagingEngine`

**Edit**: [base.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/base.py)

Add `send_template()` and `mark_as_read()` abstract methods:

```diff
+ @abstractmethod
+ async def send_template(self, to_number: str, template_name: str, 
+                         language: str = "es", components: list = None, **kwargs) -> bool:
+     pass

+ @abstractmethod
+ async def mark_as_read(self, message_id: str, **kwargs) -> bool:
+     pass
```

### B1.3 — Update `MessagingService` factory

**Edit**: [\_\_init\_\_.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/__init__.py)

```diff
  from app.services.messaging.twilio_engine import TwilioSubaccountEngine
+ from app.services.messaging.meta_cloud_engine import MetaCloudEngine

  if provider_type in ("twilio_subaccount", "twilio_platform"):
      # ... existing Twilio logic (keep for backward compat during migration)
+
+ elif provider_type == "meta_cloud_api":
+     phone_number_id = integration.settings.get("phone_number_id")
+     waba_id = integration.settings.get("waba_id")
+     access_token_encrypted = integration.access_token  # encrypted in DB
+     return MetaCloudEngine(
+         phone_number_id=phone_number_id,
+         access_token_encrypted=access_token_encrypted,
+         waba_id=waba_id
+     )
```

### B1.4 — New environment variables

| Variable | Purpose | Where |
|---|---|---|
| `META_APP_SECRET` | HMAC key for webhook signature verification | Railway + `.env` |
| `META_SYSTEM_USER_TOKEN` | Platform-level permanent token | Railway + `.env` |
| `META_APP_ID` | Meta App ID for Embedded Signup | Railway + `.env` |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Embedded Signup configuration | Railway + `.env` |
| `META_GRAPH_API_VERSION` | API version (default: `v22.0`) | Railway + `.env` |

**Edit**: [config.py](file:///Users/bernardo/projects/sherpa/backend/app/core/config.py) — add these to the settings class.

---

## Phase B2: Webhook Security — `X-Hub-Signature-256` (CRITICAL)

> [!CAUTION]
> This is the **#1 security priority**. The current codebase has ZERO webhook signature validation for the Cloud API path. Anyone can POST fake payloads to `/webhook` right now.

### B2.1 — Create signature verification middleware

**New file**: `backend/app/core/webhook_security.py`

```python
import hashlib
import hmac
from fastapi import Request, HTTPException

async def verify_meta_signature(request: Request, app_secret: str) -> bytes:
    """
    Validates X-Hub-Signature-256 header per Meta's specification.
    Returns the raw body bytes on success, raises 403 on failure.
    """
    signature_header = request.headers.get("X-Hub-Signature-256", "")
    if not signature_header.startswith("sha256="):
        raise HTTPException(status_code=403, detail="Missing signature")
    
    expected_signature = signature_header[7:]  # strip "sha256=" prefix
    body = await request.body()
    
    computed = hmac.new(
        app_secret.encode("utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(computed, expected_signature):
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    return body
```

### B2.2 — Apply to the webhook endpoint

**Edit**: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L50-L60)

Add signature verification at the top of `POST /webhook`:

```diff
+ from app.core.webhook_security import verify_meta_signature
+ 
  @router.post("/webhook")
  async def whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
+     # SECURITY: Validate Meta signature BEFORE parsing JSON
+     raw_body = await verify_meta_signature(request, settings.META_APP_SECRET)
+     payload = json.loads(raw_body)
-     payload = await request.json()
```

---

## Phase B3: Unified Cloud API Webhook Overhaul

### B3.1 — Rewrite `POST /webhook` for multi-tenant Cloud API

The current `POST /webhook` handler is incomplete (no Celery dispatch, no identity resolution, no usage gating). It needs to be brought up to parity with the Twilio webhook.

**Edit**: [whatsapp.py `POST /webhook`](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L50-L160)

Key changes:
1. ✅ Add `X-Hub-Signature-256` validation (B2)
2. ✅ Route by `phone_number_id` from metadata → match to `Integration` record
3. ✅ Add identity resolution (`IdentityResolver.resolve_sender`)
4. ✅ Add feature flag / routing config checks
5. ✅ Dispatch to Celery queues (not inline AI calls)
6. ✅ Support all message types: `text`, `image`, `document`, `audio`, `video`, `interactive`, `location`
7. ✅ Handle `statuses` entries (delivery/read receipts)
8. ✅ Return `200 OK` immediately (Meta requires this to avoid retry storms)
9. ✅ Handle `errors` entries (template rejections, etc.)

### B3.2 — Refactor Celery tasks payload format

**Edit**: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py)

Currently, all `run_*_message()` functions expect **Twilio form-data dict** format:
```python
payload.get("From", "")  # Twilio format
payload.get("To", "")
payload.get("Body", "")
payload.get("ProfileName", "")
```

Must be refactored to accept a **normalized message dict**:
```python
{
    "sender_phone": "521234567890",
    "phone_number_id": "123456789",  # replaces "To"
    "text": "Hello",
    "profile_name": "Juan",
    "message_id": "wamid.xxx",
    "message_type": "text",         # text, image, document, etc.
    "media_url": None,              # for media messages
    "platform": "whatsapp",
    "provider": "meta_cloud_api"    # or "twilio" during migration
}
```

This normalized format is created by the webhook handler before dispatching to Celery. Both the Twilio webhook and the Cloud API webhook produce the same normalized dict.

### B3.3 — Update `send_twilio_reply()` → `send_whatsapp_reply()`

**Edit**: [messages.py L20-L61](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py#L20-L61)

Rename and refactor to use `MessagingService.get_engine()` which now dynamically resolves to either `TwilioSubaccountEngine` or `MetaCloudEngine` based on the integration's `provider_type`.

```diff
- async def send_twilio_reply(db, to_phone: str, sender_phone: str, body: str):
+ async def send_whatsapp_reply(db, business_id: str, sender_phone: str, body: str):
+     """Send reply via the business's configured messaging engine (Meta or Twilio)."""
      # Look up integration by business_id instead of phone number matching
+     integration = await _get_whatsapp_integration(db, business_id)
+     engine = MessagingService.get_engine(integration)
+     await engine.send_text(to_number=sender_phone, text=body)
```

---

## Phase B4: 24-Hour Window Enforcement

> [!IMPORTANT]
> Meta **requires** that businesses only send free-form messages within 24 hours of the last user message. Outside this window, only pre-approved templates can be sent. Violating this = API errors + quality degradation.

### B4.1 — Track last user message timestamp

**Option**: Use Redis (fast, already in stack) or a DB column on Client.

```python
# Redis key: "wa:window:{business_id}:{phone_number}" = timestamp
# TTL: 86400 seconds (auto-expire = auto-cleanup)
```

### B4.2 — Gate outbound messages

Before sending any free-form text message, check if the window is open:

```python
async def is_within_service_window(business_id: str, phone: str) -> bool:
    key = f"wa:window:{business_id}:{phone}"
    last_msg = await redis.get(key)
    if not last_msg:
        return False
    return (time.time() - float(last_msg)) < 86400
```

If outside the window → must use `send_template()` instead of `send_text()`.

### B4.3 — Update window on every inbound message

In the webhook handler, after receiving any user message:
```python
await redis.setex(f"wa:window:{business_id}:{sender_phone}", 86400, str(time.time()))
```

---

## Phase B5: Embedded Signup Provisioner (Replaces Twilio Subaccounts)

### B5.1 — New provisioning endpoint

**New endpoint**: `POST /api/v1/integrations/whatsapp/connect-meta`

Replaces the current `POST /api/v1/integrations/whatsapp/provision` (Twilio flow).

```
Flow:
1. Frontend opens Facebook Login popup with WhatsApp Embedded Signup
2. Client authenticates with Meta, selects/creates WABA, verifies phone
3. Facebook returns an OAuth authorization code to the frontend
4. Frontend sends the code to this endpoint
5. Backend exchanges code for a client-scoped access token
6. Backend stores: waba_id, phone_number_id, access_token (encrypted) in Integration.settings
7. Backend subscribes to webhooks for this WABA
```

### B5.2 — New provisioner service

**New file**: `backend/app/services/messaging/meta_provisioner.py`

Replaces [provisioner.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/provisioner.py) (Twilio-specific).

```python
async def exchange_code_for_token(code: str) -> dict:
    """Exchange OAuth code from Embedded Signup for a long-lived token."""
    # GET https://graph.facebook.com/v22.0/oauth/access_token
    # ?client_id={app_id}&client_secret={app_secret}&code={code}

async def get_waba_phone_numbers(waba_id: str, token: str) -> list:
    """Fetch phone numbers registered to a WABA."""
    # GET https://graph.facebook.com/v22.0/{waba_id}/phone_numbers

async def subscribe_waba_to_app(waba_id: str, token: str) -> bool:
    """Subscribe the WABA to receive webhooks through our app."""
    # POST https://graph.facebook.com/v22.0/{waba_id}/subscribed_apps

async def provision_meta_whatsapp(db, business_id, code) -> Integration:
    """Full provisioning flow for Meta Cloud API."""
    # 1. Exchange code
    # 2. Get WABA ID and phone numbers
    # 3. Subscribe to webhooks
    # 4. Store in Integration record with provider_type="meta_cloud_api"
```

### B5.3 — Update Integration model settings schema

For Meta Cloud API integrations, `Integration.settings` will have this shape:

```json
{
    "provider_type": "meta_cloud_api",
    "waba_id": "123456789",
    "phone_number_id": "987654321",
    "phone_number": "+521234567890",
    "display_phone_number": "+52 12 3456 7890",
    "status": "connected",
    "quality_rating": "GREEN",
    "messaging_tier": "TIER_1",
    "business_name": "Client Business Name"
}
```

The `access_token` goes in `Integration.access_token` (encrypted via `encrypt_token()`).

---

## Phase B6: Frontend Changes

### B6.1 — Replace WhatsApp provisioning wizard

**Edit**: [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx)

Replace the Twilio subaccount provisioning flow with Meta's Embedded Signup:

1. Load Facebook SDK (`<script>` tag or npm package `react-facebook-login`)
2. "Connect WhatsApp" button triggers `FB.login()` with WhatsApp scopes
3. On success, send the authorization code to the new backend endpoint
4. Display connection success with the connected phone number

Update opt-in copy from:
> "cumpliendo con las políticas de **Twilio/Meta**"

To:
> "cumpliendo con las políticas de **Meta WhatsApp Business Platform**"

### B6.2 — Update Admin panel

**Edit**: [admin/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/(admin)/admin/page.tsx)

Replace the "Twilio Platform (ISV Model)" section:

```diff
- <h2>Twilio Platform (ISV Model)</h2>
- <p>Configure the master Twilio account...</p>
- <input> TWILIO_ACCOUNT_SID
- <input> TWILIO_AUTH_TOKEN  
- <input> TWILIO_WHATSAPP_NUMBER

+ <h2>Meta WhatsApp Cloud API (Tech Provider)</h2>
+ <p>Configure the Meta platform credentials for WhatsApp Business API.</p>
+ <input> META_APP_ID
+ <input> META_APP_SECRET
+ <input> META_SYSTEM_USER_TOKEN (masked)
+ <input> WHATSAPP_VERIFY_TOKEN
```

### B6.3 — Update IntegrationsPanel

**Edit**: [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx)

- Replace Twilio-specific status checks with Meta Cloud API status
- Show quality rating (GREEN/YELLOW/RED)
- Show messaging tier
- Add "Reconnect" button for token refresh
- Remove `twilio_from_number` references; use `phone_number` or `display_phone_number`

### B6.4 — Update `api.ts` types

**Edit**: [types/api.ts](file:///Users/bernardo/projects/sherpa/frontend/types/api.ts)

After all backend changes, regenerate with `npm run gen:api`.

---

## Phase B7: Cleanup & Deprecation

### B7.1 — Remove Twilio dependency

After all tenants are migrated:

1. **Delete** [twilio_engine.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/twilio_engine.py)
2. **Delete** [provisioner.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/provisioner.py) (Twilio provisioner)
3. **Remove** `twilio>=9.0.0` from [requirements.txt](file:///Users/bernardo/projects/sherpa/backend/requirements.txt)
4. **Remove** `from twilio.rest import Client` from [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py#L7)
5. **Remove** `from twilio.twiml.messaging_response import MessagingResponse` from [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L289)
6. **Remove** `from twilio.request_validator import RequestValidator` from [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L235)
7. **Delete** `POST /webhook/twilio` endpoint
8. **Delete** `GET|POST /debug/twilio` endpoint
9. **Remove** Twilio env vars from Railway: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
10. **Remove** Twilio settings from [config.py](file:///Users/bernardo/projects/sherpa/backend/app/core/config.py#L59-L63)
11. **Close Twilio account** to stop billing

### B7.2 — Remove TwiML fallback responses

**Edit**: [whatsapp.py L288-L300](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L288-L300)

The feature-gate rejection currently returns TwiML XML:
```python
from twilio.twiml.messaging_response import MessagingResponse
twiml = MessagingResponse()
twiml.message(msg_text)
return Response(content=str(twiml), media_type="text/xml")
```

Replace with a Meta Cloud API text message sent via `send_text()` (or simply don't reply — Cloud API doesn't require a synchronous response body).

### B7.3 — Update Graph API version

**Edit**: All files using `graph.facebook.com/v18.0/` → `v22.0/`

Files affected:
- [whatsapp.py L107, L137](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py#L107)
- [reminders.py L84](file:///Users/bernardo/projects/sherpa/backend/app/tasks/reminders.py#L84)

Better: Centralize the version in config:
```python
META_GRAPH_API_VERSION: str = os.getenv("META_GRAPH_API_VERSION", "v22.0")
META_GRAPH_URL: str = f"https://graph.facebook.com/{META_GRAPH_API_VERSION}"
```

---

## Phase B8: Testing & Rollout Strategy

### B8.1 — Testing checklist

| Test | What to verify |
|---|---|
| **Webhook verification** | `GET /webhook` returns `hub.challenge` correctly |
| **Signature validation** | `POST /webhook` rejects payloads with bad/missing `X-Hub-Signature-256` |
| **Inbound text** | Text message → identity resolution → Celery dispatch → AI response → outbound reply |
| **Inbound media** | Image/doc/audio → media download → S3 upload → processing |
| **Outbound template** | Send template outside 24h window → delivered successfully |
| **24h window** | Free-form message outside window → correctly blocked / falls back to template |
| **Embedded Signup** | Full onboarding flow: FB login → WABA creation → phone verification → Integration created |
| **Multi-tenant routing** | Two businesses with different numbers → messages route to correct business |
| **Rate limiting** | Usage counters increment correctly per Meta engine |
| **Status webhooks** | Delivery/read receipts logged correctly |

### B8.2 — Rollout phases

| Phase | Scope | Duration |
|---|---|---|
| **Alpha** | Internal test number only, sandbox mode | 1 week |
| **Beta** | 1–2 volunteer tenants with new Meta numbers (not migrated) | 1–2 weeks |
| **Migration Wave 1** | Migrate 5 lowest-volume tenants from Twilio | 1 week |
| **Migration Wave 2** | Migrate remaining tenants | 1–2 weeks |
| **Cleanup** | Remove Twilio code, close account | 1 day |

> [!TIP]
> During the migration period, both the Twilio webhook (`/webhook/twilio`) and the Meta webhook (`/webhook`) will be active simultaneously. The `MessagingService.get_engine()` factory handles routing to the correct engine based on each integration's `provider_type`.

---

## Implementation Priority & Effort Estimates

| Priority | Phase | Effort | Risk |
|---|---|---|---|
| 🔴 P0 | **B2**: Webhook signature verification | 2h | Security — blocks production launch |
| 🔴 P0 | **A1–A3**: Meta platform setup | 1 day | Blocks all development |
| 🟠 P1 | **B1**: MetaCloudEngine + factory update | 1 day | Core dependency for everything |
| 🟠 P1 | **B3**: Webhook overhaul + Celery refactor | 2 days | Complex, high regression risk |
| 🟡 P2 | **B4**: 24h window enforcement | 4h | Compliance requirement |
| 🟡 P2 | **B5**: Embedded Signup provisioner | 2 days | Client onboarding |
| 🟡 P2 | **B6**: Frontend changes | 1–2 days | User-facing |
| 🟢 P3 | **A4–A5**: Embedded Signup config + migrations | Variable | Per-tenant effort |
| 🟢 P3 | **A6**: Template migration | 1 day | Approval wait time |
| 🟢 P3 | **B7**: Twilio cleanup | 4h | After all migrations complete |
| 🟢 P3 | **B8**: Testing & rollout | 2–4 weeks | Staged rollout |

**Total estimated effort**: ~3–4 weeks of active development + 2–4 weeks of staged rollout.

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Template approval delays | Medium | High (blocks proactive messaging) | Submit templates early in A6, have backup generic templates |
| Number migration downtime | Low | High (tenant can't receive messages) | Migrate during off-hours, notify tenants 48h ahead |
| Quality rating drops post-migration | Medium | Medium (rate limited) | Monitor quality dashboard, maintain opt-in hygiene |
| Embedded Signup OAuth token expiry | Low | Medium (tenant disconnected) | Implement token refresh flow, alert on expiry |
| Meta API breaking changes | Low | Medium | Pin API version, subscribe to Meta changelog |
| Dual-engine bugs during migration | Medium | Medium | Extensive testing in B8, feature flag per tenant |
