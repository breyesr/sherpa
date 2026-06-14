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

    async def _generate_utility_response(self, store_name: str, dossier_data: Optional[str], user_message: str, history: list = None) -> str:
        """Generates a fast, context-aware response using the pre-loaded dossier."""
        try:
            template = prompt_env.get_template("utility_orchestrator.j2")
            
            history_str = ""
            if history:
                history_str = "\n".join([f"{m['role']}: {m['content']}" for m in history[-5:]])

            prompt = template.render(
                store_name=store_name,
                dossier=dossier_data,
                user_message=user_message,
                history=history_str
            )

            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
            model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o-mini")
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")

            response = await litellm.acompletion(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key,
                timeout=30.0
            )

            return response.choices[0].message.content
        except Exception as e:
            print(f"ERROR: Utility Orchestrator failed: {e}")
            traceback.print_exc()
            return "Entendido. He procesado tu mensaje pero tuve un problema generando la respuesta detallada."

    async def route_message(self, business: Any, client: Any, user_message: str, history: list = None, metadata: Optional[Dict] = None, identifier: str = None) -> str:
        """
        Main entry point for routing with Topic Sensitivity. 
        Detects shifts between stores/contacts to prevent "Summary Anchoring".
        """
        from app.services.entity_resolver import EntityResolver
        from app.models.trade import AccountIntelligence, Store

        # 1. Topic Shift Detection: Resolve Store/Contact from message
        try:
            resolver = EntityResolver(self.db)
            entity_result = await resolver.resolve_entities(business.id, user_message)
            detected_store_id = entity_result.get("store_id")
            
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

            # Proactive Context Injection (Task 115.2)
            dossier_data = None
            detected_store_name = "Ninguna detectada"
            if detected_store_id:
                # Fetch store name for the prompt
                res_store = await self.db.execute(select(Store).where(Store.id == detected_store_id))
                store_obj = res_store.scalars().first()
                if store_obj:
                    detected_store_name = store_obj.name

                res_intel = await self.db.execute(
                    select(AccountIntelligence).where(AccountIntelligence.store_id == detected_store_id)
                )
                intel = res_intel.scalars().first()
                if intel and intel.dossier_json:
                    dossier_data = intel.dossier_json.get("content")
                    print(f"DEBUG ORCHESTRATOR: Proactively loaded Account Intelligence Dossier for Store ID: {detected_store_id}")
                else:
                    # Async trigger to generate it in the background if it doesn't exist
                    # For now, it will just rely on the existing GraphRAG pipeline fallback
                    print(f"DEBUG ORCHESTRATOR: No pre-existing Dossier found for Store ID: {detected_store_id}")

        except Exception as te:
            print(f"WARNING: Topic shift detection failed: {te}")
            traceback.print_exc()
            detected_store_id = None
            dossier_data = None
            detected_store_name = "Ninguna detectada"

        # 3. Proceed with normal classification and routing
        classification = await self.classify_intent(user_message, history)
        intent = classification.get("intent", "CHAT")
        scope = classification.get("scope", "LOCAL")
        
        # 3.1 Deterministic Guardrail: Implicit Query Detection (Task 113.1 Hardening)
        # If the user mentions a store/contact AND action words like "cita", "visitando", "llegando", force QUERY
        visit_cues = ["cita", "reunión", "reunion", "visitando", "llegando", "yendo", "camino a", "enfrente de"]
        msg_lower = user_message.lower()
        if detected_store_id and any(cue in msg_lower for cue in visit_cues):
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

        if intent == "SCHEDULE":
            # Session 4 Goal: Use existing Scheduling tools
            return f"[ORCHESTRATOR] Routing to SCHEDULE pipeline. Reasoning: {classification.get('reasoning')}"

        if intent == "REPORT":
            # Session 2 Goal: Hand off to IngestionAgent via Celery
            from app.tasks.ingestion import process_b2b_ingestion
            process_b2b_ingestion.delay(business.id, user_message)
            # Do NOT return immediately. Let the Utility Orchestrator generate a contextual acknowledgment.
        
        if intent == "QUERY" and scope == "GLOBAL":
            # Session 3 Goal: Hand off to GraphRAGAgent ONLY for Global discovery
            return await self.graphrag.generate_brief(user_message, business.id, history=history, chat_id=identifier, discovery_scope=scope)

        # UTILITY-FIRST PIVOT (Task 115): 
        # For LOCAL Queries, Reports, and general Chat, we use the unified Utility prompt with the pre-fetched dossier.
        # If the dossier is missing but it's a QUERY, we fallback to GraphRAG.
        if intent == "QUERY" and scope == "LOCAL" and not dossier_data:
            print("DEBUG ORCHESTRATOR: No dossier found for LOCAL query. Falling back to GraphRAG pipeline.")
            return await self.graphrag.generate_brief(user_message, business.id, history=history, chat_id=identifier, discovery_scope=scope)

        return await self._generate_utility_response(detected_store_name, dossier_data, user_message, history)
