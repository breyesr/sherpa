import json
import redis.asyncio as redis
from typing import List, Dict
from app.core.config import settings

class ChatMemory:
    def __init__(self, ttl: int = 3600): # Default 1 hour memory
        self.redis = redis.from_url(settings.REDIS_URL or f"redis://{settings.REDIS_HOST}:6379/0")
        self.ttl = ttl

    async def get_history(self, chat_id: str, limit: int = 10) -> List[Dict[str, str]]:
        """Retrieve the last N messages for a chat_id."""
        key = f"chat_history:{chat_id}"
        history = await self.redis.lrange(key, 0, limit - 1)
        # Redis stores bytes, so we decode and parse JSON
        return [json.loads(m.decode('utf-8')) for m in reversed(history)]

    async def add_message(self, chat_id: str, role: str, content: str):
        """Append a new message to the history."""
        key = f"chat_history:{chat_id}"
        message = json.dumps({"role": role, "content": content})
        await self.redis.lpush(key, message)
        await self.redis.ltrim(key, 0, 19) # Keep only the last 20 messages
        await self.redis.expire(key, self.ttl)

    async def clear_history(self, chat_id: str):
        """Wipe the memory for a specific chat."""
        key = f"chat_history:{chat_id}"
        await self.redis.delete(key)
