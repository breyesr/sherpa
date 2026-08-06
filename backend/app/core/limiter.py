import datetime
import logging
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize slowapi rate limiter for API routes
limiter = Limiter(key_func=get_remote_address)

def _get_redis_client():
    return redis.from_url(settings.REDIS_URL or f"redis://{settings.REDIS_HOST}:6379/0")

async def get_whatsapp_usage(business_id: str) -> int:
    """Get the current tenant's message usage count for the current calendar month."""
    try:
        redis_client = _get_redis_client()
        now = datetime.datetime.utcnow()
        key = f"usage:whatsapp:{business_id}:{now.strftime('%Y-%m')}"
        val = await redis_client.get(key)
        return int(val.decode('utf-8')) if val else 0
    except Exception as e:
        logger.warning("Failed to get WhatsApp usage from Redis (falling back to 0): %s", e)
        return 0

async def increment_whatsapp_usage(business_id: str) -> int:
    """Increment the current tenant's message usage count atomically with end-of-month TTL."""
    try:
        redis_client = _get_redis_client()
        now = datetime.datetime.utcnow()
        key = f"usage:whatsapp:{business_id}:{now.strftime('%Y-%m')}"
        
        val = await redis_client.incr(key)
        if val == 1:
            # Expire at the first day of next month
            if now.month == 12:
                next_month = datetime.datetime(now.year + 1, 1, 1)
            else:
                next_month = datetime.datetime(now.year, now.month + 1, 1)
            ttl_seconds = int((next_month - now).total_seconds())
            await redis_client.expire(key, max(ttl_seconds, 60))
        return val
    except Exception as e:
        logger.warning("Failed to increment WhatsApp usage in Redis (falling back to 1): %s", e)
        return 1

async def check_whatsapp_limit(db, business_id: str) -> bool:
    """
    Check if the business has exceeded its WhatsApp monthly usage limit.
    Returns True if allowed (within limit), False if blocked (limit exceeded).
    """
    try:
        from sqlalchemy.future import select
        from app.models.business import BusinessProfile
        
        result = await db.execute(
            select(BusinessProfile).where(BusinessProfile.id == business_id)
        )
        business = result.scalars().first()
        if not business:
            return False
            
        from app.core.constants import DEFAULT_WHATSAPP_LIMIT
        allowed_limit = DEFAULT_WHATSAPP_LIMIT + business.purchased_credits
        current_usage = await get_whatsapp_usage(business_id)
        return current_usage < allowed_limit
    except Exception as e:
        logger.warning("Failed to check WhatsApp limit (defaulting to True/allow): %s", e)
        return True

async def check_and_send_usage_alert(db, business, used: int, limit: int, threshold: str):
    """Trigger 80% and 100% usage alerts if they haven't been sent yet this month."""
    redis_client = _get_redis_client()
    now = datetime.datetime.utcnow()
    alert_sent_key = f"alert:whatsapp:{threshold}:{business.id}:{now.strftime('%Y-%m')}"
    
    already_sent = await redis_client.get(alert_sent_key)
    if already_sent:
        return
        
    await redis_client.set(alert_sent_key, "true", ex=30 * 86400)
    
    from app.core.constants import DEFAULT_FEATURES_CONFIG
    feat_cfg = (business.features_config or DEFAULT_FEATURES_CONFIG).copy()
    feat_cfg["whatsapp_usage_alert"] = {
        "threshold": threshold,
        "used": used,
        "limit": limit,
        "sent_at": now.isoformat()
    }
    business.features_config = feat_cfg
    db.add(business)
    await db.commit()
    
    if threshold == "100":
        from app.services.messaging.provisioner import alert_superadmin
        alert_superadmin(
            business_id=business.id,
            message=f"Business '{business.name}' has reached 100% of WhatsApp limit ({used}/{limit}).",
            error_details="Limit exceeded. Outbound WhatsApp messaging is now blocked."
        )
        
    from sqlalchemy.future import select
    from app.models.integration import Integration
    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == "whatsapp")
    )
    integration = result.scalars().first()
    if not integration:
        return
        
    phone_number = integration.settings.get("phone_number")
    if not phone_number:
        return
        
    if threshold == "80":
        alert_text = (
            f"Sherpa Alerta: Has consumido el {used}/{limit} (80%) de tus mensajes mensuales de WhatsApp. "
            f"Por favor considera adquirir créditos adicionales para evitar la interrupción del servicio."
        )
    else:
        alert_text = (
            f"Sherpa Alerta: Has consumido el {used}/{limit} (100%) de tus mensajes mensuales de WhatsApp. "
            f"El servicio de respuestas automáticas de IA ha sido suspendido hasta el próximo mes o hasta que adquieras más créditos."
        )
        
    try:
        from app.services.messaging import MessagingService
        engine = MessagingService.get_engine(integration)
        await increment_whatsapp_usage(business.id)
        await engine.send_text(to_number=phone_number, text=alert_text)
        logger.info(f"Sent {threshold}% usage alert WhatsApp message to {phone_number}")
    except Exception as alert_err:
        logger.error(f"Failed to send WhatsApp usage alert: {alert_err}")

async def process_usage_and_check_gate(
    db, 
    business_id: str, 
    payload: dict, 
    client_id: Optional[str]
) -> bool:
    """
    Increments monthly usage counter and checks the WhatsApp limit.
    If over limit: stores the inbound message in the database, sends 100% alerts, and returns False.
    If within limit: sends 80% alerts, and returns True.
    """
    from sqlalchemy.future import select
    from app.models.business import BusinessProfile
    from app.models.integration import Integration
    from app.models.messaging import Conversation, Message
    import re
    
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.id == business_id)
    )
    business = result.scalars().first()
    if not business:
        return False
        
    used = await increment_whatsapp_usage(business_id)
    limit = 200 + business.purchased_credits
    
    threshold_80 = int(limit * 0.8)
    if used >= threshold_80 and used < limit:
        await check_and_send_usage_alert(db, business, used, limit, threshold="80")
    elif used >= limit:
        await check_and_send_usage_alert(db, business, used, limit, threshold="100")
        
    if used > limit:
        sender_phone = payload.get("From", "")
        to_phone = payload.get("To", "")
        text = payload.get("Body", "")
        
        def clean_num(n: str): return re.sub(r"\D", "", n)
        normalized_sender = clean_num(sender_phone)
        platform = "whatsapp"
        
        if client_id:
            res = await db.execute(
                select(Conversation).where(
                    Conversation.business_id == business_id,
                    Conversation.client_id == client_id,
                    Conversation.platform == platform
                )
            )
            conv = res.scalars().first()
            if not conv:
                conv = Conversation(
                    business_id=business_id,
                    client_id=client_id,
                    platform=platform,
                    platform_chat_id=normalized_sender
                )
                db.add(conv)
                await db.flush()
                
            user_msg = Message(
                conversation_id=conv.id,
                role="user",
                content=text
            )
            db.add(user_msg)
            conv.last_message_at = datetime.datetime.utcnow()
            await db.commit()
            
        logger.warning(f"Business {business_id} has exceeded its WhatsApp limit ({used}/{limit}). Message recorded but blocked.")
        return False
        
    return True
