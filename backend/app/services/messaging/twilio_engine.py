import logging
from typing import Optional
from twilio.rest import Client

logger = logging.getLogger(__name__)
from app.services.messaging.base import BaseMessagingEngine
from app.core.encryption import decrypt_value

class TwilioSubaccountEngine(BaseMessagingEngine):
    def __init__(self, subaccount_sid: str, auth_token_encrypted: str, phone_number: str):
        self.subaccount_sid = subaccount_sid
        self.auth_token = decrypt_value(auth_token_encrypted)
        self.phone_number = phone_number
        self.client = Client(self.subaccount_sid, self.auth_token)

    async def send_text(self, to_number: str, text: str, **kwargs) -> bool:
        try:
            from_wa = self.phone_number if self.phone_number.startswith("whatsapp:") else f"whatsapp:{self.phone_number}"
            to_wa = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
            
            import anyio
            await anyio.to_thread.run_sync(
                lambda: self.client.messages.create(
                    body=text,
                    from_=from_wa,
                    to=to_wa
                )
            )
            return True
        except Exception as e:
            logger.error("TwilioSubaccountEngine.send_text failed: %s", e)
            return False

    async def send_media(self, to_number: str, media_url: str, caption: Optional[str] = None, **kwargs) -> bool:
        try:
            from_wa = self.phone_number if self.phone_number.startswith("whatsapp:") else f"whatsapp:{self.phone_number}"
            to_wa = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
            
            import anyio
            await anyio.to_thread.run_sync(
                lambda: self.client.messages.create(
                    media_url=[media_url],
                    body=caption or "",
                    from_=from_wa,
                    to=to_wa
                )
            )
            return True
        except Exception as e:
            logger.error("TwilioSubaccountEngine.send_media failed: %s", e)
            return False

    async def register_webhook(self, webhook_url: str, **kwargs) -> bool:
        try:
            clean_number = self.phone_number.replace("whatsapp:", "").strip()
            
            import anyio
            def _update_number():
                # List incoming phone numbers matching this number
                numbers = self.client.incoming_phone_numbers.list(phone_number=clean_number)
                if not numbers:
                    formatted_number = clean_number if clean_number.startswith("+") else f"+{clean_number}"
                    numbers = self.client.incoming_phone_numbers.list(phone_number=formatted_number)
                
                if not numbers:
                    raise Exception(f"Phone number {clean_number} not found in Twilio subaccount {self.subaccount_sid}")
                
                # Update the first matching number's SMS webhook
                self.client.incoming_phone_numbers(numbers[0].sid).update(
                    sms_url=webhook_url,
                    sms_method="POST"
                )
            
            await anyio.to_thread.run_sync(_update_number)
            return True
        except Exception as e:
            logger.error("TwilioSubaccountEngine.register_webhook failed: %s", e)
            return False

    async def send_template(self, to_number: str, template_name: str, language: str = "es", components: list = None, **kwargs) -> bool:
        logger.warning("TwilioSubaccountEngine.send_template called. Falling back to plain text send.")
        return await self.send_text(to_number, f"[Template: {template_name}]", **kwargs)

    async def mark_as_read(self, message_id: str, **kwargs) -> bool:
        return True
