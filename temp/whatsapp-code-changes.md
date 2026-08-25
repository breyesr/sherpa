# WhatsApp Coexistence — Code Changes

## Context
Sherpa is now an approved Meta Tech Provider. Before we can test the full onboarding + coexistence flow, 4 code changes are needed. Coexistence is always-on by default — no toggles.

---

## Change 1: Pre-flight Screen — "¿Ya usas WhatsApp Business?" (~30 min)

**File**: [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx)

**What**: Add a new step between the Welcome screen (step 1) and the Facebook Connect screen (step 2) that asks: "¿Ya usas WhatsApp Business?" with two options:

- **"Sí, ya tengo WhatsApp Business"** → Proceeds to Facebook connect step
- **"No, uso WhatsApp normal"** → Shows a simple 3-step migration guide:
  1. Download WhatsApp Business (free, green icon with a **B**)
  2. Transfer your chats (WhatsApp Business prompts this automatically — all messages are preserved)
  3. Come back here and connect

Includes a tip: _"Porque te permite seguir usando WhatsApp en tu celular normalmente, mientras Sherpa trabaja con tu número al mismo tiempo."_

The migration guide has a "Ya lo instalé, continuar" button that takes them to the Facebook connect step.

**Why**: A non-technical user clicking "Connect" with a personal WhatsApp number would lose their personal WhatsApp — it gets deactivated when Meta registers it for Cloud API. This screen prevents that by ensuring they migrate to WhatsApp Business App first, which enables coexistence.

**Step numbering shift**: Current steps are 1→2→3→4. New flow becomes 1→2(pre-flight)→3(connect)→4(loading)→5(success), with step 6 for the migration guide (shown only if user clicks "No").

---

## Change 2: Embedded Signup — Always Pass Coexistence Parameter (~15 min)

**File**: [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx)

**What**: Add `extras: { featureType: "coexistence" }` (or the equivalent Meta parameter) to the `FB.login()` call. No UI toggle — this is always-on.

**Current code** (line ~67-71):
```typescript
{
  config_id: configId,
  response_type: 'code',
  override_default_response_type: true
}
```

**Target code**:
```typescript
{
  config_id: configId,
  response_type: 'code',
  override_default_response_type: true,
  extras: { featureType: 'coexistence' }
}
```

**Why**: Without this, Meta's Embedded Signup assumes exclusive Cloud API control and disconnects the mobile app. With it, Meta shows the "Connect your existing WhatsApp Business app" flow with QR code pairing.

---

## Change 3: Webhook — Always Filter Echo Messages (~45 min)

**File**: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)

**What**: Messages sent by the business owner FROM the WhatsApp Business App arrive at the webhook as echo messages. Detect and skip these to prevent the AI from auto-replying to the owner's own outbound messages.

**Detection logic**: In coexistence mode, when the owner sends a message from their phone:
- The webhook payload contains `messages[].from` matching the business phone number (the number registered in the Integration)
- OR the message entry has a `statuses` array instead of a `messages` array (delivery receipts)

**Implementation**: Early in the `whatsapp_webhook` POST handler, after resolving the Integration, compare the sender's number against the integration's registered phone number. If they match → log it and return 200 without dispatching to Celery.

**Why**: Without this filter, every message the owner sends from their phone would trigger an AI response back to the customer.

---

## Change 4: Disconnect — Add Meta Deregistration (~30 min)

**File**: [integrations.py](file:///Users/bernardo/projects/sherpa/backend/app/api/integrations.py)
**Also touches**: [provisioner.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/provisioner.py)

**What**: On disconnect, call `POST /{phone_number_id}/deregister` via Meta Graph API before deleting the local DB record.

**Current behavior**: `release_whatsapp_sender()` checks for `subaccount_sid` (Twilio-only). For Meta Cloud API integrations (which have `phone_number_id` instead), it silently returns early and does nothing. The disconnect endpoint only deletes the local row.

**Implementation**: Add a Meta Cloud API branch to `release_whatsapp_sender()`:
```python
if settings_dict.get("provider_type") == "meta_cloud_api":
    phone_number_id = settings_dict.get("phone_number_id")
    if phone_number_id:
        # Call POST /{phone_number_id}/deregister
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://graph.facebook.com/{version}/{phone_number_id}/deregister",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15.0
            )
    return
```

**Why**: Without this, the number stays registered on Meta's Cloud API even after "disconnecting" in Sherpa, blocking re-registration on the mobile app or another provider.

---

## Estimated Effort

| Change | Estimate |
|--------|----------|
| 1. Pre-flight WA Business check screen | ~30 min |
| 2. Embedded Signup coexistence param | ~15 min |
| 3. Webhook echo filter | ~45 min |
| 4. Meta deregistration on disconnect | ~30 min |
| **Total** | **~2 hours** |
