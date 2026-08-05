# Meta WhatsApp Cloud API Migration Backlog Changes

We have transformed the migration plan in [meta_migration_plan.md](file:///Users/bernardo/projects/sherpa/temp/meta_migration_plan.md) into three actionable epics under the `200` series range to prevent number collisions. 

The active backlog [BACKLOG.md](file:///Users/bernardo/projects/sherpa/docs/project/BACKLOG.md) and continuity files ([HANDOFF_STATE.md](file:///Users/bernardo/projects/sherpa/docs/project/HANDOFF_STATE.md) and [HANDOFF_LOG.md](file:///Users/bernardo/projects/sherpa/docs/project/HANDOFF_LOG.md)) have been successfully updated.

---

## Epic 206: Meta WhatsApp Cloud API — Core Engine & Webhook Security (P0/P1)
**Objective**: Build the core integration engine with Meta WhatsApp Cloud API and secure incoming webhook endpoints using signature validation.
**Reference**: [meta_migration_plan.md](file:///Users/bernardo/projects/sherpa/temp/meta_migration_plan.md)

- **Task 206.1 (BE): Webhook Signature Verification Middleware (`X-Hub-Signature-256`)**
  - **Acceptance Criteria**:
    - **Given** a request to `POST /webhook` at [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py),
    - **When** the `X-Hub-Signature-256` header is missing or does not start with `sha256=`,
    - **Then** the backend must raise an HTTP 403 Forbidden exception.
    - **Given** the `X-Hub-Signature-256` header is present,
    - **When** the signature computed using HMAC-SHA256 with `META_APP_SECRET` and the raw body does not match the header,
    - **Then** the backend must raise an HTTP 403 Forbidden exception.
    - **When** the signature matches,
    - **Then** it must proceed with the request and return the raw body bytes.
  - **Files to Modify/Create**:
    - Create: `backend/app/core/webhook_security.py`
    - Edit: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)

- **Task 206.2 (BE): Meta WhatsApp Cloud API Engine**
  - **Acceptance Criteria**:
    - **Given** the abstract [BaseMessagingEngine](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/base.py),
    - **When** defining its methods,
    - **Then** add `send_template()` and `mark_as_read()` abstract methods.
    - **Given** the new `MetaCloudEngine` in `meta_cloud_engine.py`,
    - **When** instantiated with a phone number ID, encrypted access token, and WABA ID,
    - **Then** it must implement `send_text`, `send_media`, `send_template`, and `mark_as_read` utilizing `httpx.AsyncClient` targeting Graph API `v22.0`.
    - **Given** a text message body exceeds 4096 characters,
    - **When** `send_text` is called,
    - **Then** the engine must safely chunk the text or raise an appropriate validation error.
  - **Files to Modify/Create**:
    - Create: `backend/app/services/messaging/meta_cloud_engine.py`
    - Edit: [base.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/base.py)
    - Edit: [__init__.py](file:///Users/bernardo/projects/sherpa/backend/app/services/messaging/__init__.py) (factory registration)
    - Edit: [config.py](file:///Users/bernardo/projects/sherpa/backend/app/core/config.py) (add Meta environment variables)

- **Task 206.3 (BE): Webhook Overhaul & Celery Payload Normalization**
  - **Acceptance Criteria**:
    - **Given** the webhook endpoint at [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py),
    - **When** an inbound message webhook is received from Meta,
    - **Then** the endpoint must validate the signature, parse the message payload, extract sender phone and `phone_number_id`, map the `phone_number_id` to an active `Integration` to find the `business_id`, resolve the sender's identity, format the payload into a normalized dictionary, and immediately return `200 OK`.
    - **Given** a message is successfully parsed,
    - **When** dispatching to Celery tasks in [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py),
    - **Then** it must pass the normalized message structure to the queue and adapt Celery workers to use the provider-agnostic `send_whatsapp_reply` resolving the engine dynamically via `MessagingService.get_engine`.
  - **Files to Modify**:
    - Edit: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)
    - Edit: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py)


## Epic 207: Meta WhatsApp Cloud API — 24h Window & Provisioning (P1/P2)
**Objective**: Build compliance logic for the 24-hour service window and implement the Embedded Signup token-exchange provisioning flow.
**Reference**: [meta_migration_plan.md](file:///Users/bernardo/projects/sherpa/temp/meta_migration_plan.md)

- **Task 207.1 (BE): Redis-based 24-Hour Window Gating**
  - **Acceptance Criteria**:
    - **Given** an inbound message is received from a client,
    - **When** processed by the webhook,
    - **Then** set a Redis key `wa:window:{business_id}:{sender_phone}` with the current timestamp and a TTL of 86400 seconds.
    - **Given** a business is sending a free-form message via `send_text`,
    - **When** checked against Redis,
    - **Then** if the key does not exist or has expired, block the outbound text and raise a compliance exception / fall back to template sending.
  - **Files to Modify**:
    - Edit: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)
    - Edit: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py)

- **Task 207.2 (BE): Embedded Signup Provisioner & API Endpoint**
  - **Acceptance Criteria**:
    - **Given** a client has authenticated with Facebook and received an authorization code,
    - **When** calling `POST /api/v1/integrations/whatsapp/connect-meta` at [integrations.py](file:///Users/bernardo/projects/sherpa/backend/app/api/integrations.py) with the code,
    - **Then** the backend must exchange the code for a long-lived access token, retrieve the WABA ID and registered phone numbers, subscribe the WABA to receive webhooks under the App, encrypt and store the credentials in `Integration.access_token`, and save the configuration with `provider_type="meta_cloud_api"`.
  - **Files to Modify/Create**:
    - Create: `backend/app/services/messaging/meta_provisioner.py`
    - Edit: [integrations.py](file:///Users/bernardo/projects/sherpa/backend/app/api/integrations.py)


## Epic 208: Meta WhatsApp Cloud API — Frontend Integration & Twilio Deprecation (P2/P3)
**Objective**: Reconstruct the client onboarding interface, update dashboards for Meta statistics, and completely clean up Twilio code after migration.
**Reference**: [meta_migration_plan.md](file:///Users/bernardo/projects/sherpa/temp/meta_migration_plan.md)

- **Task 208.1 (FE): Embedded Signup wizard in WhatsAppModal**
  - **Acceptance Criteria**:
    - **Given** a user is on the WhatsApp connection modal at [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx),
    - **When** clicking "Connect WhatsApp",
    - **Then** initiate the Meta Embedded Signup Facebook login flow, intercept the authorization code, and POST it to `/api/v1/integrations/whatsapp/connect-meta`.
    - **When** the connection completes,
    - **Then** display a success state and the connected phone number.
  - **Files to Modify**:
    - Edit: [WhatsAppModal.tsx](file:///Users/bernardo/projects/sherpa/frontend/components/WhatsAppModal.tsx)

- **Task 208.2 (FE): Admin settings and status updates**
  - **Acceptance Criteria**:
    - **Given** an admin is viewing [admin/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/(admin)/admin/page.tsx) or [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx),
    - **When** configuring WhatsApp settings,
    - **Then** replace Twilio field configurations with Meta App ID, Secret, and System User Token input controls.
    - **When** viewing the active connection status on the settings panel,
    - **Then** show Meta-specific status details including WABA quality rating (GREEN/YELLOW/RED) and messaging tier.
  - **Files to Modify**:
    - Edit: [admin/page.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/(admin)/admin/page.tsx)
    - Edit: [IntegrationsPanel.tsx](file:///Users/bernardo/projects/sherpa/frontend/app/settings/components/IntegrationsPanel.tsx)

- **Task 208.3 (BE): Twilio Cleanup, Deprecation & Version Upgrade**
  - **Acceptance Criteria**:
    - **Given** all client migration is finished,
    - **When** deleting deprecated code,
    - **Then** completely remove `twilio_engine.py`, legacy Twilio provisioner, TwiML references in webhook rejections, and the `POST /webhook/twilio` routes.
    - **When** upgrading Graph API versions,
    - **Then** modify all Graph API references to target `v22.0` (using centralized `META_GRAPH_API_VERSION` settings).
  - **Files to Modify/Delete**:
    - Delete: `backend/app/services/messaging/twilio_engine.py`
    - Delete: `backend/app/services/messaging/provisioner.py`
    - Edit: [whatsapp.py](file:///Users/bernardo/projects/sherpa/backend/app/api/whatsapp.py)
    - Edit: [messages.py](file:///Users/bernardo/projects/sherpa/backend/app/tasks/messages.py)
    - Edit: [config.py](file:///Users/bernardo/projects/sherpa/backend/app/core/config.py)
    - Edit: `backend/requirements.txt`
