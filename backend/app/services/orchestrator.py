import json
import traceback
from typing import Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.system_config import ConfigService
from sqlalchemy.future import select
from app.models.trade import Store
from app.services.graphrag import GraphRAGService

# Setup prompt template environment
prompt_env = Environment(
    loader=FileSystemLoader("app/core/prompts"),
    autoescape=select_autoescape()
)

class B2BOrchestrator:
    def __init__(self, db: Any):
        self.db = db
        self.graphrag = GraphRAGService(db)

    async def classify_intent(self, user_message: str, history: list = None) -> Dict[str, Any]:
        """Classify the rep's message into REPORT, QUERY, SCHEDULE, or CHAT."""
        try:
            template = prompt_env.get_template("intent_classifier.j2")
            
            # Format history for context
            history_str = ""
            if history:
                history_str = "\n".join([f"{m['role']}: {m['content']}" for m in history[-5:]])

            system_prompt = template.render(
                user_message=user_message,
                history=history_str
            )

            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
            default_model = "gpt-4o-mini"
            if provider == "gemini": default_model = "gemini-1.5-flash"
            
            model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", default_model)
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Classify this message: {user_message}"}
            ]

            response = await litellm.acompletion(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=messages,
                api_key=api_key,
                response_format={"type": "json_object"},
                timeout=30.0
            )

            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            print(f"ERROR: B2BOrchestrator Intent Classification failed: {e}")
            traceback.print_exc()
            # Default to CHAT on failure to be safe
            return {"intent": "CHAT", "reasoning": "Fallback due to error"}

    async def route_message(self, business: Any, client: Any, user_message: str, history: list = None, metadata: Optional[Dict] = None, identifier: str = None) -> str:
        """
        Main entry point for routing with Topic Sensitivity. 
        Detects shifts between stores to prevent "Summary Anchoring".
        """
        # 1. Topic Shift Detection: If a new store is mentioned, clear stale summaries
        try:
            # We use the GraphRAG store identifier to see if the user is switching topics
            res = await self.db.execute(select(Store).where(Store.business_id == business.id))
            all_stores = res.scalars().all()
            
            new_store_detected = False
            for s in all_stores:
                if s.name.lower() in user_message.lower():
                    # High confidence shift detected
                    new_store_detected = True
                    break
            
            if new_store_detected and identifier:
                from app.core.memory import ChatMemory
                memory = ChatMemory()
                await memory.clear_summary(identifier)
                print(f"DEBUG ORCHESTRATOR: Topic shift detected. Cleared summary for {identifier}.")
        except Exception as te:
            print(f"WARNING: Topic shift detection failed: {te}")

        # 2. Proceed with normal classification and routing
        classification = await self.classify_intent(user_message, history)
        intent = classification.get("intent", "CHAT")
        
        print(f"DEBUG ORCHESTRATOR: Intent identified as {intent} for message: '{user_message}'")

        if intent == "REPORT":
            # Session 2 Goal: Hand off to IngestionAgent via Celery
            from app.tasks.ingestion import process_b2b_ingestion
            process_b2b_ingestion.delay(business.id, user_message)
            return "¡Entendido! Estoy analizando tu reporte y actualizando la base de datos ahora mismo. Te avisaré cuando termine."
        
        elif intent == "QUERY":
            # Session 3 Goal: Hand off to GraphRAGAgent
            return await self.graphrag.generate_brief(user_message, business.id, history=history)
            
        elif intent == "SCHEDULE":
            # Session 4 Goal: Use existing Scheduling tools
            return f"[ORCHESTRATOR] Routing to SCHEDULE pipeline. Reasoning: {classification.get('reasoning')}"
            
        else:
            # Fallback to standard chat response (Existing AIService logic)
            return f"[ORCHESTRATOR] Routing to CHAT pipeline. Reasoning: {classification.get('reasoning')}"
