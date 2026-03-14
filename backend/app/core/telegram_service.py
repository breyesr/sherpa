import httpx
from typing import Optional, Dict, Any
from app.core.config import settings

class TelegramService:
    @staticmethod
    async def get_bot_info(token: str) -> Optional[Dict[str, Any]]:
        """Validate token and get bot details from Telegram."""
        url = f"https://api.telegram.org/bot{token}/getMe"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        return data.get("result")
                return None
            except Exception as e:
                print(f"ERROR: Failed to connect to Telegram API: {e}")
                return None

    @staticmethod
    async def set_webhook(token: str, webhook_id: str) -> dict:
        """Register the webhook URL for a specific bot."""
        if "localhost" in settings.BASE_URL or "127.0.0.1" in settings.BASE_URL:
            print(f"DEBUG: Skipping Telegram setWebhook because BASE_URL is local: {settings.BASE_URL}")
            return {"ok": True, "local_skip": True}

        webhook_url = f"{settings.BASE_URL}{settings.API_V1_STR}/telegram/webhook/{webhook_id}"
        url = f"https://api.telegram.org/bot{token}/setWebhook"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params={"url": webhook_url})
                data = response.json()
                if response.status_code == 200:
                    return data
                return {"ok": False, "description": data.get("description", "Unknown error")}
            except Exception as e:
                print(f"ERROR: Failed to set Telegram webhook: {e}")
                return {"ok": False, "description": str(e)}

    @staticmethod
    async def send_message(token: str, chat_id: int, text: str):
        """Send a message to a specific chat."""
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        async with httpx.AsyncClient() as client:
            try:
                await client.post(url, json={"chat_id": chat_id, "text": text})
            except Exception as e:
                print(f"ERROR: Failed to send Telegram message: {e}")
