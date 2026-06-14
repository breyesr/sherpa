import json
import traceback
import unicodedata
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

    def _normalize_str(self, text: str) -> str:
        """Remove accents and normalize string for comparison."""
        if not text: return ""
        # Normalize to NFKD and remove non-spacing mark (accents)
        normalized = unicodedata.normalize('NFKD', text)
        return "".join([c for c in normalized if not unicodedata.combining(c)]).lower().strip()

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
        Detects shifts between stores/contacts to prevent "Summary Anchoring".
        """
        # 1. Topic Shift Detection: Resolve Store/Contact from message
        try:
            from app.models.crm import Client
            from app.models.trade import store_clients
            
            # Fetch names of all stores and contacts for this business
            res_stores = await self.db.execute(select(Store).where(Store.business_id == business.id))
            stores = res_stores.scalars().all()
            
            res_contacts = await self.db.execute(select(Client).where(Client.business_id == business.id))
            contacts = res_contacts.scalars().all()
            
            msg_norm = self._normalize_str(user_message)
            detected_store_id = None
            
            # Check Store Names
            for s in stores:
                if self._normalize_str(s.name) in msg_norm:
                    detected_store_id = s.id
                    break
            
            # Check Contact Names (Resolve to store)
            if not detected_store_id:
                for c in contacts:
                    if self._normalize_str(c.name) in msg_norm:
                        # Find store linked to this contact
                        res_link = await self.db.execute(
                            select(store_clients.c.store_id).where(store_clients.c.client_id == c.id)
                        )
                        detected_store_id = res_link.scalars().first()
                        break
            
            # 2. Store-Locking Logic
            if detected_store_id and identifier:
                from app.core.memory import ChatMemory
                memory = ChatMemory()
                
                # Use metadata for stateful tracking (Task 109.1)
                metadata_session = await memory.get_metadata(identifier)
                current_locked_id = metadata_session.get("active_store_id")

                if current_locked_id != detected_store_id:
                    # Topic Shift! (Epic 110: Clean Slate)
                    # Nuke history, summary, and old metadata to prevent context bleeding
                    await memory.clear_session_data(identifier)
                    
                    # Update metadata with the new active store
                    await memory.update_metadata(identifier, {"active_store_id": detected_store_id})
                    print(f"DEBUG ORCHESTRATOR: High-Fidelity Isolation triggered. Switched active_store_id to {detected_store_id}. History wiped.")
        
        except Exception as te:
            print(f"WARNING: Topic shift detection failed: {te}")
            traceback.print_exc()

        # 3. Proceed with normal classification and routing
        classification = await self.classify_intent(user_message, history)
        intent = classification.get("intent", "CHAT")
        scope = classification.get("scope", "LOCAL")
        
        # 3.1 Deterministic Guardrail: Implicit Query Detection (Task 113.1 Hardening)
        # If the user mentions a store/contact AND action words like "cita", "visitando", "llegando", force QUERY
        visit_cues = ["cita", "reunión", "reunion", "visitando", "llegando", "yendo", "camino a", "enfrente de"]
        msg_lower = user_message.lower()
        if (detected_store_id or any(c.name.lower() in msg_lower for c in contacts)) and any(cue in msg_lower for cue in visit_cues):
            if intent != "QUERY":
                print(f"DEBUG ORCHESTRATOR: Implicit Query detected for '{user_message}'. Overriding intent to QUERY.")
                intent = "QUERY"

        # 4. Deterministic Guardrail: Programmatic Context Detection (Task 113.1 Hardening)
        # If we have an active lock, look for pronouns that imply "This store"
        if identifier:
            from app.core.memory import ChatMemory
            memory = ChatMemory()
            metadata_session = await memory.get_metadata(identifier)
            if metadata_session.get("active_store_id"):
                local_pronouns = ["ellos", "ellas", "ahí", "ahi", "esa", "ese", "estos", "estas", "este", "esta", "con ellos", "de ellos"]
                msg_lower = user_message.lower()
                if any(f" {p}" in f" {msg_lower} " for p in local_pronouns):
                    if scope == "GLOBAL":
                        print(f"DEBUG ORCHESTRATOR: Deterministic Guardrail triggered. Overriding scope to LOCAL due to pronoun detection in: '{user_message}'")
                        scope = "LOCAL"

        print(f"DEBUG ORCHESTRATOR: Intent identified as {intent} (Scope: {scope}) for message: '{user_message}'")

        if intent == "REPORT":
            # Session 2 Goal: Hand off to IngestionAgent via Celery
            from app.tasks.ingestion import process_b2b_ingestion
            process_b2b_ingestion.delay(business.id, user_message)
            return "¡Entendido! Estoy analizando tu reporte y actualizando la base de datos ahora mismo. Te avisaré cuando termine."
        
        elif intent == "QUERY":
            # Session 3 Goal: Hand off to GraphRAGAgent
            # Passing identifier (chat_id) and scope for Task 113.1 session awareness
            return await self.graphrag.generate_brief(user_message, business.id, history=history, chat_id=identifier, discovery_scope=scope)
            
        elif intent == "SCHEDULE":
            # Session 4 Goal: Use existing Scheduling tools
            return f"[ORCHESTRATOR] Routing to SCHEDULE pipeline. Reasoning: {classification.get('reasoning')}"
            
        else:
            # Fallback to standard chat response (Existing AIService logic)
            return f"[ORCHESTRATOR] Routing to CHAT pipeline. Reasoning: {classification.get('reasoning')}"
