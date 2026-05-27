import json
import traceback
from typing import Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.system_config import ConfigService

# Setup prompt template environment
prompt_env = Environment(
    loader=FileSystemLoader("app/core/prompts"),
    autoescape=select_autoescape()
)

class B2BOrchestrator:
    def __init__(self, db: Any):
        self.db = db

    async def classify_intent(self, user_message: str) -> Dict[str, Any]:
        """Classify the rep's message into REPORT, QUERY, SCHEDULE, or CHAT."""
        try:
            template = prompt_env.get_template("intent_classifier.j2")
            system_prompt = template.render(user_message=user_message)

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

    async def route_message(self, business: Any, client: Any, user_message: str, metadata: Optional[Dict] = None) -> str:
        """
        Main entry point for routing. 
        In Session 2, we focus on classification and the REPORT ingestion.
        """
        classification = await self.classify_intent(user_message)
        intent = classification.get("intent", "CHAT")
        
        print(f"DEBUG ORCHESTRATOR: Intent identified as {intent} for message: '{user_message}'")

        if intent == "REPORT":
            # Session 2 Goal: Hand off to IngestionAgent via Celery
            from app.tasks.ingestion import process_b2b_ingestion
            process_b2b_ingestion.delay(business.id, user_message)
            return "¡Entendido, Marco! Estoy analizando tu reporte y actualizando la base de datos ahora mismo. Te avisaré cuando termine."
        
        elif intent == "QUERY":
            # Session 3 Goal: Hand off to GraphRAGAgent
            return f"[ORCHESTRATOR] Routing to QUERY pipeline. Reasoning: {classification.get('reasoning')}"
            
        elif intent == "SCHEDULE":
            # Session 4 Goal: Use existing Scheduling tools
            return f"[ORCHESTRATOR] Routing to SCHEDULE pipeline. Reasoning: {classification.get('reasoning')}"
            
        else:
            # Fallback to standard chat response (Existing AIService logic)
            return f"[ORCHESTRATOR] Routing to CHAT pipeline. Reasoning: {classification.get('reasoning')}"
