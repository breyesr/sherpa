import asyncio
import re
from typing import Optional
from twilio.rest import Client
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.config import settings
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.business import BusinessProfile
import traceback

def clean_num(n: str): 
    return re.sub(r"\D", "", n)

def send_twilio_reply(to_phone: str, sender_phone: str, body: str):
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    if not account_sid or not auth_token:
        print("ERROR: Twilio credentials not configured in settings. Cannot send async reply.")
        return
        
    client = Client(account_sid, auth_token)
    from_wa = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
    to_wa = sender_phone if sender_phone.startswith("whatsapp:") else f"whatsapp:{sender_phone}"
    
    if body:
        client.messages.create(
            body=body,
            from_=from_wa,
            to=to_wa
        )
        print(f"DEBUG: Sent WhatsApp reply to {to_wa} from {from_wa}")

async def run_sales_rep_message(business_id: str, client_id: str, payload: dict):
    from app.core.ai_service import AIService
    
    sender_phone = clean_num(payload.get("From", ""))
    to_phone = clean_num(payload.get("To", ""))
    text = payload.get("Body", "")
    profile_name = payload.get("ProfileName", "")
    
    async with SessionLocal() as db:
        result = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == business_id)
            .options(selectinload(BusinessProfile.agents))
        )
        business = result.scalars().first()
        
        if not business:
            return
            
        ai = AIService(business, db)
        try:
            # Sales rep flow
            response_text = await ai.get_response(sender_phone, text, {"platform": "whatsapp", "name": profile_name, "flow": "sales_rep", "client_id": client_id})
        except Exception as e:
            print(f"ERROR: AIService crash in sales rep flow: {e}")
            traceback.print_exc()
            response_text = "Error interno procesando mensaje de representante."
            
    send_twilio_reply(to_phone, sender_phone, response_text)

async def run_distributor_message(business_id: str, client_id: str, payload: dict):
    from app.core.ai_service import AIService
    
    sender_phone = clean_num(payload.get("From", ""))
    to_phone = clean_num(payload.get("To", ""))
    text = payload.get("Body", "")
    profile_name = payload.get("ProfileName", "")
    
    async with SessionLocal() as db:
        result = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == business_id)
            .options(selectinload(BusinessProfile.agents))
        )
        business = result.scalars().first()
        
        if not business:
            return
            
        ai = AIService(business, db)
        try:
            # Distributor flow
            response_text = await ai.get_response(sender_phone, text, {"platform": "whatsapp", "name": profile_name, "flow": "distributor", "client_id": client_id})
        except Exception as e:
            print(f"ERROR: AIService crash in distributor flow: {e}")
            traceback.print_exc()
            response_text = "Error interno procesando mensaje de distribuidor."
            
    send_twilio_reply(to_phone, sender_phone, response_text)

async def run_prospect_message(business_id: str, client_id: Optional[str], payload: dict):
    from app.services.prospect_qualifier import ProspectQualifier
    
    sender_phone = clean_num(payload.get("From", ""))
    to_phone = payload.get("To", "")
    text = payload.get("Body", "")
    
    async with SessionLocal() as db:
        qualifier = ProspectQualifier(db)
        try:
            response_text, is_completed = await qualifier.get_response(
                business_id=business_id,
                sender_phone=sender_phone,
                user_message=text
            )
        except Exception as e:
            print(f"ERROR: ProspectQualifier crash: {e}")
            traceback.print_exc()
            response_text = "Error interno procesando mensaje de prospecto."
            
    send_twilio_reply(to_phone, sender_phone, response_text)

@celery_app.task(bind=True, name="process_sales_rep_message", max_retries=3, default_retry_delay=5)
def process_sales_rep_message(self, business_id: str, client_id: str, payload: dict):
    try:
        return asyncio.run(run_sales_rep_message(business_id, client_id, payload))
    except Exception as exc:
        print(f"ERROR: process_sales_rep_message failed. Retrying... {exc}")
        raise self.retry(exc=exc)

@celery_app.task(bind=True, name="process_distributor_message", max_retries=3, default_retry_delay=5)
def process_distributor_message(self, business_id: str, client_id: str, payload: dict):
    try:
        return asyncio.run(run_distributor_message(business_id, client_id, payload))
    except Exception as exc:
        print(f"ERROR: process_distributor_message failed. Retrying... {exc}")
        raise self.retry(exc=exc)

@celery_app.task(bind=True, name="process_prospect_message", max_retries=3, default_retry_delay=5)
def process_prospect_message(self, business_id: str, client_id: Optional[str], payload: dict):
    try:
        return asyncio.run(run_prospect_message(business_id, client_id, payload))
    except Exception as exc:
        print(f"ERROR: process_prospect_message failed. Retrying... {exc}")
        raise self.retry(exc=exc)
