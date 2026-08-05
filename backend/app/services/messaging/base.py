from abc import ABC, abstractmethod
from typing import Optional

class BaseMessagingEngine(ABC):
    @abstractmethod
    async def send_text(self, to_number: str, text: str, **kwargs) -> bool:
        """
        Send a text message.
        `to_number` is the destination phone number (e.g. +521234567890).
        """
        pass

    @abstractmethod
    async def send_media(self, to_number: str, media_url: str, caption: Optional[str] = None, **kwargs) -> bool:
        """
        Send a media message (image, pdf, etc.).
        """
        pass

    @abstractmethod
    async def register_webhook(self, webhook_url: str, **kwargs) -> bool:
        """
        Configure the webhook target URL for incoming messages.
        """
        pass

    @abstractmethod
    async def send_template(self, to_number: str, template_name: str, language: str = "es", components: list = None, **kwargs) -> bool:
        """
        Send a WhatsApp message template.
        """
        pass

    @abstractmethod
    async def mark_as_read(self, message_id: str, **kwargs) -> bool:
        """
        Mark a message as read in the provider channel.
        """
        pass
