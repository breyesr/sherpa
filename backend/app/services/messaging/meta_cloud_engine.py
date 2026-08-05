import logging
import httpx
from typing import Optional, List, Dict, Any
from app.services.messaging.base import BaseMessagingEngine
from app.core.encryption import decrypt_value
from app.core.config import settings

logger = logging.getLogger(__name__)

class MetaCloudEngine(BaseMessagingEngine):
    """Direct Meta WhatsApp Cloud API engine — replaces TwilioSubaccountEngine."""
    
    def __init__(self, phone_number_id: str, access_token_encrypted: str, waba_id: str):
        self.phone_number_id = phone_number_id
        # Access token is encrypted in DB, decrypt it
        self.access_token = decrypt_value(access_token_encrypted)
        self.waba_id = waba_id
        
        # Build base URL using graph API version
        version = settings.META_GRAPH_API_VERSION or "v22.0"
        self.base_url = f"https://graph.facebook.com/{version}/{self.phone_number_id}"
        
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    async def send_text(self, to_number: str, text: str, **kwargs) -> bool:
        if not text:
            return False
            
        # Clean destination number (must not contain '+' or 'whatsapp:')
        clean_to = to_number.replace("whatsapp:", "").replace("+", "").strip()
        
        # Meta limits text messages to 4096 characters.
        # If it exceeds, we should safely chunk it.
        chunks = [text[i:i+4096] for i in range(0, len(text), 4096)]
        
        url = f"{self.base_url}/messages"
        success = True
        
        async with httpx.AsyncClient() as client:
            for chunk in chunks:
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": clean_to,
                    "type": "text",
                    "text": {"body": chunk}
                }
                try:
                    res = await client.post(url, json=payload, headers=self.headers, timeout=30.0)
                    if res.status_code >= 400:
                        logger.error(f"Meta Cloud API returned {res.status_code} on send_text: {res.text}")
                        success = False
                except Exception as e:
                    logger.exception(f"MetaCloudEngine.send_text exception: {e}")
                    success = False
                    
        return success

    async def send_media(self, to_number: str, media_url: str, caption: Optional[str] = None, **kwargs) -> bool:
        clean_to = to_number.replace("whatsapp:", "").replace("+", "").strip()
        url = f"{self.base_url}/messages"
        
        # Determine type from file extension or fallback
        media_type = "document"
        lower_url = media_url.lower()
        if any(lower_url.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            media_type = "image"
        elif any(lower_url.endswith(ext) for ext in [".mp4", ".3gp"]):
            media_type = "video"
        elif any(lower_url.endswith(ext) for ext in [".ogg", ".mp3", ".aac", ".amr"]):
            media_type = "audio"
            
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": media_type,
            media_type: {
                "link": media_url
            }
        }
        
        if caption and media_type in ["image", "document", "video"]:
            payload[media_type]["caption"] = caption

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, headers=self.headers, timeout=30.0)
                if res.status_code >= 400:
                    logger.error(f"Meta Cloud API returned {res.status_code} on send_media: {res.text}")
                    return False
                return True
        except Exception as e:
            logger.exception(f"MetaCloudEngine.send_media exception: {e}")
            return False

    async def send_template(self, to_number: str, template_name: str, language: str = "es", components: list = None, **kwargs) -> bool:
        clean_to = to_number.replace("whatsapp:", "").replace("+", "").strip()
        url = f"{self.base_url}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language
                }
            }
        }
        
        if components:
            payload["template"]["components"] = components

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, headers=self.headers, timeout=30.0)
                if res.status_code >= 400:
                    logger.error(f"Meta Cloud API returned {res.status_code} on send_template: {res.text}")
                    return False
                return True
        except Exception as e:
            logger.exception(f"MetaCloudEngine.send_template exception: {e}")
            return False

    async def mark_as_read(self, message_id: str, **kwargs) -> bool:
        url = f"{self.base_url}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        }
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, headers=self.headers, timeout=30.0)
                if res.status_code >= 400:
                    logger.error(f"Meta Cloud API returned {res.status_code} on mark_as_read: {res.text}")
                    return False
                return True
        except Exception as e:
            logger.exception(f"MetaCloudEngine.mark_as_read exception: {e}")
            return False

    async def register_webhook(self, webhook_url: str, **kwargs) -> bool:
        # Webhooks are configured at the App level on Meta, not programmatically per phone number.
        # Return True as a no-op.
        return True
