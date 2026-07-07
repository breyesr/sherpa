# Epic: Multi-Tenant Dedicated Phone Senders & Direct Ingress Overhaul

## Objective
Transition the platform away from a proxy routing setup (such as shared join-codes) to an Independent Software Vendor (ISV) model where every business tenant controls their own dedicated WhatsApp phone number. The solution must support granular multi-tenant webhook classification, provide a strict 200-message usage control layer for platform protection, and abstract core interfaces to ensure a seamless drop-in change when transitioning to the Meta Direct Cloud API (WhatsApp Coexistence) later.

## Dependencies
- Epic 2: Authentication & Business Profile (Completed)
- Epic 22: Modular "Plug & Play" Architecture (Completed)

---

## Tasks & Subtasks

### Task 1: Database Schema Expansion & Migration Strategy
*   **Description:** Adapt relational structures to stop looking at global environment configs for message dispatch and relocate configurations to per-business settings profiles.
*   **Acceptance Criteria:**
    *   Given an authenticated business profile, when an integration for 'whatsapp' is updated, then tokens, phone numbers, and subaccount variables must persist uniquely and independently.
*   **Subtasks:**
    *   [ ] Create Alembic schema migration script appending `twilio_subaccount_sid`, `twilio_auth_token`, and `assigned_sender_number` variables inside the metadata column (`settings`) of the `Integrations` model.
    *   [ ] Hardcheck model properties on the backend to encrypt sensitive tenant tokens before executing a save operation.
    *   [ ] Build verification tests asserting successful isolation across multiple tenant credential blocks.

### Task 2: Granular Inbound Routing & Destination Classification
*   **Description:** Overhaul the central Twilio ingress webhook to identify the tenant business through the recipient destination telephone mapping instead of parsing body scripts.
*   **Acceptance Criteria:**
    *   Given an inbound Twilio WhatsApp webhook payload, when the server parses the `To` parameter, then it must correctly assign the corresponding `business_id` and execute the LangGraph loop.
*   **Subtasks:**
    *   [ ] Refactor `app/api/whatsapp.py` to index inbound payloads by looking at the destination recipient sender array (`To`).
    *   [ ] Inject dynamic fallback checks to discard tracking execution loops if an integration mapping does not exist for that specific recipient number.
    *   [ ] Integrate webhook cryptographic validation utilizing Twilio signing keys customized per subaccount.

### Task 3: Usage Control Layer & Free-Tier Cap Enforcement
*   **Description:** Implement a strict free-tier limit tracking system that halts automated outbound automation loops once a business tenant reaches 200 messages, protecting platform margins.
*   **Acceptance Criteria:**
    *   Given a tenant on a trial tier, when they cross a cumulative count of 200 messages sent, then all subsequent outbound API loops must immediately fail safely without throwing internal runtime crashes.
*   **Subtasks:**
    *   [ ] Design an atomic counter ledger within Redis using keys structured as `usage:whatsapp:{business_id}`.
    *   [ ] Create a guard block logic inside the dispatch worker layer to crosscheck remaining credit volume prior to calling downstream APIs.
    *   [ ] Hook warning state dispatches to the frontend dashboard once a customer runs out of operational message capacity.

### Task 4: Integration UI Updates & Connection Management Panel
*   **Description:** Redesign dashboard connection interfaces to reflect distinct numbers instead of platform proxy configurations, preparing screens for progressive disclosure.
*   **Acceptance Criteria:**
    *   Given a customer navigating to Settings -> Integrations, when they open the WhatsApp panel, then they must see their assigned connection status, explicit usage levels, and legal compliance text.
*   **Subtasks:**
    *   [ ] Replace current setup code components inside `WhatsAppModal.tsx` with dynamic layout cards showing current deployment status.
    *   [ ] Expose a tracking indicator element rendering message consumption analytics (e.g., "145 / 200 free messages used").
    *   [ ] Retain modular separation of forms so the component can be cleanly retrofitted with a Meta login button later.