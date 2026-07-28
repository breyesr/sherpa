# Technical Plan: Multi-Tenant Senders & Meta Coexistence Strategy

## Architectural Strategy
The objective is to replace the global platform configuration pattern with a decoupled client dispatch paradigm. To guarantee that a transition from Twilio to Meta Direct Cloud API (WhatsApp Coexistence) requires zero structural rewrites, we will implement an **Abstract Adapter Pattern** over our messaging pipelines.

+-------------------------------------------------------------+
|                      MessagingService                       |
|           (High-Level Abstract Orchestrator Layer)          |
+-------------------------------------------------------------+
|
+------------------------+------------------------+
|                                                 |
v                                                 v
+------------------+                              +------------------+
|  TwilioISVEngine |                              |  MetaCloudAPI    |
| (Current Phase)  |                              | (Future Upgrade) |
+------------------+                              +------------------+

---

## Technical Phase Roadmap

### Phase 1: Database Refactoring & Safe Token Decoupling
1. **Model Upgrades (`backend/app/models/integration.py`):**
   * Ensure that the `settings` JSONB column securely stores tenant configurations[cite: 3].
   * Example payload layout for Phase 1:
     ```json
     {
       "provider_type": "twilio_isv",
       "subaccount_sid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
       "auth_token_encrypted": "gAAAA...",
       "phone_number": "whatsapp:+521XXXXXXXXXX"
     }
     ```
2. **Abstract Client Factory Creation:**
   * Create an abstract interface `BaseMessagingEngine` inside `backend/app/services/` containing standard method footprints: `send_text`, `send_media`, and `register_webhook`.
   * Create a concrete class `TwilioISVEngine` inheriting from `BaseMessagingEngine`, moving logic away from `backend/app/core/config.py` definitions[cite: 3].

### Phase 2: Ingress Hooking & Destination-Driven Inbound Routing
1. **Webhook Refactoring (`backend/app/api/whatsapp.py`):**
   * Modify the incoming router controller to process independent data feeds. 
   * Execute an index lookup on the recipient telephone data:
     ```python
     # Pseudocode example for incoming webhook handling
     recipient_number = form_data.get("To") # e.g. "whatsapp:+521XXXXXXXXXX"
     
     stmt = select(Integration).where(
         Integration.provider == "whatsapp",
         Integration.settings["phone_number"].as_string() == recipient_number
     )
     result = await db.execute(stmt)
     integration = result.scalars().first()
     
     if not integration:
         return Response(status_code=404, content="Sender registration unmapped.")
     ```
2. **Context Passing Adjustments:**
   * Bind the resolved `business_id` from the matching integration directly into the LangGraph state machine tracking sequence[cite: 3].

### Phase 3: Token Budgeting & Protection Framework
1. **Atomic Free-Tier Verification (`backend/app/core/limiter.py`):**
   * Prior to hitting third-party engines within tasks, implement an atomic verification layer against the Redis server:
     ```python
     async def verify_and_increment_usage(redis_client, business_id: str) -> bool:
         key = f"usage:whatsapp:{business_id}"
         current_usage = await redis_client.get(key)
         if current_usage and int(current_usage) >= 200:
             return False
         await redis_client.incr(key)
         return True
     ```
2. **Safe Handoff Gating:**
   * If a customer uses up their message budget, prevent downstream workers from attempting to trigger LLM evaluation loops, maintaining predictable operating costs.

### Phase 4: Interface Abstraction for Meta Coexistence
1. **Decoupling Hook Protocols:**
   * Ensure `backend/app/tasks/messages.py` always routes calls through the abstract `MessagingService` wrapper rather than explicitly mentioning or importing any client libraries directly.
2. **Meta Coexistence Design Compliance:**
   * When shifting to direct Meta Cloud setups, we will simply drop in a secondary engine wrapper (`MetaCloudAPI`) mapping out inbound webhook triggers to match the same protocol payload formats.
   * Because incoming user actions via the native WhatsApp Business App trigger a fallback echo payload to Meta webhooks, our abstract layer will catch these events and switch `ai_enabled = False` on the conversation state[cite: 3].

---

## Validation & Quality Verification Tests
* **Multi-Tenant Routing Assertions (`backend/tests/test_webhook_routing.py`):**
  * Mock inbound webhooks from two completely separate telephone numbers.
  * Assert that each payload correctly routes to the independent databases and isolated LangGraph state tracking blocks without any cross-tenant data leaks.
* **Marginal Capping Tests:**
  * Simulate 200 consecutive messages for a sample profile.
  * Assert that the 201st request is safely blocked by the system, verifying the platform protection constraints.