from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.ingestion import IngestionAgent
from app.models.business import BusinessProfile
from sqlalchemy.future import select
import asyncio
import re

async def run_ingestion(business_id: str, user_message: str):
    async with SessionLocal() as db:
        agent = IngestionAgent(db)
        result = await agent.process_report(business_id, user_message)
        
        # TODO: Send confirmation message back to WhatsApp/Telegram
        print(f"DEBUG INGESTION TASK RESULT: {result}")
        return result

@celery_app.task(bind=True, name="process_b2b_ingestion", max_retries=3, default_retry_delay=5)
def process_b2b_ingestion(self, business_id: str, user_message: str):
    """Celery task to handle B2B intelligence ingestion."""
    try:
        return asyncio.run(run_ingestion(business_id, user_message))
    except Exception as exc:
        print(f"ERROR: process_b2b_ingestion failed. Retrying... {exc}")
        raise self.retry(exc=exc)

async def run_prospect_qualification(business_id: str, payload: dict):
    from app.services.prospect_qualifier import ProspectQualifier
    from app.services.messaging import MessagingService
    from app.models.integration import Integration
    from app.core.config import settings
    
    sender_phone = payload.get("From", "")
    to_phone = payload.get("To", "")
    message_body = payload.get("Body", "")
    
    def clean_num(n: str): return re.sub(r"\D", "", n)
    normalized_sender = clean_num(sender_phone)
    normalized_to = clean_num(to_phone)
    
    async with SessionLocal() as db:
        from app.core.limiter import process_usage_and_check_gate
        allowed = await process_usage_and_check_gate(db, business_id, payload, client_id=None)
        if not allowed:
            return {"status": "capped_blocked", "is_completed": False}

        # Resolve Integration
        result = await db.execute(
            select(Integration)
            .where(Integration.business_id == business_id, Integration.provider == "whatsapp")
        )
        integration = result.scalars().first()
        
        qualifier = ProspectQualifier(db)
        response_text, is_completed = await qualifier.get_response(
            business_id=business_id,
            sender_phone=normalized_sender,
            user_message=message_body
        )
        
        if not integration:
            # Fallback to general lookup or platform config
            result = await db.execute(select(Integration).where(Integration.provider == "whatsapp"))
            all_wa = result.scalars().all()
            for i in all_wa:
                int_phone = i.settings.get("phone_number", "") or i.settings.get("twilio_from_number", "")
                if int_phone:
                    int_clean = clean_num(int_phone)
                    if int_clean == normalized_to:
                        integration = i
                        break
            if not integration and all_wa:
                integration = all_wa[0]
                
        if integration and response_text:
            try:
                engine = MessagingService.get_engine(integration)
                await engine.send_text(to_number=sender_phone, text=response_text)
                from app.core.limiter import increment_whatsapp_usage
                await increment_whatsapp_usage(integration.business_id)
                print(f"DEBUG: Sent WhatsApp prospect campaign reply to {sender_phone} via MessagingService")
            except Exception as e:
                print(f"ERROR: Failed to send prospect reply via MessagingService: {e}")
        else:
            print("ERROR: Integration or response text not available. Cannot send async reply.")

            
    return {"status": "success", "is_completed": is_completed}


@celery_app.task(bind=True, name="process_whatsapp_prospect_message", max_retries=3, default_retry_delay=5)
def process_whatsapp_prospect_message(self, business_id: str, payload: dict):
    """Celery task to qualify whatsapp campaign prospects."""
    try:
        return asyncio.run(run_prospect_qualification(business_id, payload))
    except Exception as exc:
        print(f"ERROR: process_whatsapp_prospect_message failed. Retrying... {exc}")
        raise self.retry(exc=exc)
