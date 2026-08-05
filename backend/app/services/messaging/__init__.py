from app.models.integration import Integration
from app.services.messaging.base import BaseMessagingEngine
from app.services.messaging.twilio_engine import TwilioSubaccountEngine
from app.core.config import settings

class MessagingService:
    @staticmethod
    def get_engine(integration: Integration) -> BaseMessagingEngine:
        if not integration:
            raise ValueError("Integration record is required to resolve messaging engine")
            
        provider_type = integration.settings.get("provider_type", "twilio_subaccount")
        
        if provider_type in ("twilio_subaccount", "twilio_platform"):
            subaccount_sid = integration.settings.get("subaccount_sid") or settings.TWILIO_ACCOUNT_SID
            auth_token_encrypted = integration.settings.get("auth_token_encrypted")
            
            if not auth_token_encrypted and settings.TWILIO_AUTH_TOKEN:
                from app.core.encryption import encrypt_value
                auth_token_encrypted = encrypt_value(settings.TWILIO_AUTH_TOKEN)
                
            phone_number = integration.settings.get("phone_number") or settings.TWILIO_WHATSAPP_NUMBER
            
            if not subaccount_sid or not auth_token_encrypted or not phone_number:
                raise ValueError(
                    f"Incomplete Twilio configuration for integration {integration.id}. "
                    f"Required: subaccount_sid, auth_token, phone_number."
                )
                
            return TwilioSubaccountEngine(
                subaccount_sid=subaccount_sid,
                auth_token_encrypted=auth_token_encrypted,
                phone_number=phone_number
            )
        elif provider_type == "meta_cloud_api":
            phone_number_id = integration.settings.get("phone_number_id")
            waba_id = integration.settings.get("waba_id")
            access_token_encrypted = integration.access_token  # encrypted token in DB
            
            if not phone_number_id or not waba_id or not access_token_encrypted:
                raise ValueError(
                    f"Incomplete Meta configuration for integration {integration.id}. "
                    f"Required: phone_number_id, waba_id, access_token."
                )
                
            from app.services.messaging.meta_cloud_engine import MetaCloudEngine
            return MetaCloudEngine(
                phone_number_id=phone_number_id,
                access_token_encrypted=access_token_encrypted,
                waba_id=waba_id
            )
        else:
            raise NotImplementedError(f"Messaging provider type '{provider_type}' is not supported")
