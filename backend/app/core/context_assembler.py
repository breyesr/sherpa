import json
import litellm
from typing import List, Dict, Any, Optional
from app.core.memory import ChatMemory
from app.core.system_config import ConfigService

class ContextAssembler:
    def __init__(self, db: Any):
        self.db = db
        self.memory = ChatMemory()

    async def get_optimized_context(self, chat_id: str, history: List[Dict[str, str]], user_message: str) -> Dict[str, Any]:
        """
        Processes history and user message to produce a token-efficient context.
        Returns a dict with history, summary, and intent.
        """
        # 1. Check for existing summary
        summary = await self.memory.get_summary(chat_id)
        
        # 2. Check if we need to summarize (e.g., history > 10 messages)
        if len(history) >= 12: # 6 turns
            # Summarize the oldest messages (first 8)
            to_summarize = history[:8]
            remaining_history = history[8:]
            
            new_summary = await self._generate_summary(to_summarize, summary)
            await self.memory.set_summary(chat_id, new_summary)
            
            return {
                "history": remaining_history,
                "summary": new_summary,
                "intent": await self._detect_intent(user_message)
            }
            
        return {
            "history": history,
            "summary": summary,
            "intent": await self._detect_intent(user_message)
        }

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
                max_tokens=200
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR in context_assembler._generate_summary: {e}")
            return previous_summary or "Conversation in progress."

    async def _detect_intent(self, message: str) -> str:
        """Classify user intent to skip complex logic if possible."""
        # Simple keyword matching for common "noise" intents
        m = message.lower().strip()
        if m in ["hi", "hello", "hola", "hey", "buenos dias", "buenas tardes"]:
            return "greeting"
        if m in ["thanks", "thank you", "gracias", "ok", "vale", "perfecto"]:
            return "acknowledgment"
            
        # Optional: Add a very fast LLM call for complex intent detection
        return "complex"

    def prune_services(self, services: List[Any], user_message: str) -> List[Any]:
        """
        Surgical Context Injection: Only include services mentioned 
        or relevant to the user query.
        """
        if len(services) <= 3:
            return services # Don't prune if catalog is small
            
        # Simple keyword matching for now
        keywords = user_message.lower().split()
        relevant = []
        for s in services:
            if any(k in s.name.lower() or k in (s.description or "").lower() for k in keywords):
                relevant.append(s)
        
        # If no match, return top 3 default services
        return relevant if relevant else services[:3]
