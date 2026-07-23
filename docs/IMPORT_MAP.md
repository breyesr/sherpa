# Backend Import & Dependency Map

Auto-generated reference showing internal app dependencies across backend modules.

### `backend/app/api/admin.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/api/business`
- Imports `backend/app/core/database`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/business`
- Imports `backend/app/models/dlq`
- Imports `backend/app/models/trade`
- Imports `backend/app/models/user`
- Imports `backend/app/schemas/user`
- Imports `backend/app/tasks/knowledge`

### `backend/app/api/auth.py`
- Imports `backend/app/api/business`
- Imports `backend/app/core/config`
- Imports `backend/app/core/database`
- Imports `backend/app/core/limiter`
- Imports `backend/app/models/user`
- Imports `backend/app/schemas/user`

### `backend/app/api/business.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/ai_service`
- Imports `backend/app/core/config`
- Imports `backend/app/core/database`
- Imports `backend/app/core/limiter`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/trade`
- Imports `backend/app/models/user`
- Imports `backend/app/schemas/business`
- Imports `backend/app/schemas/crm`
- Imports `backend/app/services/prospect_qualifier`

### `backend/app/api/crm.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/database`
- Imports `backend/app/core/google_calendar`
- Imports `backend/app/models/business`
- Imports `backend/app/models/calendar`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/integration`
- Imports `backend/app/models/trade`
- Imports `backend/app/models/user`
- Imports `backend/app/schemas/crm`
- Imports `backend/app/tasks/knowledge`

### `backend/app/api/data_gateway.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/database`
- Imports `backend/app/models/business`
- Imports `backend/app/models/data_gateway`
- Imports `backend/app/models/user`
- Imports `backend/app/schemas/data_gateway`
- Imports `backend/app/tasks/data_gateway`

### `backend/app/api/inbox.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/database`
- Imports `backend/app/models/business`
- Imports `backend/app/models/messaging`
- Imports `backend/app/models/user`
- Imports `backend/app/schemas/messaging`

### `backend/app/api/integrations.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/config`
- Imports `backend/app/core/database`
- Imports `backend/app/core/google_calendar`
- Imports `backend/app/core/limiter`
- Imports `backend/app/core/security`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/business`
- Imports `backend/app/models/calendar`
- Imports `backend/app/models/integration`
- Imports `backend/app/models/user`
- Imports `backend/app/services/messaging/provisioner`
- Imports `backend/app/tasks/calendar_sync`

### `backend/app/api/router.py`
- Imports `backend/app/api/admin`
- Imports `backend/app/api/auth`
- Imports `backend/app/api/business`
- Imports `backend/app/api/crm`
- Imports `backend/app/api/data_gateway`
- Imports `backend/app/api/inbox`
- Imports `backend/app/api/integrations`
- Imports `backend/app/api/services`
- Imports `backend/app/api/telegram`
- Imports `backend/app/api/trade`
- Imports `backend/app/api/whatsapp`

### `backend/app/api/services.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/database`
- Imports `backend/app/models/business`
- Imports `backend/app/models/service`
- Imports `backend/app/models/user`
- Imports `backend/app/schemas/service`

### `backend/app/api/telegram.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/api/business`
- Imports `backend/app/core/ai_service`
- Imports `backend/app/core/config`
- Imports `backend/app/core/database`
- Imports `backend/app/core/limiter`
- Imports `backend/app/core/security`
- Imports `backend/app/core/telegram_service`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/integration`
- Imports `backend/app/services/identity_resolver`
- Imports `backend/app/services/prospect_qualifier`

### `backend/app/api/trade.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/api/business`
- Imports `backend/app/core/ai_service`
- Imports `backend/app/core/database`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/trade`
- Imports `backend/app/models/user`
- Imports `backend/app/schemas/trade`
- Imports `backend/app/services/graphrag`
- Imports `backend/app/tasks/knowledge`

### `backend/app/api/whatsapp.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/api/business`
- Imports `backend/app/core/ai_service`
- Imports `backend/app/core/config`
- Imports `backend/app/core/database`
- Imports `backend/app/core/encryption`
- Imports `backend/app/core/limiter`
- Imports `backend/app/core/security`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/business`
- Imports `backend/app/models/integration`
- Imports `backend/app/services/identity_resolver`
- Imports `backend/app/tasks/messages`

### `backend/app/core/ai_service.py`
- Imports `backend/app/core/context_assembler`
- Imports `backend/app/core/google_calendar`
- Imports `backend/app/core/memory`
- Imports `backend/app/core/security`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/integration`
- Imports `backend/app/models/messaging`
- Imports `backend/app/models/service`
- Imports `backend/app/models/store`
- Imports `backend/app/models/trade`
- Imports `backend/app/services/agentic_orchestrator`

### `backend/app/core/celery_app.py`
- Imports `backend/app/core/config`

### `backend/app/core/celery_utils.py`
- Imports `backend/app/core/database`

### `backend/app/core/context_assembler.py`
- Imports `backend/app/core/memory`
- Imports `backend/app/core/system_config`

### `backend/app/core/database.py`
- Imports `backend/app/core/config`

### `backend/app/core/embeddings.py`
- Imports `backend/app/core/system_config`

### `backend/app/core/encryption.py`
- Imports `backend/app/core/config`

### `backend/app/core/google_calendar.py`
- Imports `backend/app/core/config`
- Imports `backend/app/core/security`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/integration`

### `backend/app/core/integrity.py`
- Imports `backend/app/core/database`
- Imports `backend/app/models/crm`

### `backend/app/core/limiter.py`
- Imports `backend/app/api/business`
- Imports `backend/app/core/config`
- Imports `backend/app/models/business`
- Imports `backend/app/models/integration`
- Imports `backend/app/models/messaging`
- Imports `backend/app/services/messaging`
- Imports `backend/app/services/messaging/provisioner`

### `backend/app/core/memory.py`
- Imports `backend/app/core/config`

### `backend/app/core/postal_seeder.py`
- Imports `backend/app/models/trade`

### `backend/app/core/security.py`
- Imports `backend/app/core/encryption`

### `backend/app/core/system_config.py`
- Imports `backend/app/core/security`
- Imports `backend/app/models/system`

### `backend/app/core/telegram_service.py`
- Imports `backend/app/core/config`

### `backend/app/main.py`
- Imports `backend/app/api/router`
- Imports `backend/app/core/config`
- Imports `backend/app/core/limiter`

### `backend/app/models/business.py`
- Imports `backend/app/core/database`

### `backend/app/models/calendar.py`
- Imports `backend/app/core/database`

### `backend/app/models/crm.py`
- Imports `backend/app/core/database`
- Imports `backend/app/core/security`

### `backend/app/models/data_gateway.py`
- Imports `backend/app/core/database`

### `backend/app/models/dlq.py`
- Imports `backend/app/core/database`

### `backend/app/models/integration.py`
- Imports `backend/app/core/database`

### `backend/app/models/knowledge.py`
- Imports `backend/app/core/database`

### `backend/app/models/messaging.py`
- Imports `backend/app/core/database`

### `backend/app/models/service.py`
- Imports `backend/app/core/database`

### `backend/app/models/system.py`
- Imports `backend/app/core/database`

### `backend/app/models/trade.py`
- Imports `backend/app/core/database`

### `backend/app/models/user.py`
- Imports `backend/app/core/database`

### `backend/app/schemas/crm.py`
- Imports `backend/app/schemas/service`
- Imports `backend/app/schemas/trade`

### `backend/app/schemas/messaging.py`
- Imports `backend/app/schemas/crm`

### `backend/app/schemas/trade.py`
- Imports `backend/app/models/trade`

### `backend/app/schemas/user.py`
- Imports `backend/app/models/business`

### `backend/app/services/agentic_orchestrator.py`
- Imports `backend/app/core/config`
- Imports `backend/app/core/memory`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/services/agent_state`
- Imports `backend/app/services/calendar_tools`
- Imports `backend/app/services/entity_resolver`
- Imports `backend/app/services/graphrag`
- Imports `backend/app/services/trade_tools`

### `backend/app/services/calendar_tools.py`
- Imports `backend/app/core/google_calendar`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/integration`
- Imports `backend/app/models/service`
- Imports `backend/app/models/trade`

### `backend/app/services/entity_resolver.py`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/trade`

### `backend/app/services/graphrag.py`
- Imports `backend/app/core/embeddings`
- Imports `backend/app/core/memory`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/knowledge`
- Imports `backend/app/models/trade`

### `backend/app/services/identity_resolver.py`
- Imports `backend/app/core/security`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/integration`

### `backend/app/services/ingestion.py`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/trade`
- Imports `backend/app/tasks/knowledge`

### `backend/app/services/messaging/provisioner.py`
- Imports `backend/app/core/config`
- Imports `backend/app/core/encryption`
- Imports `backend/app/models/integration`
- Imports `backend/app/services/messaging`

### `backend/app/services/messaging/twilio_engine.py`
- Imports `backend/app/core/encryption`
- Imports `backend/app/services/messaging/base`

### `backend/app/services/prospect_qualifier.py`
- Imports `backend/app/core/config`
- Imports `backend/app/core/system_config`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/messaging`
- Imports `backend/app/models/trade`

### `backend/app/services/trade_tools.py`
- Imports `backend/app/models/trade`
- Imports `backend/app/tasks/ingestion`

### `backend/app/tasks/calendar_sync.py`
- Imports `backend/app/core/celery_app`
- Imports `backend/app/core/celery_utils`
- Imports `backend/app/core/database`
- Imports `backend/app/core/google_calendar`
- Imports `backend/app/models/calendar`
- Imports `backend/app/models/integration`

### `backend/app/tasks/data_gateway.py`
- Imports `backend/app/core/celery_app`
- Imports `backend/app/core/database`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/data_gateway`
- Imports `backend/app/models/trade`
- Imports `backend/app/tasks/knowledge`

### `backend/app/tasks/ingestion.py`
- Imports `backend/app/core/celery_app`
- Imports `backend/app/core/config`
- Imports `backend/app/core/database`
- Imports `backend/app/core/limiter`
- Imports `backend/app/models/business`
- Imports `backend/app/models/integration`
- Imports `backend/app/services/ingestion`
- Imports `backend/app/services/messaging`
- Imports `backend/app/services/prospect_qualifier`

### `backend/app/tasks/knowledge.py`
- Imports `backend/app/core/celery_app`
- Imports `backend/app/core/database`
- Imports `backend/app/core/embeddings`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/dlq`
- Imports `backend/app/models/knowledge`
- Imports `backend/app/models/trade`
- Imports `backend/app/services/graphrag`

### `backend/app/tasks/messages.py`
- Imports `backend/app/core/ai_service`
- Imports `backend/app/core/celery_app`
- Imports `backend/app/core/config`
- Imports `backend/app/core/database`
- Imports `backend/app/core/limiter`
- Imports `backend/app/models/business`
- Imports `backend/app/models/integration`
- Imports `backend/app/services/messaging`
- Imports `backend/app/services/prospect_qualifier`

### `backend/app/tasks/reminders.py`
- Imports `backend/app/core/celery_app`
- Imports `backend/app/core/celery_utils`
- Imports `backend/app/core/database`
- Imports `backend/app/core/security`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/integration`

### `backend/app/tests/test_actions.py`
- Imports `backend/app/schemas/trade`

### `backend/app/tests/test_agent_boundaries.py`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/trade`
- Imports `backend/app/services/trade_tools`

### `backend/app/tests/test_agent_pruning.py`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/services/agentic_orchestrator`

### `backend/app/tests/test_b2c_catalog.py`
- Imports `backend/app/models/trade`
- Imports `backend/app/schemas/trade`

### `backend/app/tests/test_capping.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/database`
- Imports `backend/app/core/limiter`
- Imports `backend/app/main`
- Imports `backend/app/models/business`
- Imports `backend/app/models/integration`

### `backend/app/tests/test_clients.py`
- Imports `backend/app/models/crm`

### `backend/app/tests/test_delivery_zones_rag.py`
- Imports `backend/app/models/trade`
- Imports `backend/app/services/graphrag`

### `backend/app/tests/test_dynamic_objectives.py`
- Imports `backend/app/api/trade`
- Imports `backend/app/models/trade`
- Imports `backend/app/schemas/trade`
- Imports `backend/app/services/ingestion`

### `backend/app/tests/test_encryption.py`
- Imports `backend/app/core/config`
- Imports `backend/app/core/encryption`

### `backend/app/tests/test_identity_safety.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/database`
- Imports `backend/app/main`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/trade`
- Imports `backend/app/models/user`
- Imports `backend/app/services/agentic_orchestrator`
- Imports `backend/app/services/identity_resolver`

### `backend/app/tests/test_inbound_routing.py`
- Imports `backend/app/core/database`
- Imports `backend/app/main`
- Imports `backend/app/models/business`
- Imports `backend/app/models/integration`

### `backend/app/tests/test_integration_isolation.py`
- Imports `backend/app/core/encryption`
- Imports `backend/app/models/integration`
- Imports `backend/app/services/messaging`

### `backend/app/tests/test_integrations_api.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/database`
- Imports `backend/app/main`
- Imports `backend/app/models/business`
- Imports `backend/app/models/integration`
- Imports `backend/app/models/user`

### `backend/app/tests/test_knowledge_sync.py`
- Imports `backend/app/models`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/dlq`
- Imports `backend/app/models/knowledge`
- Imports `backend/app/models/trade`
- Imports `backend/app/tasks/knowledge`

### `backend/app/tests/test_messaging_service.py`
- Imports `backend/app/core/encryption`
- Imports `backend/app/models/integration`
- Imports `backend/app/services/messaging`
- Imports `backend/app/services/messaging/twilio_engine`

### `backend/app/tests/test_provisioner.py`
- Imports `backend/app/core/encryption`
- Imports `backend/app/models/integration`
- Imports `backend/app/services/messaging/provisioner`

### `backend/app/tests/test_referrals.py`
- Imports `backend/app/models/trade`
- Imports `backend/app/schemas/trade`

### `backend/app/tests/test_telegram_admin_bind.py`
- Imports `backend/app/api/auth`
- Imports `backend/app/core/database`
- Imports `backend/app/main`
- Imports `backend/app/models/business`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/integration`
- Imports `backend/app/models/user`

### `backend/app/tests/test_utility_pivot.py`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/trade`
- Imports `backend/app/services/entity_resolver`

### `backend/app/tests/test_vector_sync_fixes.py`
- Imports `backend/app/api/crm`
- Imports `backend/app/api/trade`
- Imports `backend/app/models/crm`
- Imports `backend/app/models/trade`

