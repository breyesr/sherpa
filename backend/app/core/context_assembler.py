import asyncio
import hashlib
import json
import logging
import litellm
from typing import List, Dict, Any, Optional
from app.core.memory import ChatMemory
from app.core.system_config import ConfigService

logger = logging.getLogger(__name__)

class ContextAssembler:
    def __init__(self, db: Any):
        self.db = db
        self.memory = ChatMemory()

    async def get_optimized_context(self, chat_id: str, history: List[Dict[str, str]], user_message: str) -> Dict[str, Any]:
        """
        Processes history and user message to produce a token-efficient context.
        Returns a dict with history, summary, and intent.
        Context summarization is performed asynchronously in the background.
        """
        # 1. Check for existing summary
        summary = await self.memory.get_summary(chat_id)
        
        # 2. Check if we need to summarize (e.g., history >= 12 messages / 6 turns)
        if len(history) >= 12:
            to_summarize = history[:8]
            remaining_history = history[8:]
            
            # Fire background task so user is not blocked waiting for summary LLM call
            asyncio.create_task(self._async_update_summary(chat_id, to_summarize, summary))
            
            return {
                "history": remaining_history,
                "summary": summary,
                "intent": await self._detect_intent(user_message)
            }
            
        return {
            "history": history,
            "summary": summary,
            "intent": await self._detect_intent(user_message)
        }

    async def _async_update_summary(self, chat_id: str, messages: List[Dict[str, str]], previous_summary: Optional[str]) -> None:
        """Background task to generate and cache conversation summary with hash check."""
        try:
            msg_payload = json.dumps(messages, sort_keys=True)
            msg_hash = hashlib.sha256(msg_payload.encode("utf-8")).hexdigest()[:16]
            hash_key = f"summary_hash:{chat_id}"

            # Check if this exact chunk of history was already summarized
            cached_hash = await self.memory.redis.get(hash_key)
            if cached_hash and cached_hash.decode("utf-8") == msg_hash:
                logger.debug("Summary hash match for %s, skipping regeneration.", chat_id)
                return

            new_summary = await self._generate_summary(messages, previous_summary)
            if new_summary:
                await self.memory.set_summary(chat_id, new_summary)
                await self.memory.redis.set(hash_key, msg_hash, ex=self.memory.ttl)
        except Exception as e:
            logger.error("Error in background summary update for %s: %s", chat_id, e)

    async def _generate_summary(self, messages: List[Dict[str, str]], previous_summary: Optional[str]) -> str:
        """Use a low-cost model to summarize the conversation turns."""
        provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
        api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")
        
        # Determine low-cost model based on provider
        model_name = "gpt-4o-mini"
        if provider == "gemini": model_name = "gemini-1.5-flash"
        elif provider == "anthropic": model_name = "claude-3-haiku-20240307"
        
        history_text = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        
        prompt = f"Summarize the following conversation concisely. "
        if previous_summary:
            prompt += f"Incorporate this existing summary: {previous_summary}\n\n"
        prompt += f"New turns:\n{history_text}\n\nFocus on key facts, user preferences, and pending tasks."

        try:
            response = await litellm.acompletion(
                model=f"{provider}/{model_name}" if "/" not in model_name else model_name,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key,
                max_tokens=200,
                timeout=30,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error("ERROR in context_assembler._generate_summary: %s", e)
            return previous_summary or "Conversation in progress."

    async def _detect_intent(self, message: str) -> str:
        """Classify user intent to skip complex logic if possible."""
        m = message.lower().strip()
        if m in ["hi", "hello", "hola", "hey", "buenos dias", "buenas tardes"]:
            return "greeting"
        if m in ["thanks", "thank you", "gracias", "ok", "vale", "perfecto"]:
            return "acknowledgment"
            
        return "complex"

    def prune_services(self, services: List[Any], user_message: str) -> List[Any]:
        """
        Surgical Context Injection: Only include services mentioned 
        or relevant to the user query.
        """
        if len(services) <= 3:
            return services
            
        keywords = user_message.lower().split()
        relevant = []
        for s in services:
            if any(k in s.name.lower() or k in (s.description or "").lower() for k in keywords):
                relevant.append(s)
        
        return relevant if relevant else services[:3]
