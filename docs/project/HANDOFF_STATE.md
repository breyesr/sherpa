# Handoff State: 2026-08-24 (WhatsApp Coexistence & Meta Tech Provider Onboarding)

## Current Branch
`feature/integrations/whatsapp-coexistence`

## Accomplishments This Session
1. **WhatsApp Tech Provider Test & Implementation Architecture**:
   - Researched Meta Cloud API v22.0 Coexistence mode capabilities, limitations, and operational rules (14-day mobile app activity requirement, QR code pairing, simultaneous WhatsApp Business App + Cloud API messaging).
   - Formulated a structured test plan in [`temp/whatsapp-test-plan.md`](file:///Users/bernardo/projects/sherpa/temp/whatsapp-test-plan.md) and code changes plan in [`temp/whatsapp-code-changes.md`](file:///Users/bernardo/projects/sherpa/temp/whatsapp-code-changes.md).
2. **Pre-flight UX & Migration Guide (`WhatsAppModal.tsx`)**:
   - Added Step 2 check: "¿Ya usas WhatsApp Business?" to prevent personal WhatsApp users from accidentally deactivating their personal chats when registering on Meta Cloud API.
   - Built a 3-step visual migration guide (Step 6) explaining how to download WhatsApp Business and transfer chats prior to connecting.
3. **Always-On Coexistence Configuration (`WhatsAppModal.tsx`)**:
   - Configured `FB.login` in the Embedded Signup launcher to pass official Meta Coexistence parameters (`setup: {}`, `featureType: 'whatsapp_business_app_onboarding'`, `sessionInfoVersion: '3'`, `coex: true`), enabling seamless mobile app + Cloud API pairing without generic SDK rejection.
4. **Webhook Echo Filter (`whatsapp.py`)**:
   - Added coexistence echo filtering inside the `POST /api/v1/whatsapp/webhook` handler.
   - Compares sender phone numbers with the registered business number / display phone number, automatically skipping Celery dispatch when messages originate from the business owner's mobile app.
5. **Meta Cloud API Deregistration on Disconnect (`provisioner.py` & `integrations.py`)**:
   - Updated `release_whatsapp_sender` to call `POST https://graph.facebook.com/{version}/{phone_number_id}/deregister` using decrypted access tokens or platform system user tokens upon disconnecting the integration.

## Next Steps
1. **Execute Test Plan**:
   - Release the test number from Xerpa / Meta Business Manager.
   - Run **Test 1** (Standard Onboarding via Embedded Signup) as outlined in [`temp/whatsapp-test-plan.md`](file:///Users/bernardo/projects/sherpa/temp/whatsapp-test-plan.md).
   - Run **Test 2** (Coexistence Mode) validating simultaneous mobile app messaging and automated AI responses without echo loops.
   - Validate clean unbinding via the disconnect button.
2. **Staging / Production Merge Protocol**:
   - Once testing is verified by the user, request explicit user permission before merging `feature/integrations/whatsapp-coexistence` into `staging`.
