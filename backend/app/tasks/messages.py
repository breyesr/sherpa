import logging
import asyncio
import re

logger = logging.getLogger(__name__)
from typing import Optional
from twilio.rest import Client
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.idempotency import idempotent_task
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.business import BusinessProfile
import traceback

def clean_num(n: str): 
    return re.sub(r"\D", "", n)

async def send_twilio_reply(db, to_phone: str, sender_phone: str, body: str):
    if not body:
        return
        
    from app.models.integration import Integration
    clean_to = clean_num(to_phone)
    
    # 1. Find integration by phone number
    result = await db.execute(
        select(Integration).where(Integration.provider == "whatsapp")
    )
    all_wa = result.scalars().all()
    
    integration = None
    for i in all_wa:
        int_phone = i.settings.get("phone_number", "") or i.settings.get("twilio_from_number", "")
        if int_phone:
            int_clean = re.sub(r"\D", "", int_phone)
            if int_clean == clean_to:
                integration = i
                break
                
    # Sandbox Fallback for local testing / platform config
    if not integration:
        master_number_raw = settings.TWILIO_WHATSAPP_NUMBER
        master_number = clean_num(master_number_raw or "")
        if clean_to == master_number and all_wa:
            integration = all_wa[0]
            
    if not integration:
        logger.error("send_twilio_reply failed. No integration found for number: %s", to_phone)
        return
        
    try:
        from app.services.messaging import MessagingService
        from app.core.limiter import increment_whatsapp_usage
        engine = MessagingService.get_engine(integration)
        await engine.send_text(to_number=sender_phone, text=body)
        await increment_whatsapp_usage(integration.business_id)
        logger.debug("Sent WhatsApp reply to %s via MessagingService", sender_phone)
    except Exception as e:
        logger.exception("Failed to send reply via MessagingService: %s", e)



async def run_sales_rep_message(business_id: str, client_id: str, payload: dict):
    from app.core.ai_service import AIService
    
    sender_phone = clean_num(payload.get("From", ""))
    to_phone = clean_num(payload.get("To", ""))
    text = payload.get("Body", "")
    profile_name = payload.get("ProfileName", "")
    
    async with SessionLocal() as db:
        from app.core.limiter import process_usage_and_check_gate
        allowed = await process_usage_and_check_gate(db, business_id, payload, client_id)
        if not allowed:
            return

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
            logger.exception("AIService crash in sales rep flow: %s", e)
            response_text = "Error interno procesando mensaje de representante."
            
        await send_twilio_reply(db, to_phone, sender_phone, response_text)

async def run_distributor_message(business_id: str, client_id: str, payload: dict):
    from app.core.ai_service import AIService
    
    sender_phone = clean_num(payload.get("From", ""))
    to_phone = clean_num(payload.get("To", ""))
    text = payload.get("Body", "")
    profile_name = payload.get("ProfileName", "")
    
    async with SessionLocal() as db:
        from app.core.limiter import process_usage_and_check_gate
        allowed = await process_usage_and_check_gate(db, business_id, payload, client_id)
        if not allowed:
            return

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
            logger.exception("AIService crash in distributor flow: %s", e)
            response_text = "Error interno procesando mensaje de distribuidor."
            
        await send_twilio_reply(db, to_phone, sender_phone, response_text)

async def run_prospect_message(business_id: str, client_id: Optional[str], payload: dict):
    from app.services.prospect_qualifier import ProspectQualifier
    
    sender_phone = clean_num(payload.get("From", ""))
    to_phone = payload.get("To", "")
    text = payload.get("Body", "")
    
    async with SessionLocal() as db:
        from app.core.limiter import process_usage_and_check_gate
        allowed = await process_usage_and_check_gate(db, business_id, payload, client_id)
        if not allowed:
            return

        qualifier = ProspectQualifier(db)
        try:
            response_text, is_completed = await qualifier.get_response(
                business_id=business_id,
                sender_phone=sender_phone,
                user_message=text
            )
        except Exception as e:
            logger.exception("ProspectQualifier crash: %s", e)
            response_text = "Error interno procesando mensaje de prospecto."
            
        await send_twilio_reply(db, to_phone, sender_phone, response_text)

@celery_app.task(bind=True, name="process_sales_rep_message", max_retries=3, default_retry_delay=5)
@idempotent_task(ttl=1800)
def process_sales_rep_message(self, business_id: str, client_id: str, payload: dict):
    try:
        return asyncio.run(run_sales_rep_message(business_id, client_id, payload))
    except Exception as exc:
        logger.error("process_sales_rep_message failed. Retrying... %s", exc)
        raise self.retry(exc=exc)

@celery_app.task(bind=True, name="process_distributor_message", max_retries=3, default_retry_delay=5)
@idempotent_task(ttl=1800)
def process_distributor_message(self, business_id: str, client_id: str, payload: dict):
    try:
        return asyncio.run(run_distributor_message(business_id, client_id, payload))
    except Exception as exc:
        logger.error("process_distributor_message failed. Retrying... %s", exc)
        raise self.retry(exc=exc)

@celery_app.task(bind=True, name="process_prospect_message", max_retries=3, default_retry_delay=5)
@idempotent_task(ttl=1800)
def process_prospect_message(self, business_id: str, client_id: Optional[str], payload: dict):
    try:
        return asyncio.run(run_prospect_message(business_id, client_id, payload))
    except Exception as exc:
        logger.error("process_prospect_message failed. Retrying... %s", exc)
        raise self.retry(exc=exc)

async def run_customer_message(business_id: str, client_id: Optional[str], payload: dict):
    from app.core.ai_service import AIService
    
    sender_phone = clean_num(payload.get("From", ""))
    to_phone = clean_num(payload.get("To", ""))
    text = payload.get("Body", "")
    profile_name = payload.get("ProfileName", "")
    
    async with SessionLocal() as db:
        from app.core.limiter import process_usage_and_check_gate
        allowed = await process_usage_and_check_gate(db, business_id, payload, client_id)
        if not allowed:
            return

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
            # Customer flow (handles scheduling and product/service questions)
            response_text = await ai.get_response(
                sender_phone, 
                text, 
                {"platform": "whatsapp", "name": profile_name, "flow": "customer", "client_id": client_id}
            )
        except Exception as e:
            logger.exception("AIService crash in customer flow: %s", e)
            response_text = "Error interno procesando mensaje de cliente."
            
        await send_twilio_reply(db, to_phone, sender_phone, response_text)


@celery_app.task(bind=True, name="process_customer_message", max_retries=3, default_retry_delay=5)
@idempotent_task(ttl=1800)
def process_customer_message(self, business_id: str, client_id: Optional[str], payload: dict):
    try:
        return asyncio.run(run_customer_message(business_id, client_id, payload))
    except Exception as exc:
        logger.error("process_customer_message failed. Retrying... %s", exc)
        raise self.retry(exc=exc)
