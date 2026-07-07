import os
import json
import asyncio
import logging
from typing import Optional, Tuple
from twilio.rest import Client
from sqlalchemy.future import select
from app.models.integration import Integration
from app.core.config import settings
from app.core.encryption import encrypt_value

logger = logging.getLogger(__name__)

def alert_superadmin(business_id: str, message: str, error_details: Optional[str] = None):
    # Log to console
    logger.critical(f"SUPERADMIN ALERT: Business {business_id} - {message}. Details: {error_details}")
    # Write to logs/notifications.log
    try:
        os.makedirs("logs", exist_ok=True)
        payload = {
            "type": "SUPERADMIN_ALERT",
            "business_id": business_id,
            "message": message,
            "error_details": error_details or ""
        }
        with open("logs/notifications.log", "a") as f:
            f.write(json.dumps(payload) + "\n")
    except Exception as log_err:
        logger.error(f"Failed to write superadmin alert log: {log_err}")

async def create_twilio_subaccount(friendly_name: str) -> Tuple[str, str]:
    """
    Creates a new Twilio subaccount using the platform master credentials.
    Returns (subaccount_sid, subaccount_auth_token).
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        raise ValueError("Master Twilio credentials are not configured in platform settings.")
        
    master_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    
    import anyio
    def _create():
        subaccount = master_client.api.v2010.accounts.create(friendly_name=friendly_name)
        return subaccount.sid, subaccount.auth_token
        
    return await anyio.to_thread.run_sync(_create)

async def buy_mexican_number(subaccount_sid: str, subaccount_auth_token: str, area_code: Optional[str] = None) -> str:
    """
    Searches for and purchases a Mexican (+52) phone number in the subaccount.
    Returns the purchased phone number.
    """
    sub_client = Client(subaccount_sid, subaccount_auth_token)
    
    import anyio
    def _search_and_buy():
        # Search available local numbers in Mexico (MX)
        params = {"limit": 1}
        if area_code:
            params["area_code"] = area_code
            
        available = sub_client.available_phone_numbers("MX").local.list(**params)
        
        # If no numbers found with area_code, try without area_code
        if not available and area_code:
            logger.info(f"No Mexican numbers found with area code {area_code}, falling back to any available MX number")
            available = sub_client.available_phone_numbers("MX").local.list(limit=1)
            
        if not available:
            raise Exception("No available phone numbers found in Mexico (MX)")
            
        number = available[0]
        # Purchase the number
        purchased = sub_client.incoming_phone_numbers.create(phone_number=number.phone_number)
        return purchased.phone_number
        
    return await anyio.to_thread.run_sync(_search_and_buy)

async def provision_whatsapp_sender(
    db, 
    business_id: str, 
    friendly_name: str, 
    area_code: Optional[str] = None
) -> Integration:
    """
    Automates the provisioning of a Twilio subaccount and purchasing a Mexican phone number.
    Uses exponential backoff retry (3 attempts) for the Twilio operations.
    """
    # 1. Check if integration already exists for this business
    result = await db.execute(
        select(Integration).where(Integration.business_id == business_id, Integration.provider == "whatsapp")
    )
    integration = result.scalars().first()
    
    if not integration:
        # Create a placeholder integration record in pending state
        integration = Integration(
            business_id=business_id,
            provider="whatsapp",
            settings={"status": "pending_provisioning", "provider_type": "twilio_subaccount"}
        )
        db.add(integration)
        await db.commit()
        await db.refresh(integration)

    # Define the provisioning steps as a single async function for retries
    async def _provision_flow():
        # Step A: Create Twilio Subaccount
        logger.info(f"Step A: Creating Twilio Subaccount for business {business_id}")
        sub_sid, sub_token = await create_twilio_subaccount(friendly_name)
        
        # Step B: Buy Phone Number
        logger.info(f"Step B: Purchasing MX Phone Number for subaccount {sub_sid}")
        phone_number = await buy_mexican_number(sub_sid, sub_token, area_code)
        
        return sub_sid, sub_token, phone_number

    # Retry wrapper with exponential backoff (3 attempts: 1s, 2s, 4s delay)
    max_attempts = 3
    delay = 1.0
    backoff_factor = 2.0
    
    sub_sid, sub_token, phone_number = None, None, None
    provisioning_error = None
    
    for attempt in range(1, max_attempts + 1):
        try:
            sub_sid, sub_token, phone_number = await _provision_flow()
            break
        except Exception as e:
            logger.warning(f"Provisioning attempt {attempt} failed: {e}")
            provisioning_error = str(e)
            if attempt < max_attempts:
                await asyncio.sleep(delay)
                delay *= backoff_factor
            else:
                # All attempts failed
                logger.error("All WhatsApp provisioning attempts failed.")

    if sub_sid and sub_token and phone_number:
        # Success: configure and activate integration
        encrypted_token = encrypt_value(sub_token)
        
        integration.settings = {
            "status": "connected",
            "provider_type": "twilio_subaccount",
            "subaccount_sid": sub_sid,
            "auth_token_encrypted": encrypted_token,
            "phone_number": phone_number,
            "twilio_from_number": phone_number.replace("whatsapp:", "").strip()
        }
        await db.commit()
        await db.refresh(integration)
        logger.info(f"WhatsApp integration provisioned successfully for business {business_id}: {phone_number}")
        
        # Step C: Register webhook URL
        webhook_url = f"{settings.BASE_URL}/api/v1/whatsapp/webhook/twilio"
        try:
            from app.services.messaging import MessagingService
            engine = MessagingService.get_engine(integration)
            await engine.register_webhook(webhook_url)
        except Exception as webhook_err:
            logger.error(f"Failed to register webhook after successful provisioning: {webhook_err}")
            
        return integration
    else:
        # Failure: mark integration as error and alert Superadmin
        integration.settings = {
            "status": "error",
            "provider_type": "twilio_subaccount",
            "error_message": provisioning_error or "Provisioning failed after multiple attempts."
        }
        await db.commit()
        
        # Alert Superadmin
        alert_superadmin(
            business_id=business_id,
            message="Automated WhatsApp subaccount provisioning failed.",
            error_details=provisioning_error
        )
        raise Exception(f"WhatsApp provisioning failed: {provisioning_error}")
