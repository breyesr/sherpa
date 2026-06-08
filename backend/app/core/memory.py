import json
import redis.asyncio as redis
from typing import List, Dict, Optional
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

    async def get_summary(self, chat_id: str) -> Optional[str]:
        """Retrieve the current conversation summary."""
        key = f"chat_summary:{chat_id}"
        summary = await self.redis.get(key)
        return summary.decode('utf-8') if summary else None

    async def set_summary(self, chat_id: str, summary: str):
        """Store a conversation summary."""
        key = f"chat_summary:{chat_id}"
        await self.redis.set(key, summary, ex=self.ttl)

    async def add_message(self, chat_id: str, role: str, content: str):
        """Append a new message to the history."""
        key = f"chat_history:{chat_id}"
        message = json.dumps({"role": role, "content": content})
        await self.redis.lpush(key, message)
        await self.redis.ltrim(key, 0, 19) # Keep only the last 20 messages
        await self.redis.expire(key, self.ttl)

    async def clear_history(self, chat_id: str):
        """Wipe the history for a specific chat."""
        key = f"chat_history:{chat_id}"
        await self.redis.delete(key)

    async def clear_summary(self, chat_id: str):
        """Wipe the summary for a specific chat."""
        key = f"chat_summary:{chat_id}"
        await self.redis.delete(key)

    async def get_metadata(self, chat_id: str) -> Dict:
        """Retrieve session metadata (e.g., active_store_id)."""
        key = f"chat_metadata:{chat_id}"
        data = await self.redis.get(key)
        return json.loads(data.decode('utf-8')) if data else {}

    async def set_metadata(self, chat_id: str, metadata: Dict):
        """Store session metadata."""
        key = f"chat_metadata:{chat_id}"
        await self.redis.set(key, json.dumps(metadata), ex=self.ttl)

    async def update_metadata(self, chat_id: str, updates: Dict):
        """Merge updates into session metadata."""
        current = await self.get_metadata(chat_id)
        current.update(updates)
        await self.set_metadata(chat_id, current)
