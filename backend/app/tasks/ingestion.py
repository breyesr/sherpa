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
    from twilio.rest import Client
    from app.core.config import settings
    
    sender_phone = payload.get("From", "")
    to_phone = payload.get("To", "")
    message_body = payload.get("Body", "")
    
    def clean_num(n: str): return re.sub(r"\D", "", n)
    normalized_sender = clean_num(sender_phone)
    
    async with SessionLocal() as db:
        qualifier = ProspectQualifier(db)
        response_text, is_completed = await qualifier.get_response(
            business_id=business_id,
            sender_phone=normalized_sender,
            user_message=message_body
        )
        
    # Send response back to Twilio via REST API
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    
    if account_sid and auth_token:
        client = Client(account_sid, auth_token)
        from_wa = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
        to_wa = sender_phone if sender_phone.startswith("whatsapp:") else f"whatsapp:{sender_phone}"
        
        # Twilio requires messages to contain body
        if response_text:
            client.messages.create(
                body=response_text,
                from_=from_wa,
                to=to_wa
            )
            print(f"DEBUG: Sent WhatsApp prospect campaign reply to {to_wa} from {from_wa}")
    else:
        print("ERROR: Twilio credentials not configured in settings. Cannot send async reply.")
        
    return {"status": "success", "is_completed": is_completed}

@celery_app.task(bind=True, name="process_whatsapp_prospect_message", max_retries=3, default_retry_delay=5)
def process_whatsapp_prospect_message(self, business_id: str, payload: dict):
    """Celery task to qualify whatsapp campaign prospects."""
    try:
        return asyncio.run(run_prospect_qualification(business_id, payload))
    except Exception as exc:
        print(f"ERROR: process_whatsapp_prospect_message failed. Retrying... {exc}")
        raise self.retry(exc=exc)
